"use client";

import { useEffect, useState, useRef } from "react";
import {
  searchPricebook,
  type PricebookResult,
} from "@/lib/inventory-api";
import { Spinner } from "./Spinner";
import { fmt$$ } from "./utils";

// ── PricebookSearch ───────────────────────────

interface PricebookSearchProps {
  onSelect: (result: PricebookResult) => void;
  onCancel: () => void;
}

export function PricebookSearch({ onSelect, onCancel }: PricebookSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PricebookResult[]>([]);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const runSearch = (q: string) => {
    clearTimeout(timerRef.current);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchPricebook(q, 8);
        setResults(res || []);
      } catch (e: unknown) {
        console.warn("[PricebookSearch] runSearch error:", e);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 280);
  };

  const handleInput = (val: string) => {
    setQuery(val);
    runSearch(val);
  };

  return (
    <div className="mt-3 bg-[#080c18] border border-[#c9a84c]/40 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            placeholder="Search pricebook..."
            className="w-full bg-[#0d1120] border border-[#1a1f32] rounded-lg px-3 py-2 text-sm text-[#f0ebe0] placeholder-neutral-600 focus:outline-none focus:border-[#c9a84c] transition pr-8"
          />
          {searching && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <Spinner size="sm" />
            </div>
          )}
        </div>
        <button
          onClick={onCancel}
          className="text-xs text-neutral-500 hover:text-neutral-300 transition px-2 py-1.5 rounded-lg hover:bg-[#1a1f32]"
        >
          Cancel
        </button>
      </div>

      {results.length > 0 && (
        <div className="rounded-lg overflow-hidden border border-[#1a1f32]">
          {results.map((r, idx) => (
            <button
              key={r.name}
              onClick={() => onSelect(r)}
              className={`w-full text-left px-3 py-2.5 hover:bg-[#111627] transition ${
                idx < results.length - 1 ? "border-b border-[#1a1f32]" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-[#f0ebe0] font-medium leading-tight truncate">
                    {r.item_name}
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    {r.item_group} &middot; <span className="font-mono">{r.name}</span>
                  </p>
                </div>
                <span className="text-xs font-bold text-[#c9a84c] font-mono flex-shrink-0">
                  {fmt$$(r.standard_rate)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {!searching && query.trim() && results.length === 0 && (
        <p className="text-xs text-neutral-500 text-center py-2">No results for &quot;{query}&quot;</p>
      )}
    </div>
  );
}
