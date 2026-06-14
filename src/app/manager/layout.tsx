import ErrorBoundary from "@/app/manager/components/ErrorBoundary";

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
