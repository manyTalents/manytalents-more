"use client";

/**
 * PaymentPanel — web parity for InvoiceScreen.tsx (mobile).
 *
 * Renders a full payment workflow for an already-finalized Sales Invoice:
 *   1. Cash / Check  — record_payment via Frappe
 *   2. Keyed Card    — Stripe Elements (web, not PaymentSheet)
 *   3. Pay-link / QR — Stripe Checkout Session → copyable URL + QR code
 *   4. Send Receipt  — email and/or SMS
 *
 * Mirrors the cash-vs-card price split from InvoiceScreen (card_processing_pct).
 * Stripe is loaded lazily; Elements mounts only when "Card" tab is active.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import type { Stripe, StripeCardElement } from "@stripe/stripe-js";
import {
  recordPayment,
  getStripeConfig,
  createPaymentIntent,
  confirmCardPayment,
  createInvoicePaymentLink,
  generateReceiptToken,
  sendReceiptEmail,
  sendReceiptSms,
} from "@/lib/frappe";
import { getErrorMessage } from "@/lib/errors";

// ── Types ──────────────────────────────────────────────────────────────────────

interface InvoiceSummary {
  invoice_name: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  /** Subtotal (cash/check price). */
  amount: number;
  /** Card processing fee %, e.g. 2.7 */
  card_processing_pct: number;
}

interface Props {
  invoice: InvoiceSummary;
  onPaid: () => void;
}

type PayTab = "cash" | "check" | "card" | "link";
type PanelPhase = "select" | "processing" | "paid" | "receipt";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

function computeTotals(amount: number, cardPct: number) {
  const cashTotal = Math.round(amount * 100) / 100;
  const cardTotal = Math.round(amount * (1 + cardPct / 100) * 100) / 100;
  const cashSaving = Math.round((cardTotal - cashTotal) * 100) / 100;
  return { cashTotal, cardTotal, cashSaving };
}

// ── Card form (inner — must live inside <Elements>) ────────────────────────────

interface CardFormProps {
  invoiceName: string;
  cardTotal: number;
  onSuccess: (paidAmount: number) => void;
  onError: (msg: string) => void;
}

function CardForm({ invoiceName, cardTotal, onSuccess, onError }: CardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    const cardEl = elements.getElement(CardElement) as StripeCardElement | null;
    if (!cardEl) {
      onError("Card element not ready");
      return;
    }

    setProcessing(true);
    try {
      // Step 1 — create PaymentIntent on ERPNext backend
      const intent = await createPaymentIntent(invoiceName, cardTotal);

      // Step 2 — confirm card on Stripe client-side (card data never hits our server)
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        intent.client_secret,
        { payment_method: { card: cardEl } }
      );
      if (confirmError) {
        onError(confirmError.message ?? "Card declined");
        return;
      }
      if (!paymentIntent || paymentIntent.status !== "succeeded") {
        onError("Payment did not succeed — please try again");
        return;
      }

      // Step 3 — record the payment in ERPNext
      const result = await confirmCardPayment(invoiceName, intent.payment_intent_id);
      if (!result.success) {
        onError("Card charged but recording failed — contact the office");
        return;
      }

      onSuccess(cardTotal);
    } catch (e: unknown) {
      onError(getErrorMessage(e));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-navy border border-navy-border rounded-xl p-4">
        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">
          Card Details
        </label>
        <CardElement
          options={{
            style: {
              base: {
                color: "#e8e0d0",
                fontFamily: "ui-monospace, monospace",
                fontSize: "15px",
                "::placeholder": { color: "#6b7280" },
              },
              invalid: { color: "#f87171" },
            },
          }}
        />
      </div>
      <button
        type="submit"
        disabled={processing || !stripe}
        className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition disabled:opacity-50"
      >
        {processing ? "Processing..." : `Charge ${fmt(cardTotal)} by Card`}
      </button>
    </form>
  );
}

// ── Receipt sub-panel ──────────────────────────────────────────────────────────

interface ReceiptPanelProps {
  invoiceName: string;
  paidAmount: number;
  payMethod: string;
  initialEmail: string;
  initialPhone: string;
  onDone: () => void;
}

