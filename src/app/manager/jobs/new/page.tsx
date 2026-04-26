"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getAuth,
  getDefaultLaborRate,
  createJob,
  searchCustomers,
  getCustomerHistory,
  searchAddresses,
  listTechs,
  assignTech,
  type TechListItem,
} from "@/lib/frappe";
import NavBar from "@/app/manager/components/NavBar";

// ── Phone formatting ──
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function handlePhoneChange(
  value: string,
  setter: (v: string) => void
) {
  setter(formatPhone(value));
}

// ── Trade checkboxes ──
const TRADES = ["Electrical", "HVAC", "Plumbing"] as const;

function NewJobInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerParam = searchParams.get("customer") || "";

  // Customer
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // tracks whether the typed name matched any existing customer
  const [customerIsNew, setCustomerIsNew] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Location
  const [address, setAddress] = useState("");
  const [town, setTown] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [customerAddresses, setCustomerAddresses] = useState<string[]>([]);
  const addressTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Location extras
  const [isVacant, setIsVacant] = useState(false);
  const [keycode, setKeycode] = useState("");
  const [keyAtOffice, setKeyAtOffice] = useState(false);

  // Occupant
  const [occupantName, setOccupantName] = useState("");
  const [occupantPhone, setOccupantPhone] = useState("");

  // Job details
  const [description, setDescription] = useState("");
  const [selectedTrades, setSelectedTrades] = useState<Set<string>>(new Set());
  const [scheduledDate, setScheduledDate] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [isEstimate, setIsEstimate] = useState(false);

  // Tech assignment
  const [techList, setTechList] = useState<TechListItem[]>([]);
  const [selectedTechs, setSelectedTechs] = useState<Set<string>>(new Set());

  // Labor
  const [laborHours, setLaborHours] = useState("");
  const [laborRate, setLaborRate] = useState("");
  const [laborDescription, setLaborDescription] = useState("");
  const [defaultRate, setDefaultRate] = useState(155);

  // State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getAuth()) {
      router.replace("/manager");
      return;
    }
    getDefaultLaborRate()
      .then((res) => {
        setDefaultRate(res.rate);
        setLaborRate(String(res.rate));
      })
      .catch(() => {});
    listTechs()
      .then((list) => setTechList(list || []))
      .catch(() => {});
    // Pre-populate customer from ?customer= query param
    if (customerParam) {
      searchCustomers(customerParam)
        .then((results) => {
          const match = (results || []).find(
            (c: any) => c.name === customerParam || c.customer_name === customerParam
          );
          if (match) {
            selectCustomer(match);
          } else if (results && results.length > 0) {
            selectCustomer(results[0]);
          } else {
            setCustomerName(customerParam);
          }
        })
        .catch(() => {
          setCustomerName(customerParam);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // ── Customer search ──
  const handleCustomerSearch = (value: string) => {
    setCustomerName(value);
    setHistoryLoaded(false);
    setCustomerIsNew(false);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      try {
        const results = await searchCustomers(value);
        setSuggestions(results || []);
        setShowSuggestions(true);
        setCustomerIsNew(results.length === 0);
      } catch {
        setSuggestions([]);
        setCustomerIsNew(false);
        setError("Customer search failed. Try again.");
      }
    }, 300);
  };

  const selectCustomer = async (cust: any) => {
    setCustomerName(cust.customer_name);
    setShowSuggestions(false);
    setSuggestions([]);
    setCustomerIsNew(false);
    // Autofill from history
    try {
      const history = await getCustomerHistory(cust.customer_name);
      if (history) {
        if (history.top_address && !address) setAddress(history.top_address);
        if (history.top_town && !town) setTown(history.top_town);
        if (history.phone && !customerPhone)
          setCustomerPhone(formatPhone(history.phone));
        if (history.addresses) setCustomerAddresses(history.addresses);
        setHistoryLoaded(true);
      }
    } catch {}
  };

  const confirmNewCustomer = () => {
    // User explicitly confirms they want to create a new customer record
    setShowSuggestions(false);
    setCustomerIsNew(false); // badge stays off once confirmed
  };

  // ── Address search ──
  const handleAddressSearch = (value: string) => {
    setAddress(value);
    if (addressTimeout.current) clearTimeout(addressTimeout.current);

    // Show customer-specific addresses first
    if (customerAddresses.length > 0 && value.length >= 1) {
      const matches = customerAddresses.filter((a) =>
        a.toLowerCase().includes(value.toLowerCase())
      );
      if (matches.length > 0) {
        setAddressSuggestions(matches.map((a) => ({ address: a, town: "" })));
        setShowAddressSuggestions(true);
        return;
      }
    }

    if (value.length < 3) {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      return;
    }
    addressTimeout.current = setTimeout(async () => {
      try {
        const results = await searchAddresses(value);
        setAddressSuggestions(results || []);
        setShowAddressSuggestions(results.length > 0);
      } catch {
        setAddressSuggestions([]);
      }
    }, 300);
  };

  const selectAddress = (addr: any) => {
    setAddress(addr.address);
    if (addr.town && !town) setTown(addr.town);
    setShowAddressSuggestions(false);
  };

  // ── Trade toggle ──
  const toggleTrade = (trade: string) => {
    const next = new Set(selectedTrades);
    if (next.has(trade)) next.delete(trade);
    else next.add(trade);
    setSelectedTrades(next);
  };

  // ── Tech toggle ──
  const toggleTech = (email: string) => {
    const next = new Set(selectedTechs);
    if (next.has(email)) next.delete(email);
    else next.add(email);
    setSelectedTechs(next);
  };

  // ── Submit ──
  const handleSubmit = async () => {
    setError("");
    if (!customerName.trim()) {
      setError("Customer name is required");
      return;
    }
    setSubmitting(true);
    try {
      const result = await createJob({
        customer_name: customerName.trim(),
        address: address.trim(),
        town: town.trim(),
        customer_phone: customerPhone.replace(/\D/g, ""),
        description: description.trim(),
        // Passing empty string keeps it as "unscheduled" intent;
        // backend currently defaults to now() if blank — tracked for backend fix.
        scheduled_date: scheduledDate || undefined,
        job_type: Array.from(selectedTrades).join(", "),
        priority,
        is_estimate: isEstimate,
        occupant_name: occupantName.trim(),
        occupant_phone: occupantPhone.replace(/\D/g, ""),
        is_vacant: isVacant,
        keycode: keycode.trim(),
        labor_hours: parseFloat(laborHours) || 0,
        labor_rate: parseFloat(laborRate) || 0,
        labor_description: laborDescription.trim(),
      });

      // Assign selected techs post-creation (backend assign_tech endpoint)
      if (selectedTechs.size > 0) {
        const assignments = Array.from(selectedTechs).map((email) =>
          assignTech(result.name, email, "Lead Tech").catch(() => {})
        );
        await Promise.all(assignments);
      }

      router.push(`/manager/jobs/${result.name}`);
    } catch (err: any) {
      setError(err.message || "Could not create job");
    } finally {
      setSubmitting(false);
    }
  };

  const laborTotal =
    (parseFloat(laborHours) || 0) * (parseFloat(laborRate) || 0);

  return (
    <div className="min-h-screen">
      <NavBar />

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Customer */}
        <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
          <p className="text-xs uppercase tracking-wider text-neutral-400 mb-4">
            Customer
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">
                Customer Name *
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => handleCustomerSearch(e.target.value)}
                onFocus={() =>
                  (suggestions.length > 0 || customerIsNew) &&
                  setShowSuggestions(true)
                }
                onBlur={() =>
                  setTimeout(() => setShowSuggestions(false), 200)
                }
                placeholder="John Smith"
                className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold-dark transition"
              />
              {showSuggestions && (
                <div className="absolute z-20 top-full mt-1 w-full bg-navy-surface border border-navy-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {suggestions.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onMouseDown={() => selectCustomer(c)}
                      className="w-full text-left px-4 py-2.5 text-sm text-cream hover:bg-navy transition border-b border-navy-border/50 last:border-0"
                    >
                      {c.customer_name}
                    </button>
                  ))}
                  {/* Explicit "Create New" option when no matches */}
                  {customerIsNew && customerName.trim().length >= 2 && (
                    <button
                      type="button"
                      onMouseDown={confirmNewCustomer}
                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-gold hover:bg-navy transition flex items-center gap-2"
                    >
                      <span className="text-base leading-none">+</span>
                      Create new customer &ldquo;{customerName.trim()}&rdquo;
                    </button>
                  )}
                </div>
              )}
              {historyLoaded && (
                <p className="text-xs text-emerald-500 mt-1">
                  Auto-filled from history
                </p>
              )}
              {/* Badge shown after search resolves with no match and dropdown closed */}
              {!showSuggestions && customerIsNew && customerName.trim().length >= 2 && (
                <p className="text-xs text-amber-400 mt-1">
                  New customer — will be created on submit
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">
                Phone
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) =>
                  handlePhoneChange(e.target.value, setCustomerPhone)
                }
                placeholder="(555) 123-4567"
                className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold-dark transition"
              />
              <p className="text-xs text-neutral-600 mt-1">Format: (xxx) xxx-xxxx</p>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
          <p className="text-xs uppercase tracking-wider text-neutral-400 mb-4">
            Location
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 relative">
              <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">
                Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => handleAddressSearch(e.target.value)}
                onFocus={() =>
                  addressSuggestions.length > 0 &&
                  setShowAddressSuggestions(true)
                }
                onBlur={() =>
                  setTimeout(() => setShowAddressSuggestions(false), 200)
                }
                placeholder="123 Main St"
                className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold-dark transition"
              />
              {showAddressSuggestions && (
                <div className="absolute z-20 top-full mt-1 w-full bg-navy-surface border border-navy-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {addressSuggestions.map((a, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={() => selectAddress(a)}
                      className="w-full text-left px-4 py-2.5 text-sm text-cream hover:bg-navy transition border-b border-navy-border/50 last:border-0"
                    >
                      {a.address}
                      {a.town && (
                        <span className="text-neutral-500 ml-2">
                          {a.town}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">
                Town / City
              </label>
              <input
                type="text"
                value={town}
                onChange={(e) => setTown(e.target.value)}
                placeholder="Baton Rouge"
                className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold-dark transition"
              />
            </div>
            {/* Occupant / Tenant — co-located in Location section */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">
                Occupant / Tenant Name
              </label>
              <input
                type="text"
                value={occupantName}
                onChange={(e) => setOccupantName(e.target.value)}
                placeholder="If different from customer"
                className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold-dark transition"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">
                Occupant / Tenant Phone
              </label>
              <input
                type="tel"
                value={occupantPhone}
                onChange={(e) =>
                  handlePhoneChange(e.target.value, setOccupantPhone)
                }
                placeholder="(555) 123-4567"
                className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold-dark transition"
              />
            </div>
          </div>

          {/* Vacant + Keycode row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isVacant}
                  onChange={(e) => setIsVacant(e.target.checked)}
                  className="w-4 h-4 accent-gold-dark"
                />
                <span className="text-sm text-neutral-300">Vacant property</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={keyAtOffice}
                  onChange={(e) => {
                    setKeyAtOffice(e.target.checked);
                    if (e.target.checked) setKeycode("Key at Office");
                    else setKeycode("");
                  }}
                  className="w-4 h-4 accent-gold-dark"
                />
                <span className="text-sm text-neutral-300">K@O (Key at Office)</span>
              </label>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">
                Keycode / Lockbox
              </label>
              <input
                type="text"
                value={keycode}
                onChange={(e) => {
                  setKeycode(e.target.value);
                  if (keyAtOffice && e.target.value !== "Key at Office") setKeyAtOffice(false);
                }}
                placeholder="e.g. 1234, lockbox on fence"
                className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold-dark transition"
              />
            </div>
          </div>
        </div>

        {/* Job Details */}
        <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
          <p className="text-xs uppercase tracking-wider text-neutral-400 mb-4">
            Job Details
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">
                Problem Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue or work to be done..."
                rows={3}
                className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream text-sm focus:outline-none focus:border-gold-dark transition resize-none"
              />
            </div>

            {/* Trade checkboxes */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-2">
                Service Type
              </label>
              <div className="flex gap-3">
                {TRADES.map((trade) => (
                  <label
                    key={trade}
                    className={`flex items-center gap-2.5 cursor-pointer select-none px-4 py-3 rounded-lg border transition ${
                      selectedTrades.has(trade)
                        ? "border-gold-dark bg-gold-dark/10"
                        : "border-navy-border bg-navy hover:border-neutral-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTrades.has(trade)}
                      onChange={() => toggleTrade(trade)}
                      className="w-4 h-4 accent-gold-dark"
                    />
                    <span className="text-sm font-medium text-cream">
                      {trade}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">
                  Scheduled Date
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold-dark transition"
                />
                <p className="text-xs text-neutral-600 mt-1">
                  Leave blank for unscheduled (white card)
                </p>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className={`w-full bg-navy border rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold-dark transition ${
                    priority === "Urgent"
                      ? "border-red-600 bg-red-950/30"
                      : "border-navy-border"
                  }`}
                >
                  <option value="Low">Low</option>
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
                {priority === "Urgent" && (
                  <p className="text-xs text-red-400 mt-1">
                    Job card will be highlighted red
                  </p>
                )}
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isEstimate}
                onChange={(e) => setIsEstimate(e.target.checked)}
                className="w-4 h-4 accent-gold-dark"
              />
              <span className="text-sm text-neutral-300">
                This is an estimate
              </span>
            </label>
          </div>
        </div>

        {/* Tech Assignment */}
        {techList.length > 0 && (
          <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
            <p className="text-xs uppercase tracking-wider text-neutral-400 mb-4">
              Assign Techs
            </p>
            <div className="flex flex-wrap gap-2">
              {techList.map((tech) => {
                const selected = selectedTechs.has(tech.email);
                return (
                  <button
                    key={tech.email}
                    type="button"
                    onClick={() => toggleTech(tech.email)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition select-none ${
                      selected
                        ? "bg-gold-dark/20 border-gold-dark text-gold"
                        : "bg-navy border-navy-border text-neutral-400 hover:border-neutral-500 hover:text-cream"
                    }`}
                  >
                    {tech.name}
                    {selected && (
                      <span className="ml-1.5 text-xs opacity-70">assigned</span>
                    )}
                  </button>
                );
              })}
            </div>
            {selectedTechs.size > 0 && (
              <p className="text-xs text-neutral-500 mt-3">
                {selectedTechs.size} tech{selectedTechs.size > 1 ? "s" : ""} will be assigned after the job is created
              </p>
            )}
          </div>
        )}

        {/* Labor */}
        <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
          <p className="text-xs uppercase tracking-wider text-neutral-400 mb-4">
            Labor / Service
          </p>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">
                Hours
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={laborHours}
                onChange={(e) => setLaborHours(e.target.value)}
                placeholder="0"
                className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold-dark transition"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">
                Rate ($/hr)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={laborRate}
                onChange={(e) => setLaborRate(e.target.value)}
                placeholder={String(defaultRate)}
                className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold-dark transition"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">
                Total
              </label>
              <div className="bg-navy border border-navy-border rounded-lg px-4 py-3 text-gold font-bold font-serif text-lg">
                ${laborTotal.toFixed(2)}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">
              Labor Description (shows on invoice)
            </label>
            <textarea
              value={laborDescription}
              onChange={(e) => setLaborDescription(e.target.value)}
              placeholder="e.g. Replaced water heater, installed new gas line..."
              rows={2}
              className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream text-sm focus:outline-none focus:border-gold-dark transition resize-none"
            />
          </div>
          <p className="text-xs text-neutral-600 mt-2">
            Default rate: ${defaultRate}/hr — adjustable per job
          </p>
        </div>

        {/* Submit */}
        {error && (
          <div className="bg-red-950/40 border border-red-900/60 rounded-lg px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-gradient-to-br from-gold to-gold-dark text-navy font-bold py-4 rounded-xl text-lg hover:from-gold-light hover:to-gold transition disabled:opacity-60"
        >
          {submitting ? "Creating Job..." : "Create Job"}
        </button>
      </main>
    </div>
  );
}

export default function NewJobPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
      }
    >
      <NewJobInner />
    </Suspense>
  );
}
