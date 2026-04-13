"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getAuth,
  getDefaultLaborRate,
  createJob,
  searchCustomers,
} from "@/lib/frappe";

export default function NewJobPage() {
  const router = useRouter();

  // Customer
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Location
  const [address, setAddress] = useState("");
  const [town, setTown] = useState("");
  const [occupantName, setOccupantName] = useState("");
  const [occupantPhone, setOccupantPhone] = useState("");

  // Job details
  const [description, setDescription] = useState("");
  const [jobType, setJobType] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [isEstimate, setIsEstimate] = useState(false);

  // Labor
  const [laborHours, setLaborHours] = useState("");
  const [laborRate, setLaborRate] = useState("");
  const [laborDescription, setLaborDescription] = useState("");
  const [defaultRate, setDefaultRate] = useState(150);

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
  }, [router]);

  const handleCustomerSearch = (value: string) => {
    setCustomerName(value);
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
        setShowSuggestions(results.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 300);
  };

  const selectCustomer = (cust: any) => {
    setCustomerName(cust.customer_name);
    setShowSuggestions(false);
    setSuggestions([]);
  };

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
        customer_phone: customerPhone.trim(),
        description: description.trim(),
        scheduled_date: scheduledDate || undefined,
        job_type: jobType.trim(),
        priority,
        is_estimate: isEstimate,
        occupant_name: occupantName.trim(),
        occupant_phone: occupantPhone.trim(),
        labor_hours: parseFloat(laborHours) || 0,
        labor_rate: parseFloat(laborRate) || 0,
        labor_description: laborDescription.trim(),
      });
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
      {/* Nav */}
      <nav className="border-b border-navy-border bg-navy-surface/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href="/manager/jobs"
            className="text-neutral-400 hover:text-gold-light transition"
          >
            ← All Jobs
          </Link>
          <div className="h-5 w-px bg-navy-border" />
          <div>
            <h1 className="font-serif text-lg font-bold">New Job</h1>
            <p className="text-xs text-neutral-500">Intake form</p>
          </div>
        </div>
      </nav>

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
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
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
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">
                Phone
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold-dark transition"
              />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
          <p className="text-xs uppercase tracking-wider text-neutral-400 mb-4">
            Location
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">
                Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St"
                className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold-dark transition"
              />
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
                Occupant Phone
              </label>
              <input
                type="tel"
                value={occupantPhone}
                onChange={(e) => setOccupantPhone(e.target.value)}
                placeholder="If different from customer"
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">
                  Trades / Type
                </label>
                <input
                  type="text"
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  placeholder="Plumbing, HVAC, etc."
                  className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold-dark transition"
                />
              </div>
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
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold-dark transition"
                >
                  <option value="Low">Low</option>
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isEstimate}
                onChange={(e) => setIsEstimate(e.target.checked)}
                className="w-4 h-4 accent-gold-dark"
              />
              <span className="text-sm text-neutral-300">This is an estimate</span>
            </label>
          </div>
        </div>

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
            Default rate: ${defaultRate}/hr — adjustable per job. Can also edit after creation.
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
