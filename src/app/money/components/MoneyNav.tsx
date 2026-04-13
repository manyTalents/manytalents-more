"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearMoneyAuth } from "@/lib/money-auth";

const TABS = [
  { href: "/money/hub", label: "Hub" },
  { href: "/money/veoe", label: "VEOE" },
  { href: "/money/crypto", label: "Crypto" },
];

export default function MoneyNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    clearMoneyAuth();
    router.replace("/money");
  };

  return (
    <nav className="border-b border-navy-border bg-navy-surface/80 backdrop-blur-xl sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/money/hub" className="flex items-center gap-2">
            <h1 className="text-xl font-serif font-extrabold">
              Many<span className="text-gold-gradient">Talents</span> Money
            </h1>
          </Link>

          <div className="hidden sm:flex items-center gap-1">
            {TABS.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    active
                      ? "bg-gold/10 text-gold"
                      : "text-neutral-400 hover:text-gold-light hover:bg-navy-card"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="text-sm text-neutral-400 hover:text-red-400 transition"
        >
          Log Out
        </button>
      </div>

      {/* Mobile tabs */}
      <div className="sm:hidden flex border-t border-navy-border">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 text-center py-3 text-sm font-medium transition ${
                active
                  ? "text-gold border-b-2 border-gold"
                  : "text-neutral-500"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
