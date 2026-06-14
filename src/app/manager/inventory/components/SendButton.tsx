"use client";

import { Spinner } from "./Spinner";

// ── SendButton ────────────────────────────────

interface SendButtonProps {
  onClick: () => void;
  loading: boolean;
  done: boolean;
}

export function SendButton({ onClick, loading, done }: SendButtonProps) {
  if (done) {
    return (
      <span className="min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold text-[#28a745] bg-[#28a745]/10 border border-[#28a745]/30 flex items-center gap-1">
        Sent
      </span>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="min-h-[36px] px-3 py-1.5 bg-gradient-to-br from-[#28a745] to-[#1e7e34] text-white rounded-lg text-xs font-bold hover:from-[#34ce57] hover:to-[#28a745] transition disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
    >
      {loading ? <Spinner size="sm" /> : "SEND"}
    </button>
  );
}
