"use client";

import { useState } from "react";

export default function KingdomContactForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");

    try {
      const res = await fetch("/api/kingdom-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) throw new Error();
      setStatus("sent");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p className="k-success-msg">
        Thank you! We&apos;ll be in touch soon.
      </p>
    );
  }

  return (
    <form className="k-contact-form" onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        className="k-email-input"
        disabled={status === "sending"}
      />
      <button
        type="submit"
        className="k-submit-btn"
        disabled={status === "sending"}
      >
        {status === "sending" ? "Sending..." : "Reach Out"}
      </button>
      {status === "error" && (
        <p className="k-error-msg">Something went wrong. Please try again.</p>
      )}
    </form>
  );
}
