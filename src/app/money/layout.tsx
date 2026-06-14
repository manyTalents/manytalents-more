"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getFeatureFlags } from "@/lib/features";

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
