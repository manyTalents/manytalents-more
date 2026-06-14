"use client";

import type { Metadata } from "next";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getFeatureFlags } from "@/lib/features";

export const metadata: Metadata = {
  title: "ManyTalents Money",
  description: "Disciplined capital allocation tools — grow what's entrusted.",
};

export default function MoneyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!getFeatureFlags().money) {
      router.replace("/");
    }
  }, [router]);

  return <>{children}</>;
}
