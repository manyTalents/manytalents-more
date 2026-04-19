// Force dynamic rendering — this page uses Supabase Realtime and cannot be statically prerendered
export const dynamic = 'force-dynamic'

export default function OptionsLayout({ children }: { children: React.ReactNode }) {
  return children
}