function ReceiptPanel({
  invoiceName,
  paidAmount,
  payMethod,
  initialEmail,
  initialPhone,
  onDone,
}: ReceiptPanelProps) {
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [emailSending, setEmailSending] = useState(false);
  const [smsSending, setSmsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [receiptError, setReceiptError] = useState("");

  // pre-generate token on mount so we have it ready (fire-and-forget; we don't
  // display the token URL in this panel — receipt_delivery does the delivery).
  const tokenFetched = useRef(false);
  useEffect(() => {
    if (tokenFetched.current) return;
    tokenFetched.current = true;
    generateReceiptToken(invoiceName).catch(() => {
      // non-fatal — email/SMS endpoints work independently
    });
  }, [invoiceName]);

  const handleSendEmail = async () => {
    if (!email.trim()) { setReceiptError("Enter a customer email"); return; }
    setReceiptError("");
    setEmailSending(true);
    try {
      const res = await sendReceiptEmail(invoiceName, email.trim());
      if (res.success) {
        setEmailSent(true);
      } else {
        setReceiptError(res.message || "Email failed");
      }
    } catch (e: unknown) {
      setReceiptError(getErrorMessage(e));
    } finally {
      setEmailSending(false);
    }
  };

  const handleSendSms = async () => {
    if (!phone.trim()) { setReceiptError("Enter a customer phone number"); return; }
    setReceiptError("");
    setSmsSending(true);
    try {
      const res = await sendReceiptSms(invoiceName, phone.trim());
      if (res.success) {
        setSmsSent(true);
      } else {
        setReceiptError(res.message || "SMS failed");
      }
    } catch (e: unknown) {
      setReceiptError(getErrorMessage(e));
    } finally {
      setSmsSending(false);
    }
  };

  const methodLabel =
    payMethod === "card_stripe"
      ? "Card"
      : payMethod === "check"
      ? "Check"
      : payMethod === "cash"
      ? "Cash"
      : payMethod;

  return (
    <div className="space-y-5">
      {/* Paid banner */}
      <div className="bg-emerald-900/40 border border-emerald-700/60 rounded-2xl px-6 py-8 text-center">
        <p className="text-4xl font-serif font-black text-emerald-300 tracking-widest mb-1">
          PAID
        </p>
        <p className="text-2xl font-bold text-cream">{fmt(paidAmount)}</p>
        <p className="text-sm text-neutral-400 mt-1">{methodLabel}</p>
      </div>

      {/* Email receipt */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider">
          Email Receipt
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="customer@email.com"
          className="w-full bg-navy border border-navy-border rounded-xl px-4 py-3 text-sm text-cream focus:outline-none focus:border-gold-dark transition"
        />
        <button
          onClick={handleSendEmail}
          disabled={emailSending || emailSent}
          className={`w-full py-3 rounded-xl font-bold text-sm transition ${
            emailSent
              ? "bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 cursor-default"
              : "bg-gold hover:bg-gold-dark text-navy disabled:opacity-50"
          }`}
        >
          {emailSending ? "Sending..." : emailSent ? "Email Sent" : "Email Receipt"}
        </button>
      </div>

      {/* SMS receipt */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider">
          Text Receipt
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+15551234567"
          className="w-full bg-navy border border-navy-border rounded-xl px-4 py-3 text-sm text-cream focus:outline-none focus:border-gold-dark transition"
        />
        <button
          onClick={handleSendSms}
          disabled={smsSending || smsSent}
          className={`w-full py-3 rounded-xl font-bold text-sm transition ${
            smsSent
              ? "bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 cursor-default"
              : "bg-navy-surface hover:bg-navy-card border border-navy-border text-cream disabled:opacity-50"
          }`}
        >
          {smsSending ? "Sending..." : smsSent ? "Text Sent" : "Text Receipt"}
        </button>
      </div>

      {receiptError && (
        <p className="text-red-400 text-sm">{receiptError}</p>
      )}

      <button
        onClick={onDone}
        className="w-full py-3 rounded-xl border border-neutral-700 text-neutral-400 hover:text-cream hover:border-neutral-500 text-sm font-medium transition"
      >
        Done
      </button>
    </div>
  );
}

// ── Pay-link / QR sub-panel ────────────────────────────────────────────────────

interface PayLinkPanelProps {
  invoiceName: string;
  cardTotal: number;
}

function PayLinkPanel({ invoiceName, cardTotal }: PayLinkPanelProps) {
  const [payUrl, setPayUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkError, setLinkError] = useState("");

  const generate = useCallback(async () => {
    setLoading(true);
    setLinkError("");
    try {
      const res = await createInvoicePaymentLink(invoiceName);
      setPayUrl(res.url);
    } catch (e: unknown) {
      setLinkError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [invoiceName]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(payUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the input text
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-400">
        Generate a Stripe-hosted link the customer can pay from their own device.
        Amount charged: <span className="text-cream font-medium">{fmt(cardTotal)}</span>
      </p>

      {!payUrl && (
        <button
          onClick={generate}
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Pay-Link"}
        </button>
      )}

      {linkError && (
        <p className="text-red-400 text-sm">{linkError}</p>
      )}

      {payUrl && (
        <div className="space-y-4">
          {/* QR code */}
          <div className="flex justify-center">
            <div className="bg-white p-3 rounded-xl">
              <QRCodeSVG value={payUrl} size={200} />
            </div>
          </div>

          {/* Copyable URL */}
          <div className="flex gap-2 items-center">
            <input
              readOnly
              value={payUrl}
              className="flex-1 bg-navy border border-navy-border rounded-xl px-3 py-2.5 text-xs text-cream/80 focus:outline-none font-mono"
            />
            <button
              onClick={copyLink}
              className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
                copied
                  ? "bg-emerald-900/60 text-emerald-300 border border-emerald-700/60"
                  : "bg-gold hover:bg-gold-dark text-navy"
              }`}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          <p className="text-xs text-neutral-500">
            Payment is confirmed asynchronously via Stripe webhook. The invoice
            status updates automatically once the customer pays.
          </p>

          <button
            onClick={generate}
            disabled={loading}
            className="text-xs text-neutral-500 hover:text-cream transition"
          >
            {loading ? "Regenerating..." : "Generate New Link"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main PaymentPanel ─────────────────────────────────────────────────────────

export default function PaymentPanel({ invoice, onPaid }: Props) {
  const { cashTotal, cardTotal, cashSaving } = computeTotals(
    invoice.amount,
    invoice.card_processing_pct
  );

  const [activeTab, setActiveTab] = useState<PayTab>("cash");
  const [phase, setPhase] = useState<PanelPhase>("select");
  const [processing, setProcessing] = useState(false);
  const [checkNumber, setCheckNumber] = useState("");
  const [panelError, setPanelError] = useState("");
  const [paidAmount, setPaidAmount] = useState(0);
  const [paidMethod, setPaidMethod] = useState("");

  // Stripe lazy-load — only when card tab is active
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const stripeLoaded = useRef(false);

  useEffect(() => {
    if (activeTab !== "card" || stripeLoaded.current) return;
    stripeLoaded.current = true;
    getStripeConfig()
      .then((cfg) => {
        if (cfg.configured && cfg.publishable_key) {
          setStripePromise(loadStripe(cfg.publishable_key));
        } else {
          setPanelError("Stripe is not configured on this site");
        }
      })
      .catch((e: unknown) => setPanelError(getErrorMessage(e)));
  }, [activeTab]);

  const handleCashCheck = async () => {
    const method = activeTab as "cash" | "check";
    if (method === "check" && !checkNumber.trim()) {
      setPanelError("Enter the check number");
      return;
    }
    setPanelError("");
    setProcessing(true);
    setPhase("processing");
    try {
      const amount = cashTotal;
      const res = await recordPayment(
        invoice.invoice_name,
        method,
        amount,
        method === "check" ? checkNumber.trim() : undefined
      );
      if (!res.success) {
        setPanelError("Payment recording failed — try again");
        setPhase("select");
        return;
      }
      setPaidAmount(amount);
      setPaidMethod(method);
      setPhase("paid");
    } catch (e: unknown) {
      setPanelError(getErrorMessage(e));
      setPhase("select");
    } finally {
      setProcessing(false);
    }
  };

  const handleCardSuccess = (amount: number) => {
    setPaidAmount(amount);
    setPaidMethod("card_stripe");
    setPhase("paid");
  };

  const handleCardError = (msg: string) => {
    setPanelError(msg);
  };

  // ── Render: receipt ──
  if (phase === "paid") {
    return (
      <ReceiptPanel
        invoiceName={invoice.invoice_name}
        paidAmount={paidAmount}
        payMethod={paidMethod}
        initialEmail={invoice.customer_email ?? ""}
        initialPhone={invoice.customer_phone ?? ""}
        onDone={onPaid}
      />
    );
  }

  // ── Render: select payment method ──
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">
          Collect Payment
        </p>
        <p className="text-sm text-neutral-400">
          {invoice.invoice_name} · {invoice.customer_name}
        </p>
      </div>

      {/* Totals row */}
      <div className="flex gap-4">
        <div className="flex-1 bg-emerald-900/20 border border-emerald-800/40 rounded-xl px-4 py-3 text-center">
          <p className="text-xs text-neutral-500 mb-0.5">Cash / Check</p>
          <p className="text-xl font-bold text-cream">{fmt(cashTotal)}</p>
          <p className="text-xs text-emerald-400">Save {fmt(cashSaving)}</p>
        </div>
        <div className="flex-1 bg-blue-900/20 border border-blue-800/40 rounded-xl px-4 py-3 text-center">
          <p className="text-xs text-neutral-500 mb-0.5">Card</p>
          <p className="text-xl font-bold text-cream">{fmt(cardTotal)}</p>
          <p className="text-xs text-neutral-500">+{invoice.card_processing_pct}% fee</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-navy rounded-xl p-1">
        {(["cash", "check", "card", "link"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setPanelError(""); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === tab
                ? "bg-navy-surface text-cream shadow-sm"
                : "text-neutral-500 hover:text-cream"
            }`}
          >
            {tab === "cash" && "Cash"}
            {tab === "check" && "Check"}
            {tab === "card" && "Card"}
            {tab === "link" && "Pay Link"}
          </button>
        ))}
      </div>

      {panelError && (
        <div className="bg-red-950/40 border border-red-900/60 rounded-lg px-4 py-3 text-sm text-red-300 flex items-start justify-between gap-2">
          <span>{panelError}</span>
          <button
            onClick={() => setPanelError("")}
            className="text-red-300 hover:text-red-100 text-lg leading-none flex-shrink-0"
            aria-label="Dismiss error"
          >
            &times;
          </button>
        </div>
      )}

      {/* Tab content */}
      {activeTab === "cash" && (
        <div className="space-y-4">
          <p className="text-sm text-neutral-400">
            Customer pays <span className="text-cream font-medium">{fmt(cashTotal)}</span> in cash.
            Saves <span className="text-emerald-400 font-medium">{fmt(cashSaving)}</span> vs card.
          </p>
          <button
            onClick={handleCashCheck}
            disabled={processing}
            className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm transition disabled:opacity-50"
          >
            {processing ? "Recording..." : `Record ${fmt(cashTotal)} Cash Payment`}
          </button>
        </div>
      )}

      {activeTab === "check" && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
              Check Number
            </label>
            <input
              type="text"
              value={checkNumber}
              onChange={(e) => setCheckNumber(e.target.value)}
              placeholder="e.g. 1042"
              className="w-full bg-navy border border-navy-border rounded-xl px-4 py-3 text-sm text-cream focus:outline-none focus:border-gold-dark transition"
            />
          </div>
          <p className="text-sm text-neutral-400">
            Check price: <span className="text-cream font-medium">{fmt(cashTotal)}</span>
          </p>
          <button
            onClick={handleCashCheck}
            disabled={processing}
            className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm transition disabled:opacity-50"
          >
            {processing ? "Recording..." : `Record ${fmt(cashTotal)} Check Payment`}
          </button>
        </div>
      )}

      {activeTab === "card" && (
        <div>
          {!stripePromise ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            </div>
          ) : (
            <Elements stripe={stripePromise}>
              <CardForm
                invoiceName={invoice.invoice_name}
                cardTotal={cardTotal}
                onSuccess={handleCardSuccess}
                onError={handleCardError}
              />
            </Elements>
          )}
        </div>
      )}

      {activeTab === "link" && (
        <PayLinkPanel
          invoiceName={invoice.invoice_name}
          cardTotal={cardTotal}
        />
      )}
    </div>
  );
}
