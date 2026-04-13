import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ManyTalents Money",
  description: "Disciplined capital allocation tools — grow what's entrusted.",
};

export default function MoneyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
