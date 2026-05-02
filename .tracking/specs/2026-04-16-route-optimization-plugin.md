# RouteIQ — Route Optimization Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone route optimization web app (RouteIQ) with a VRP solver, dispatch board, map view, tech check-in/out, and future MTM/ERPNext integration tier.

**Architecture:** Next.js 14 frontend on Vercel + Supabase (auth, PostgreSQL with RLS for multi-tenancy) + Google OR-Tools VRP solver as a serverless Python Cloud Function. The MTM bridge is a separate module for future integration.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Mapbox GL JS, Supabase (Auth + PostgreSQL + RLS), Google OR-Tools (Python), Google Cloud Functions, Google Maps Geocoding/Distance Matrix API.

**Spec:** `docs/superpowers/specs/2026-04-16-route-optimization-plugin-design.md`
**Research:** `Owner's Inbox/Route-Optimization-Implementation-Research.md` and `Owner's Inbox/NextJS-Supabase-ShadCN-Implementation-Guide.md`

---

## File Structure

```
routeiq/
├── .env.local
├── .env.example
├── .gitignore
├── components.json
├── next.config.mjs
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── supabase/
│   └── migrations/
│       ├── 001_multi_tenant_schema.sql
│       ├── 002_rls_policies.sql
│       ├── 003_route_optimizer_tables.sql
│       └── 004_route_optimizer_rls.sql
├── solver/
│   ├── main.py
│   ├── requirements.txt
│   └── test_solver.py
└── src/
    ├── middleware.ts
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── page.tsx                          # Landing / redirect
    │   ├── auth/callback/route.ts
    │   ├── login/page.tsx
    │   ├── login/actions.ts
    │   ├── signup/page.tsx
    │   ├── (app)/                            # Auth-protected group
    │   │   ├── layout.tsx                    # Sidebar + nav
    │   │   ├── dashboard/page.tsx
    │   │   ├── dispatch/page.tsx             # Main dispatch board
    │   │   ├── techs/page.tsx                # Tech management
    │   │   └── jobs/page.tsx                 # Job management
    │   ├── route/[token]/page.tsx            # Public tech route view
    │   └── api/
    │       ├── solve/route.ts
    │       ├── jobs/route.ts
    │       ├── techs/route.ts
    │       └── share/route.ts
    ├── components/
    │   ├── ui/                               # shadcn (auto-generated)
    │   ├── app-sidebar.tsx
    │   ├── route-map.tsx
    │   ├── route-list.tsx
    │   ├── job-table.tsx
    │   ├── job-form.tsx
    │   ├── tech-table.tsx
    │   ├── tech-form.tsx
    │   ├── tech-availability.tsx
    │   ├── optimize-button.tsx
    │   └── check-in-out.tsx
    ├── hooks/
    │   ├── use-jobs.ts
    │   ├── use-techs.ts
    │   └── use-optimization.ts
    └── lib/
        ├── utils.ts                          # shadcn cn()
        ├── types.ts                          # Shared TypeScript types
        ├── constants.ts                      # Route colors, defaults
        └── supabase/
            ├── client.ts                     # Browser client
            ├── server.ts                     # Server client
            ├── admin.ts                      # Service role client
            └── middleware.ts                 # Session updater
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `routeiq/` (entire project scaffold)
- Create: `routeiq/.env.example`
- Create: `routeiq/.gitignore`

- [ ] **Step 1: Create the Next.js project**

```bash
cd C:/Users/chris/OneDrive/Documentos
npx create-next-app@latest routeiq --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd routeiq
```

- [ ] **Step 2: Install core dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr mapbox-gl react-map-gl
npm install -D @types/mapbox-gl
```

- [ ] **Step 3: Initialize shadcn/ui**

```bash
npx shadcn@latest init
# Choose: New York style, Slate base color, CSS variables: Yes
```

- [ ] **Step 4: Add shadcn components we'll need**

```bash
npx shadcn@latest add button card input label dialog table toast badge tabs separator dropdown-menu sheet switch select
```

- [ ] **Step 5: Create .env.example**

```bash
# .env.example
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...
GCF_SOLVER_URL=https://us-central1-your-project.cloudfunctions.net/optimize-routes
GOOGLE_MAPS_API_KEY=AIza...
```

- [ ] **Step 6: Create .env.local with actual values**

Copy `.env.example` to `.env.local` and fill in real values from Supabase dashboard, Mapbox account, and Google Cloud console.

- [ ] **Step 7: Initialize git and commit**

```bash
git init
git add .
git commit -m "feat: scaffold RouteIQ project with Next.js, Supabase, shadcn/ui, Mapbox"
```

---

## Task 2: Supabase Multi-Tenant Schema

**Files:**
- Create: `supabase/migrations/001_multi_tenant_schema.sql`
- Create: `supabase/migrations/002_rls_policies.sql`

- [ ] **Step 1: Write the multi-tenant schema migration**

Create `supabase/migrations/001_multi_tenant_schema.sql`:

```sql
-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: organizations (one row per business using RouteIQ)
-- ============================================================
CREATE TABLE public.organizations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  logo_url    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABLE: profiles (extends auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABLE: memberships (users <-> organizations with role)
-- ============================================================
CREATE TYPE public.member_role AS ENUM ('owner', 'admin', 'dispatcher', 'viewer');

CREATE TABLE public.memberships (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role            public.member_role NOT NULL DEFAULT 'dispatcher',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABLE: subscriptions
-- ============================================================
CREATE TYPE public.subscription_status AS ENUM (
  'trialing', 'active', 'past_due', 'canceled', 'unpaid'
);

CREATE TABLE public.subscriptions (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id        UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  status                 public.subscription_status NOT NULL DEFAULT 'trialing',
  plan_id                TEXT NOT NULL DEFAULT 'trial',
  tech_limit             INTEGER NOT NULL DEFAULT 3,
  mtm_integration        BOOLEAN NOT NULL DEFAULT false,
  trial_ends_at          TIMESTAMPTZ,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT UNIQUE,
  current_period_start   TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_memberships_user_id ON public.memberships(user_id);
CREATE INDEX idx_memberships_org_id ON public.memberships(organization_id);
CREATE INDEX idx_memberships_user_org ON public.memberships(user_id, organization_id);
CREATE INDEX idx_subscriptions_org_id ON public.subscriptions(organization_id);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID, uid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.memberships
    WHERE organization_id = org_id AND user_id = uid
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(org_id UUID, uid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.memberships
    WHERE organization_id = org_id AND user_id = uid AND role IN ('admin', 'owner')
  );
$$;

-- ============================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at_organizations
  BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_memberships
  BEFORE UPDATE ON public.memberships FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_subscriptions
  BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

- [ ] **Step 2: Write RLS policies**

Create `supabase/migrations/002_rls_policies.sql`:

```sql
-- ============================================================
-- RLS: profiles
-- ============================================================
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

-- ============================================================
-- RLS: organizations
-- ============================================================
CREATE POLICY "Members view their orgs" ON public.organizations FOR SELECT TO authenticated
  USING (id IN (SELECT organization_id FROM public.memberships WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "Anyone can create org" ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "Admins update org" ON public.organizations FOR UPDATE TO authenticated
  USING (public.is_org_admin(id, (SELECT auth.uid())))
  WITH CHECK (public.is_org_admin(id, (SELECT auth.uid())));

-- ============================================================
-- RLS: memberships
-- ============================================================
CREATE POLICY "Members view org members" ON public.memberships FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.memberships WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "Admins add members" ON public.memberships FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(organization_id, (SELECT auth.uid())));
CREATE POLICY "Admins update members" ON public.memberships FOR UPDATE TO authenticated
  USING (public.is_org_admin(organization_id, (SELECT auth.uid())) AND user_id != (SELECT auth.uid()))
  WITH CHECK (public.is_org_admin(organization_id, (SELECT auth.uid())) AND user_id != (SELECT auth.uid()));

-- ============================================================
-- RLS: subscriptions
-- ============================================================
CREATE POLICY "Members view subscription" ON public.subscriptions FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, (SELECT auth.uid())));
```

- [ ] **Step 3: Apply migrations to Supabase**

Run in Supabase SQL Editor or via CLI:
```bash
supabase db push
```
Expected: Tables created, RLS enabled, policies applied.

- [ ] **Step 4: Commit**

```bash
git add supabase/
git commit -m "feat: add multi-tenant schema with organizations, profiles, memberships, subscriptions"
```

---

## Task 3: Auth System

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/admin.ts`
- Create: `src/lib/supabase/middleware.ts`
- Create: `src/middleware.ts`
- Create: `src/app/login/page.tsx`
- Create: `src/app/login/actions.ts`
- Create: `src/app/signup/page.tsx`
- Create: `src/app/auth/callback/route.ts`

- [ ] **Step 1: Create Supabase browser client**

Create `src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Create Supabase server client**

Create `src/lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component — middleware handles token refresh
          }
        },
      },
    }
  )
}
```

- [ ] **Step 3: Create Supabase admin client (service role)**

Create `src/lib/supabase/admin.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

- [ ] **Step 4: Create middleware session updater**

Create `src/lib/supabase/middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const protectedPaths = ['/dashboard', '/dispatch', '/techs', '/jobs', '/api/solve', '/api/jobs', '/api/techs']
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path))
  const authPaths = ['/login', '/signup']
  const isAuthPage = authPaths.some((path) => pathname.startsWith(path))

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (isAuthPage && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

- [ ] **Step 5: Create root middleware**

Create `src/middleware.ts`:

```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 6: Create login actions (server actions)**

Create `src/app/login/actions.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    redirect('/login?message=' + encodeURIComponent(error.message))
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const companyName = formData.get('company_name') as string

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: formData.get('full_name') as string } },
  })

  if (error) {
    redirect('/signup?message=' + encodeURIComponent(error.message))
  }

  // Create organization and membership for new user
  if (data.user) {
    const admin = createAdminClient()
    const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    const { data: org } = await admin.from('organizations').insert({
      name: companyName,
      slug: slug + '-' + Date.now().toString(36),
    }).select('id').single()

    if (org) {
      await admin.from('memberships').insert({
        user_id: data.user.id,
        organization_id: org.id,
        role: 'owner',
      })

      await admin.from('subscriptions').insert({
        organization_id: org.id,
        status: 'trialing',
        plan_id: 'trial',
        tech_limit: 10,
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
    }
  }

  revalidatePath('/', 'layout')
  redirect('/login?message=' + encodeURIComponent('Check your email to confirm your account.'))
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
```

- [ ] **Step 7: Create login page**

Create `src/app/login/page.tsx`:

```tsx
import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">RouteIQ</CardTitle>
          <CardDescription>Sign in to optimize your routes</CardDescription>
        </CardHeader>
        <CardContent>
          {params?.message && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {params.message}
            </div>
          )}
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="you@company.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={6} />
            </div>
            <Button formAction={login} className="w-full">Sign In</Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            No account? <Link href="/signup" className="text-primary hover:underline">Sign up free</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 8: Create signup page**

Create `src/app/signup/page.tsx`:

```tsx
import { signup } from '../login/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Start optimizing routes in minutes</CardDescription>
        </CardHeader>
        <CardContent>
          {params?.message && (
            <div className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-700">
              {params.message}
            </div>
          )}
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Your Name</Label>
              <Input id="full_name" name="full_name" required placeholder="John Smith" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input id="company_name" name="company_name" required placeholder="Smith Plumbing" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="you@company.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={6} />
            </div>
            <Button formAction={signup} className="w-full">Create Account</Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account? <Link href="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 9: Create auth callback route**

Create `src/app/auth/callback/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?message=${encodeURIComponent('Authentication failed.')}`)
}
```

- [ ] **Step 10: Verify auth flow works**

```bash
npm run dev
```

Open `http://localhost:3000/signup`, create an account, verify redirect to login, then sign in and verify redirect to `/dashboard` (will 404 — that's expected, we build it next).

- [ ] **Step 11: Commit**

```bash
git add src/
git commit -m "feat: add Supabase auth with login, signup, middleware, org auto-creation"
```

---

## Task 4: Route Optimizer Database Tables

**Files:**
- Create: `supabase/migrations/003_route_optimizer_tables.sql`
- Create: `supabase/migrations/004_route_optimizer_rls.sql`

- [ ] **Step 1: Write route optimizer tables**

Create `supabase/migrations/003_route_optimizer_tables.sql`:

```sql
-- ============================================================
-- TABLE: technicians
-- ============================================================
CREATE TABLE public.technicians (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  email             TEXT,
  phone             TEXT,
  home_address      TEXT,
  home_lat          DOUBLE PRECISION,
  home_lng          DOUBLE PRECISION,
  default_start     TIME NOT NULL DEFAULT '07:00',
  default_quit      TIME NOT NULL DEFAULT '17:00',
  skills            TEXT[] DEFAULT '{}',
  max_jobs_per_day  INTEGER NOT NULL DEFAULT 8,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_technicians_org ON public.technicians(organization_id);

CREATE TRIGGER set_updated_at_technicians
  BEFORE UPDATE ON public.technicians FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- TABLE: tech_availability (per-day overrides)
-- ============================================================
CREATE TABLE public.tech_availability (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  technician_id   UUID NOT NULL REFERENCES public.technicians(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  is_working      BOOLEAN NOT NULL DEFAULT true,
  quit_time       TIME,                                    -- override for this day
  unavailable     JSONB DEFAULT '[]',                      -- [{"start":"12:00","end":"13:00","reason":"lunch"}]
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(technician_id, date)
);

ALTER TABLE public.tech_availability ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_tech_avail_org ON public.tech_availability(organization_id);
CREATE INDEX idx_tech_avail_tech_date ON public.tech_availability(technician_id, date);

CREATE TRIGGER set_updated_at_tech_availability
  BEFORE UPDATE ON public.tech_availability FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- TABLE: jobs
-- ============================================================
CREATE TYPE public.job_status AS ENUM (
  'pending', 'assigned', 'in_progress', 'completed', 'cancelled'
);

CREATE TABLE public.jobs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_number        TEXT,
  customer_name     TEXT NOT NULL,
  address           TEXT NOT NULL,
  lat               DOUBLE PRECISION,
  lng               DOUBLE PRECISION,
  scheduled_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  time_window_start TIME DEFAULT '06:00',
  time_window_end   TIME DEFAULT '20:00',
  service_minutes   INTEGER NOT NULL DEFAULT 60,
  required_skills   TEXT[] DEFAULT '{}',
  priority          INTEGER NOT NULL DEFAULT 5,            -- 1=urgent, 10=low
  status            public.job_status NOT NULL DEFAULT 'pending',
  pinned_tech_id    UUID REFERENCES public.technicians(id),-- manual assignment
  notes             TEXT,
  source            TEXT DEFAULT 'manual',                 -- manual, csv, mtm_sync
  erpnext_ref       TEXT,                                  -- for MTM integration
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_jobs_org ON public.jobs(organization_id);
CREATE INDEX idx_jobs_org_date ON public.jobs(organization_id, scheduled_date);
CREATE INDEX idx_jobs_status ON public.jobs(status);

CREATE TRIGGER set_updated_at_jobs
  BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- TABLE: route_plans (each optimization run)
-- ============================================================
CREATE TABLE public.route_plans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_date       DATE NOT NULL,
  total_time_min  INTEGER,
  total_distance  DOUBLE PRECISION,
  solver_status   TEXT,                                    -- solved, infeasible
  parameters      JSONB DEFAULT '{}',                     -- solver config used
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.route_plans ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_route_plans_org ON public.route_plans(organization_id);
CREATE INDEX idx_route_plans_org_date ON public.route_plans(organization_id, plan_date);

-- ============================================================
-- TABLE: route_assignments (per-tech route in a plan)
-- ============================================================
CREATE TABLE public.route_assignments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_plan_id   UUID NOT NULL REFERENCES public.route_plans(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  technician_id   UUID NOT NULL REFERENCES public.technicians(id),
  stop_order      JSONB NOT NULL DEFAULT '[]',             -- [{job_id, order, arrival_time, drive_min}]
  total_drive_min INTEGER,
  total_jobs      INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.route_assignments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_route_assign_org ON public.route_assignments(organization_id);
CREATE INDEX idx_route_assign_plan ON public.route_assignments(route_plan_id);

-- ============================================================
-- TABLE: route_shares (public tech route links)
-- ============================================================
CREATE TABLE public.route_shares (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  route_plan_id     UUID NOT NULL REFERENCES public.route_plans(id) ON DELETE CASCADE,
  technician_id     UUID NOT NULL REFERENCES public.technicians(id),
  token             TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_route_shares_token ON public.route_shares(token);

-- ============================================================
-- TABLE: check_ins (tech check-in/out at jobs)
-- ============================================================
CREATE TABLE public.check_ins (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_id          UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  technician_id   UUID NOT NULL REFERENCES public.technicians(id),
  checked_in_at   TIMESTAMPTZ,
  checked_out_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_check_ins_org ON public.check_ins(organization_id);
CREATE INDEX idx_check_ins_job ON public.check_ins(job_id);

-- ============================================================
-- TABLE: geocode_cache
-- ============================================================
CREATE TABLE public.geocode_cache (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  address     TEXT NOT NULL UNIQUE,
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_geocode_address ON public.geocode_cache(address);
```

- [ ] **Step 2: Write RLS policies for optimizer tables**

Create `supabase/migrations/004_route_optimizer_rls.sql`:

```sql
-- Helper: get user's org_id from memberships
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.memberships
  WHERE user_id = (SELECT auth.uid()) LIMIT 1;
$$;

-- Macro: apply standard tenant RLS to a table
CREATE OR REPLACE FUNCTION admin_apply_rls(tbl TEXT) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('CREATE POLICY "tenant_select_%s" ON public.%I FOR SELECT TO authenticated USING (organization_id = public.get_user_org_id())', tbl, tbl);
  EXECUTE format('CREATE POLICY "tenant_insert_%s" ON public.%I FOR INSERT TO authenticated WITH CHECK (organization_id = public.get_user_org_id())', tbl, tbl);
  EXECUTE format('CREATE POLICY "tenant_update_%s" ON public.%I FOR UPDATE TO authenticated USING (organization_id = public.get_user_org_id()) WITH CHECK (organization_id = public.get_user_org_id())', tbl, tbl);
  EXECUTE format('CREATE POLICY "tenant_delete_%s" ON public.%I FOR DELETE TO authenticated USING (organization_id = public.get_user_org_id())', tbl, tbl);
END;
$$;

SELECT admin_apply_rls('technicians');
SELECT admin_apply_rls('tech_availability');
SELECT admin_apply_rls('jobs');
SELECT admin_apply_rls('route_plans');
SELECT admin_apply_rls('route_assignments');
SELECT admin_apply_rls('check_ins');

-- route_shares: public read via token (no auth needed)
CREATE POLICY "Anyone can read by token" ON public.route_shares FOR SELECT
  USING (true);
CREATE POLICY "Org members manage shares" ON public.route_shares FOR ALL TO authenticated
  USING (organization_id = public.get_user_org_id())
  WITH CHECK (organization_id = public.get_user_org_id());

-- geocode_cache: shared across all orgs (no tenant isolation)
-- Read by anyone, write by authenticated
CREATE POLICY "Anyone reads geocache" ON public.geocode_cache FOR SELECT USING (true);
CREATE POLICY "Auth writes geocache" ON public.geocode_cache FOR INSERT TO authenticated WITH CHECK (true);
```

- [ ] **Step 3: Apply migrations**

```bash
supabase db push
```

- [ ] **Step 4: Commit**

```bash
git add supabase/
git commit -m "feat: add technicians, jobs, route_plans, check_ins, geocode_cache tables with RLS"
```

---

## Task 5: Shared Types & Constants

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/constants.ts`

- [ ] **Step 1: Create shared TypeScript types**

Create `src/lib/types.ts`:

```typescript
export interface Organization {
  id: string
  name: string
  slug: string
}

export interface Technician {
  id: string
  organization_id: string
  name: string
  email?: string
  phone?: string
  home_address?: string
  home_lat?: number
  home_lng?: number
  default_start: string
  default_quit: string
  skills: string[]
  max_jobs_per_day: number
  is_active: boolean
}

export interface TechAvailability {
  id: string
  technician_id: string
  date: string
  is_working: boolean
  quit_time?: string
  unavailable: { start: string; end: string; reason?: string }[]
}

export interface Job {
  id: string
  organization_id: string
  job_number?: string
  customer_name: string
  address: string
  lat?: number
  lng?: number
  scheduled_date: string
  time_window_start: string
  time_window_end: string
  service_minutes: number
  required_skills: string[]
  priority: number
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  pinned_tech_id?: string
  notes?: string
  source: string
}

export interface RoutePlan {
  id: string
  organization_id: string
  plan_date: string
  total_time_min?: number
  solver_status?: string
  created_at: string
}

export interface RouteAssignment {
  id: string
  route_plan_id: string
  technician_id: string
  stop_order: RouteStop[]
  total_drive_min?: number
  total_jobs?: number
}

export interface RouteStop {
  job_id: string
  order: number
  name: string
  address: string
  lat: number
  lng: number
  arrival_time: string
  arrival_min: number
  drive_min: number
  service_min: number
}

export interface SolverInput {
  depot: { lat: number; lng: number; name: string }
  jobs: {
    job_id: string
    name: string
    lat: number
    lng: number
    earliest: string
    latest: string
    service_minutes: number
    pinned_tech_index?: number
  }[]
  techs: {
    tech_id: string
    name: string
    shift_start: string
    shift_end: string
    max_jobs: number
    unavailable?: { start: string; end: string }[]
  }[]
  use_google_maps?: boolean
}

export interface SolverResult {
  status: 'solved' | 'infeasible'
  total_time_min: number
  routes: SolverRoute[]
  unassigned: { job_id: string; name: string }[]
}

export interface SolverRoute {
  vehicle_id: number
  stops: {
    location_index: number
    job_id?: string
    name: string
    lat: number
    lng: number
    arrival_min: number
    arrival_time: string
  }[]
  route_duration_min: number
}

export interface CheckIn {
  id: string
  job_id: string
  technician_id: string
  checked_in_at?: string
  checked_out_at?: string
}
```

- [ ] **Step 2: Create constants**

Create `src/lib/constants.ts`:

```typescript
export const ROUTE_COLORS = [
  '#2563EB', // blue
  '#DC2626', // red
  '#16A34A', // green
  '#D97706', // amber
  '#7C3AED', // violet
  '#0891B2', // cyan
  '#BE185D', // pink
  '#65A30D', // lime
  '#EA580C', // orange
  '#4F46E5', // indigo
] as const

export const DEFAULT_CENTER: [number, number] = [-92.6379, 32.5234] // Ruston, LA

export const JOB_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const PRIORITY_LABELS: Record<number, string> = {
  1: 'Urgent',
  3: 'High',
  5: 'Normal',
  7: 'Low',
  10: 'Whenever',
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts src/lib/constants.ts
git commit -m "feat: add shared TypeScript types and constants"
```

---

## Task 6: Python VRP Solver (Google Cloud Function)

**Files:**
- Create: `solver/main.py`
- Create: `solver/requirements.txt`
- Create: `solver/test_solver.py`

- [ ] **Step 1: Create requirements.txt**

Create `solver/requirements.txt`:

```
functions-framework==3.*
ortools==9.15.6755
googlemaps==4.10.0
```

- [ ] **Step 2: Create the solver Cloud Function**

Create `solver/main.py`:

```python
"""
Cloud Function: VRPTW Route Optimizer
Solves Vehicle Routing Problem with Time Windows using Google OR-Tools.
"""

import functions_framework
import googlemaps
import json
import math
import os
from ortools.constraint_solver import routing_enums_pb2, pywrapcp


def haversine_minutes(lat1, lng1, lat2, lng2):
    R = 3958.8
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (math.sin(d_lat / 2) ** 2
         + math.cos(math.radians(lat1))
         * math.cos(math.radians(lat2))
         * math.sin(d_lng / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    miles = R * c
    return max(1, int(round(miles / 30 * 60)))


def build_time_matrix_google(locations, api_key):
    gmaps = googlemaps.Client(key=api_key)
    n = len(locations)
    matrix = [[0] * n for _ in range(n)]
    CHUNK = 10
    coords = [(loc["lat"], loc["lng"]) for loc in locations]

    for i_start in range(0, n, CHUNK):
        i_end = min(i_start + CHUNK, n)
        for j_start in range(0, n, CHUNK):
            j_end = min(j_start + CHUNK, n)
            result = gmaps.distance_matrix(
                origins=coords[i_start:i_end],
                destinations=coords[j_start:j_end],
                mode="driving",
                units="imperial",
            )
            for i, row in enumerate(result["rows"]):
                for j, el in enumerate(row["elements"]):
                    if el["status"] == "OK":
                        seconds = el.get("duration_in_traffic", el["duration"])["value"]
                        matrix[i_start + i][j_start + j] = max(1, seconds // 60)
                    else:
                        matrix[i_start + i][j_start + j] = haversine_minutes(
                            coords[i_start + i][0], coords[i_start + i][1],
                            coords[j_start + j][0], coords[j_start + j][1],
                        )
    return matrix


def build_time_matrix_haversine(locations):
    n = len(locations)
    matrix = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i != j:
                matrix[i][j] = haversine_minutes(
                    locations[i]["lat"], locations[i]["lng"],
                    locations[j]["lat"], locations[j]["lng"],
                )
    return matrix


def time_to_minutes(time_str):
    parts = time_str.split(":")
    return int(parts[0]) * 60 + int(parts[1])


def minutes_to_time(minutes):
    h = minutes // 60
    m = minutes % 60
    period = "AM" if h < 12 else "PM"
    h12 = h % 12 or 12
    return f"{h12}:{m:02d} {period}"


def solve_vrptw(data):
    n = len(data["time_matrix"])
    num_vehicles = data["num_vehicles"]
    depot = data["depot"]

    manager = pywrapcp.RoutingIndexManager(n, num_vehicles, depot)
    routing = pywrapcp.RoutingModel(manager)

    def time_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return data["time_matrix"][from_node][to_node] + data["service_times"][from_node]

    transit_cb = routing.RegisterTransitCallback(time_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_cb)

    routing.AddDimension(transit_cb, 120, 720, False, "Time")
    time_dim = routing.GetDimensionOrDie("Time")

    for loc_idx, (tw_start, tw_end) in enumerate(data["time_windows"]):
        if loc_idx == depot:
            continue
        index = manager.NodeToIndex(loc_idx)
        time_dim.CumulVar(index).SetRange(tw_start, tw_end)

    for v in range(num_vehicles):
        if "vehicle_windows" in data and v < len(data["vehicle_windows"]):
            vs, ve = data["vehicle_windows"][v]
        else:
            vs, ve = data["time_windows"][depot]
        time_dim.CumulVar(routing.Start(v)).SetRange(vs, ve)
        time_dim.CumulVar(routing.End(v)).SetRange(vs, ve)
        routing.AddVariableMinimizedByFinalizer(time_dim.CumulVar(routing.Start(v)))
        routing.AddVariableMinimizedByFinalizer(time_dim.CumulVar(routing.End(v)))

    if "demands" in data and "capacity" in data:
        def demand_cb(from_index):
            return data["demands"][manager.IndexToNode(from_index)]
        demand_idx = routing.RegisterUnaryTransitCallback(demand_cb)
        routing.AddDimensionWithVehicleCapacity(demand_idx, 0, data["capacity"], True, "Capacity")

    # Handle pinned assignments
    if "pinned" in data:
        for job_loc_idx, vehicle_idx in data["pinned"]:
            index = manager.NodeToIndex(job_loc_idx)
            routing.SetAllowedVehiclesForIndex([vehicle_idx], index)

    params = pywrapcp.DefaultRoutingSearchParameters()
    params.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    params.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    params.time_limit.FromSeconds(30)

    solution = routing.SolveWithParameters(params)
    if not solution:
        return None

    routes = []
    total_time = 0
    for v in range(num_vehicles):
        stops = []
        index = routing.Start(v)
        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            arrival = solution.Min(time_dim.CumulVar(index))
            loc = data["locations"][node] if node < len(data["locations"]) else {}
            stops.append({
                "location_index": node,
                "job_id": loc.get("job_id"),
                "name": loc.get("name", f"Location {node}"),
                "lat": loc.get("lat"),
                "lng": loc.get("lng"),
                "arrival_min": arrival,
                "arrival_time": minutes_to_time(arrival),
            })
            index = solution.Value(routing.NextVar(index))

        node = manager.IndexToNode(index)
        arrival = solution.Min(time_dim.CumulVar(index))
        stops.append({
            "location_index": node,
            "name": "Return to base",
            "arrival_min": arrival,
            "arrival_time": minutes_to_time(arrival),
        })
        route_time = arrival
        total_time += route_time

        if len(stops) > 2:
            routes.append({
                "vehicle_id": v,
                "stops": stops,
                "route_duration_min": route_time,
            })

    dropped = []
    for node in range(routing.Size()):
        if routing.IsStart(node) or routing.IsEnd(node):
            continue
        if solution.Value(routing.NextVar(node)) == node:
            loc_idx = manager.IndexToNode(node)
            loc = data["locations"][loc_idx] if loc_idx < len(data["locations"]) else {}
            dropped.append({"location_index": loc_idx, "job_id": loc.get("job_id"), "name": loc.get("name")})

    return {"status": "solved", "total_time_min": total_time, "routes": routes, "unassigned": dropped}


@functions_framework.http
def optimize_routes(request):
    if request.method == "OPTIONS":
        return ("", 204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "3600",
        })

    headers = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}

    try:
        body = request.get_json(silent=True)
        if not body:
            return (json.dumps({"error": "Missing JSON body"}), 400, headers)

        depot = body["depot"]
        jobs = body["jobs"]
        techs = body["techs"]

        locations = [{"lat": depot["lat"], "lng": depot["lng"], "name": depot.get("name", "Depot"), "job_id": None}]
        for job in jobs:
            locations.append({"lat": job["lat"], "lng": job["lng"], "name": job.get("name", ""), "job_id": job.get("job_id")})

        api_key = body.get("google_maps_api_key") or os.environ.get("GOOGLE_MAPS_API_KEY")
        if body.get("use_google_maps") and api_key:
            time_matrix = build_time_matrix_google(locations, api_key)
        else:
            time_matrix = build_time_matrix_haversine(locations)

        time_windows = [(time_to_minutes(techs[0].get("shift_start", "06:00")), time_to_minutes(techs[0].get("shift_end", "20:00")))]
        for job in jobs:
            time_windows.append((time_to_minutes(job.get("earliest", "06:00")), time_to_minutes(job.get("latest", "20:00"))))

        service_times = [0] + [job.get("service_minutes", 60) for job in jobs]

        vehicle_windows = []
        capacity = []
        for tech in techs:
            vs = time_to_minutes(tech.get("shift_start", "07:00"))
            ve = time_to_minutes(tech.get("shift_end", "17:00"))
            # Handle unavailable blocks by narrowing windows (simplified)
            vehicle_windows.append((vs, ve))
            capacity.append(tech.get("max_jobs", 8))

        demands = [0] + [1] * len(jobs)

        # Handle pinned assignments
        pinned = []
        for i, job in enumerate(jobs):
            if job.get("pinned_tech_index") is not None:
                pinned.append((i + 1, job["pinned_tech_index"]))  # +1 because depot is 0

        data = {
            "time_matrix": time_matrix,
            "time_windows": time_windows,
            "service_times": service_times,
            "num_vehicles": len(techs),
            "depot": 0,
            "capacity": capacity,
            "demands": demands,
            "vehicle_windows": vehicle_windows,
            "locations": locations,
            "pinned": pinned if pinned else None,
        }
        if not pinned:
            del data["pinned"]

        result = solve_vrptw(data)
        if result is None:
            return (json.dumps({"status": "infeasible", "error": "No solution found. Try relaxing constraints."}), 200, headers)

        return (json.dumps(result, indent=2), 200, headers)

    except Exception as e:
        return (json.dumps({"error": str(e)}), 500, headers)
```

- [ ] **Step 3: Create test file**

Create `solver/test_solver.py`:

```python
"""Quick local test of the solver without Cloud Functions framework."""
import json
from main import solve_vrptw, build_time_matrix_haversine, time_to_minutes

def test_basic_vrptw():
    # 1 depot + 4 jobs, 2 techs
    locations = [
        {"lat": 32.5234, "lng": -92.6379, "name": "Office", "job_id": None},
        {"lat": 32.5300, "lng": -92.6500, "name": "Job A", "job_id": "A"},
        {"lat": 32.5400, "lng": -92.6200, "name": "Job B", "job_id": "B"},
        {"lat": 32.5100, "lng": -92.6600, "name": "Job C", "job_id": "C"},
        {"lat": 32.5500, "lng": -92.6100, "name": "Job D", "job_id": "D"},
    ]

    time_matrix = build_time_matrix_haversine(locations)
    time_windows = [
        (time_to_minutes("07:00"), time_to_minutes("17:00")),  # depot
        (time_to_minutes("08:00"), time_to_minutes("12:00")),  # Job A
        (time_to_minutes("09:00"), time_to_minutes("14:00")),  # Job B
        (time_to_minutes("08:00"), time_to_minutes("16:00")),  # Job C
        (time_to_minutes("10:00"), time_to_minutes("15:00")),  # Job D
    ]

    data = {
        "time_matrix": time_matrix,
        "time_windows": time_windows,
        "service_times": [0, 60, 30, 45, 60],
        "num_vehicles": 2,
        "depot": 0,
        "capacity": [4, 4],
        "demands": [0, 1, 1, 1, 1],
        "vehicle_windows": [
            (time_to_minutes("07:00"), time_to_minutes("17:00")),
            (time_to_minutes("08:00"), time_to_minutes("16:00")),
        ],
        "locations": locations,
    }

    result = solve_vrptw(data)
    assert result is not None, "Solver returned None — no solution found"
    assert result["status"] == "solved"
    assert len(result["routes"]) > 0
    assert len(result["unassigned"]) == 0

    print(json.dumps(result, indent=2))
    print(f"\nTotal time: {result['total_time_min']} min")
    print(f"Routes: {len(result['routes'])}")
    for route in result["routes"]:
        tech_stops = [s["name"] for s in route["stops"] if s.get("job_id")]
        print(f"  Tech {route['vehicle_id']}: {' -> '.join(tech_stops)} ({route['route_duration_min']} min)")

if __name__ == "__main__":
    test_basic_vrptw()
    print("\nAll tests passed!")
```

- [ ] **Step 4: Run the test locally**

```bash
cd solver
pip install ortools googlemaps
python test_solver.py
```

Expected: `All tests passed!` with route output showing 2 techs with jobs distributed.

- [ ] **Step 5: Deploy to Google Cloud Functions**

```bash
cd solver
gcloud functions deploy optimize-routes \
    --gen2 \
    --runtime python312 \
    --trigger-http \
    --allow-unauthenticated \
    --memory 1024MB \
    --timeout 60s \
    --region us-central1 \
    --entry-point optimize_routes
```

Note the deployed URL and update `.env.local` with `GCF_SOLVER_URL`.

- [ ] **Step 6: Commit**

```bash
git add solver/
git commit -m "feat: add Python VRP solver with OR-Tools, haversine fallback, pinned assignments"
```

---

## Task 7: API Routes (Solver Proxy, Jobs CRUD, Techs CRUD)

**Files:**
- Create: `src/app/api/solve/route.ts`
- Create: `src/app/api/jobs/route.ts`
- Create: `src/app/api/techs/route.ts`
- Create: `src/app/api/share/route.ts`

- [ ] **Step 1: Create solver proxy API route**

Create `src/app/api/solve/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  try {
    const gcfResponse = await fetch(process.env.GCF_SOLVER_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })

    const result = await gcfResponse.json()

    // Save route plan to database
    if (result.status === 'solved') {
      const { data: membership } = await supabase
        .from('memberships')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (membership) {
        const { data: plan } = await supabase.from('route_plans').insert({
          organization_id: membership.organization_id,
          plan_date: body.plan_date || new Date().toISOString().split('T')[0],
          total_time_min: result.total_time_min,
          solver_status: result.status,
          parameters: { tech_count: body.techs?.length, job_count: body.jobs?.length },
          created_by: user.id,
        }).select('id').single()

        if (plan) {
          const assignments = result.routes.map((route: any) => ({
            route_plan_id: plan.id,
            organization_id: membership.organization_id,
            technician_id: body.techs[route.vehicle_id]?.tech_id,
            stop_order: route.stops.filter((s: any) => s.job_id).map((s: any, i: number) => ({
              job_id: s.job_id,
              order: i,
              name: s.name,
              address: '',
              lat: s.lat,
              lng: s.lng,
              arrival_time: s.arrival_time,
              arrival_min: s.arrival_min,
              drive_min: 0,
              service_min: 0,
            })),
            total_drive_min: route.route_duration_min,
            total_jobs: route.stops.filter((s: any) => s.job_id).length,
          }))

          await supabase.from('route_assignments').insert(assignments)

          // Update job statuses to assigned
          for (const route of result.routes) {
            const jobIds = route.stops.filter((s: any) => s.job_id).map((s: any) => s.job_id)
            if (jobIds.length > 0) {
              await supabase.from('jobs').update({ status: 'assigned' }).in('id', jobIds)
            }
          }

          result.plan_id = plan.id
        }
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Solver error:', error)
    return NextResponse.json({ error: 'Failed to reach solver' }, { status: 502 })
  }
}
```

- [ ] **Step 2: Create jobs CRUD API route**

Create `src/app/api/jobs/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const date = request.nextUrl.searchParams.get('date') || new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('scheduled_date', date)
    .neq('status', 'cancelled')
    .order('priority', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { data: membership } = await supabase
    .from('memberships').select('organization_id').eq('user_id', user.id).single()

  if (!membership) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  // Handle single job or array (CSV import)
  const jobs = Array.isArray(body) ? body : [body]
  const toInsert = jobs.map(job => ({
    ...job,
    organization_id: membership.organization_id,
  }))

  const { data, error } = await supabase.from('jobs').insert(toInsert).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 3: Create techs CRUD API route**

Create `src/app/api/techs/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('technicians')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { data: membership } = await supabase
    .from('memberships').select('organization_id').eq('user_id', user.id).single()

  if (!membership) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  const { data, error } = await supabase.from('technicians').insert({
    ...body,
    organization_id: membership.organization_id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 4: Create route sharing API**

Create `src/app/api/share/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { route_plan_id, technician_id } = await request.json()
  const { data: membership } = await supabase
    .from('memberships').select('organization_id').eq('user_id', user.id).single()

  if (!membership) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  const { data, error } = await supabase.from('route_shares').insert({
    organization_id: membership.organization_id,
    route_plan_id,
    technician_id,
  }).select('token').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const baseUrl = request.nextUrl.origin
  return NextResponse.json({ url: `${baseUrl}/route/${data.token}` })
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/
git commit -m "feat: add API routes for solver proxy, jobs CRUD, techs CRUD, route sharing"
```

---

## Task 8: Data Hooks

**Files:**
- Create: `src/hooks/use-jobs.ts`
- Create: `src/hooks/use-techs.ts`
- Create: `src/hooks/use-optimization.ts`

- [ ] **Step 1: Create jobs hook**

Create `src/hooks/use-jobs.ts`:

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Job } from '@/lib/types'

export function useJobs(date?: string) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    const d = date || new Date().toISOString().split('T')[0]
    const res = await fetch(`/api/jobs?date=${d}`)
    if (res.ok) setJobs(await res.json())
    setLoading(false)
  }, [date])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const addJob = async (job: Partial<Job>) => {
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(job),
    })
    if (res.ok) { await fetchJobs(); return true }
    return false
  }

  const importCSV = async (jobs: Partial<Job>[]) => {
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jobs),
    })
    if (res.ok) { await fetchJobs(); return true }
    return false
  }

  return { jobs, loading, addJob, importCSV, refresh: fetchJobs }
}
```

- [ ] **Step 2: Create techs hook**

Create `src/hooks/use-techs.ts`:

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Technician } from '@/lib/types'

export function useTechs() {
  const [techs, setTechs] = useState<Technician[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTechs = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/techs')
    if (res.ok) setTechs(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchTechs() }, [fetchTechs])

  const addTech = async (tech: Partial<Technician>) => {
    const res = await fetch('/api/techs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tech),
    })
    if (res.ok) { await fetchTechs(); return true }
    return false
  }

  return { techs, loading, addTech, refresh: fetchTechs }
}
```

- [ ] **Step 3: Create optimization hook**

Create `src/hooks/use-optimization.ts`:

```typescript
'use client'

import { useState } from 'react'
import type { Job, Technician, SolverInput, SolverResult } from '@/lib/types'

export function useOptimization() {
  const [result, setResult] = useState<SolverResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const optimize = async (
    jobs: Job[],
    techs: Technician[],
    depot: { lat: number; lng: number; name: string }
  ) => {
    setLoading(true)
    setError(null)

    const activeJobs = jobs.filter(j => j.status !== 'completed' && j.status !== 'cancelled')
    const techIndex = new Map(techs.map((t, i) => [t.id, i]))

    const input: SolverInput = {
      depot,
      jobs: activeJobs.map(j => ({
        job_id: j.id,
        name: `${j.customer_name} - ${j.address}`,
        lat: j.lat || depot.lat,
        lng: j.lng || depot.lng,
        earliest: j.time_window_start || '06:00',
        latest: j.time_window_end || '20:00',
        service_minutes: j.service_minutes,
        pinned_tech_index: j.pinned_tech_id ? techIndex.get(j.pinned_tech_id) : undefined,
      })),
      techs: techs.map(t => ({
        tech_id: t.id,
        name: t.name,
        shift_start: t.default_start,
        shift_end: t.default_quit,
        max_jobs: t.max_jobs_per_day,
      })),
      use_google_maps: false, // Set to true for production
    }

    try {
      const res = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, plan_date: jobs[0]?.scheduled_date }),
      })
      const data = await res.json()

      if (data.status === 'solved') {
        setResult(data)
      } else {
        setError(data.error || 'No solution found')
      }
    } catch (e) {
      setError('Failed to reach solver')
    }

    setLoading(false)
  }

  return { result, loading, error, optimize }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/
git commit -m "feat: add React hooks for jobs, techs, and optimization"
```

---

## Task 9: Route Map Component

**Files:**
- Create: `src/components/route-map.tsx`

- [ ] **Step 1: Create the Mapbox route map component**

Create `src/components/route-map.tsx`:

```tsx
'use client'

import { useState, useCallback } from 'react'
import Map, { Source, Layer, NavigationControl } from 'react-map-gl'
import type { LineLayer, CircleLayer } from 'react-map-gl'
import type { FeatureCollection, Feature, LineString, Point } from 'geojson'
import { ROUTE_COLORS, DEFAULT_CENTER } from '@/lib/constants'
import type { SolverRoute } from '@/lib/types'
import 'mapbox-gl/dist/mapbox-gl.css'

interface RouteMapProps {
  routes: SolverRoute[]
  techNames?: Map<number, string>
  center?: [number, number]
  zoom?: number
}

function buildRoutesGeoJSON(routes: SolverRoute[]): FeatureCollection<LineString> {
  return {
    type: 'FeatureCollection',
    features: routes.map((route, i): Feature<LineString> => ({
      type: 'Feature',
      properties: {
        vehicle_id: route.vehicle_id,
        color: ROUTE_COLORS[i % ROUTE_COLORS.length],
      },
      geometry: {
        type: 'LineString',
        coordinates: route.stops
          .filter(s => s.lat && s.lng)
          .map(s => [s.lng, s.lat]),
      },
    })),
  }
}

function buildStopsGeoJSON(routes: SolverRoute[]): FeatureCollection<Point> {
  const features: Feature<Point>[] = []
  routes.forEach((route, ri) => {
    route.stops.forEach((stop, si) => {
      if (!stop.lat || !stop.lng) return
      features.push({
        type: 'Feature',
        properties: {
          name: stop.name || '',
          arrival_time: stop.arrival_time || '',
          color: ROUTE_COLORS[ri % ROUTE_COLORS.length],
          stop_number: si,
          is_depot: !stop.job_id,
        },
        geometry: { type: 'Point', coordinates: [stop.lng, stop.lat] },
      })
    })
  })
  return { type: 'FeatureCollection', features }
}

const lineLayer: LineLayer = {
  id: 'route-lines',
  type: 'line',
  layout: { 'line-join': 'round', 'line-cap': 'round' },
  paint: { 'line-color': ['get', 'color'], 'line-width': 4, 'line-opacity': 0.85 },
}

const circleLayer: CircleLayer = {
  id: 'stop-circles',
  type: 'circle',
  paint: {
    'circle-radius': ['case', ['get', 'is_depot'], 10, 7],
    'circle-color': ['get', 'color'],
    'circle-stroke-width': 2,
    'circle-stroke-color': '#fff',
  },
}

export default function RouteMap({ routes, techNames, center, zoom = 11 }: RouteMapProps) {
  const mapCenter = center || DEFAULT_CENTER
  const [viewState, setViewState] = useState({
    longitude: mapCenter[0],
    latitude: mapCenter[1],
    zoom,
  })
  const [selected, setSelected] = useState<any>(null)

  const handleClick = useCallback((event: any) => {
    const f = event.features?.[0]
    if (f?.layer?.id === 'stop-circles') {
      setSelected(f.properties)
    } else {
      setSelected(null)
    }
  }, [])

  return (
    <div className="relative h-full w-full min-h-[400px] rounded-lg overflow-hidden border">
      <Map
        {...viewState}
        onMove={e => setViewState(e.viewState)}
        onClick={handleClick}
        interactiveLayerIds={['stop-circles']}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/light-v11"
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" />
        <Source id="routes" type="geojson" data={buildRoutesGeoJSON(routes)}>
          <Layer {...lineLayer} />
        </Source>
        <Source id="stops" type="geojson" data={buildStopsGeoJSON(routes)}>
          <Layer {...circleLayer} />
        </Source>
      </Map>

      {selected && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 max-w-[240px] z-10">
          <p className="font-semibold text-sm">{selected.name}</p>
          {selected.arrival_time && (
            <p className="text-xs text-muted-foreground">ETA: {selected.arrival_time}</p>
          )}
        </div>
      )}

      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 z-10">
        {routes.map((route, i) => (
          <div key={route.vehicle_id} className="flex items-center gap-2 text-xs">
            <div
              className="w-3 h-1 rounded"
              style={{ backgroundColor: ROUTE_COLORS[i % ROUTE_COLORS.length] }}
            />
            <span>
              {techNames?.get(route.vehicle_id) || `Tech ${route.vehicle_id + 1}`}
              {' — '}
              {route.stops.filter(s => s.job_id).length} stops
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/route-map.tsx
git commit -m "feat: add Mapbox route map component with color-coded routes and stop markers"
```

---

## Task 10: Route List Component

**Files:**
- Create: `src/components/route-list.tsx`

- [ ] **Step 1: Create the route list component**

Create `src/components/route-list.tsx`:

```tsx
'use client'

import { ROUTE_COLORS } from '@/lib/constants'
import type { SolverRoute } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface RouteListProps {
  routes: SolverRoute[]
  techNames?: Map<number, string>
  unassigned?: { job_id: string; name: string }[]
}

export default function RouteList({ routes, techNames, unassigned }: RouteListProps) {
  return (
    <div className="space-y-4">
      {routes.map((route, i) => {
        const color = ROUTE_COLORS[i % ROUTE_COLORS.length]
        const jobStops = route.stops.filter(s => s.job_id)
        const techName = techNames?.get(route.vehicle_id) || `Tech ${route.vehicle_id + 1}`

        return (
          <Card key={route.vehicle_id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <CardTitle className="text-base">{techName}</CardTitle>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">{jobStops.length} jobs</Badge>
                  <Badge variant="secondary">{route.route_duration_min} min total</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {jobStops.map((stop, si) => {
                  const prevStop = si > 0 ? jobStops[si - 1] : route.stops[0]
                  const driveMin = prevStop ? stop.arrival_min - (prevStop.arrival_min || 0) : 0

                  return (
                    <li key={stop.job_id} className="flex items-start gap-3 text-sm">
                      <div className="flex flex-col items-center">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: color }}
                        >
                          {si + 1}
                        </div>
                        {si < jobStops.length - 1 && (
                          <div className="w-px h-6 bg-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{stop.name}</p>
                        <p className="text-muted-foreground text-xs">
                          Arrive: {stop.arrival_time}
                          {driveMin > 0 && ` (${driveMin} min drive)`}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </CardContent>
          </Card>
        )
      })}

      {unassigned && unassigned.length > 0 && (
        <Card className="border-destructive">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-destructive">
              Unassigned Jobs ({unassigned.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {unassigned.map(job => (
                <li key={job.job_id} className="text-muted-foreground">{job.name}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/route-list.tsx
git commit -m "feat: add route list component with per-tech ordered job sequences"
```

---

## Task 11: App Layout & Navigation

**Files:**
- Create: `src/app/(app)/layout.tsx`
- Create: `src/components/app-sidebar.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create sidebar navigation**

Create `src/components/app-sidebar.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { signout } from '@/app/login/actions'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dispatch', label: 'Dispatch' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/techs', label: 'Techs' },
]

export default function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-56 flex-col border-r bg-background p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold">RouteIQ</h1>
        <p className="text-xs text-muted-foreground">Route Optimization</p>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname === item.href
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <form action={signout}>
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
          Sign Out
        </Button>
      </form>
    </aside>
  )
}
```

- [ ] **Step 2: Create app layout**

Create `src/app/(app)/layout.tsx`:

```tsx
import AppSidebar from '@/components/app-sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Update root page to redirect**

Modify `src/app/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')
  redirect('/login')
}
```

- [ ] **Step 4: Create dashboard page**

Create `src/app/(app)/dashboard/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: membership } = await supabase
    .from('memberships')
    .select('organization_id, organizations(name)')
    .single()

  const today = new Date().toISOString().split('T')[0]
  const { count: jobCount } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('scheduled_date', today)
    .neq('status', 'cancelled')

  const { count: techCount } = await supabase
    .from('technicians')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {(membership?.organizations as any)?.name || 'Dashboard'}
        </h1>
        <p className="text-muted-foreground">Today: {today}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Today's Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{jobCount || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Active Techs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{techCount || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/dispatch">
              <Button className="w-full">Open Dispatch Board</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/ src/components/app-sidebar.tsx
git commit -m "feat: add app layout with sidebar navigation, dashboard, and root redirect"
```

---

## Task 12: Dispatch Board (Main Feature Page)

**Files:**
- Create: `src/app/(app)/dispatch/page.tsx`
- Create: `src/components/optimize-button.tsx`

- [ ] **Step 1: Create the optimize button component**

Create `src/components/optimize-button.tsx`:

```tsx
'use client'

import { Button } from '@/components/ui/button'

interface OptimizeButtonProps {
  onOptimize: () => void
  loading: boolean
  jobCount: number
  techCount: number
}

export default function OptimizeButton({ onOptimize, loading, jobCount, techCount }: OptimizeButtonProps) {
  const disabled = loading || jobCount === 0 || techCount === 0

  return (
    <div className="flex items-center gap-3">
      <Button onClick={onOptimize} disabled={disabled} size="lg">
        {loading ? 'Optimizing...' : 'Optimize Routes'}
      </Button>
      <span className="text-sm text-muted-foreground">
        {jobCount} jobs, {techCount} techs
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Create the dispatch board page**

Create `src/app/(app)/dispatch/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useJobs } from '@/hooks/use-jobs'
import { useTechs } from '@/hooks/use-techs'
import { useOptimization } from '@/hooks/use-optimization'
import RouteMap from '@/components/route-map'
import RouteList from '@/components/route-list'
import OptimizeButton from '@/components/optimize-button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DEFAULT_CENTER } from '@/lib/constants'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function DispatchPage() {
  const today = new Date().toISOString().split('T')[0]
  const { jobs, loading: jobsLoading } = useJobs(today)
  const { techs, loading: techsLoading } = useTechs()
  const { result, loading: solving, error, optimize } = useOptimization()
  const [shareLinks, setShareLinks] = useState<Record<number, string>>({})

  const handleOptimize = () => {
    if (jobs.length === 0 || techs.length === 0) return
    optimize(jobs, techs, {
      lat: DEFAULT_CENTER[1],
      lng: DEFAULT_CENTER[0],
      name: 'Office',
    })
  }

  const handleShare = async (vehicleId: number) => {
    if (!result?.plan_id) return
    const tech = techs[vehicleId]
    if (!tech) return

    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        route_plan_id: result.plan_id,
        technician_id: tech.id,
      }),
    })
    const data = await res.json()
    if (data.url) {
      setShareLinks(prev => ({ ...prev, [vehicleId]: data.url }))
      navigator.clipboard.writeText(data.url)
    }
  }

  const techNames = new Map(techs.map((t, i) => [i, t.name]))
  const loading = jobsLoading || techsLoading

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dispatch Board</h1>
          <p className="text-muted-foreground">{today}</p>
        </div>
        <OptimizeButton
          onOptimize={handleOptimize}
          loading={solving}
          jobCount={jobs.filter(j => j.status !== 'completed' && j.status !== 'cancelled').length}
          techCount={techs.length}
        />
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && <p className="text-muted-foreground">Loading jobs and techs...</p>}

      {result && result.routes.length > 0 && (
        <Tabs defaultValue="map">
          <TabsList>
            <TabsTrigger value="map">Map View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="h-[60vh]">
            <RouteMap
              routes={result.routes}
              techNames={techNames}
              center={DEFAULT_CENTER}
            />
          </TabsContent>

          <TabsContent value="list">
            <div className="space-y-2">
              {result.routes.map(route => (
                <div key={route.vehicle_id} className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShare(route.vehicle_id)}
                  >
                    {shareLinks[route.vehicle_id] ? 'Copied!' : 'Share Route'}
                  </Button>
                  {shareLinks[route.vehicle_id] && (
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {shareLinks[route.vehicle_id]}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <RouteList
              routes={result.routes}
              techNames={techNames}
              unassigned={result.unassigned}
            />
          </TabsContent>
        </Tabs>
      )}

      {!result && !loading && (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <p className="text-lg font-medium">Add jobs and techs, then hit Optimize</p>
          <p className="text-sm mt-1">
            {jobs.length} jobs loaded, {techs.length} techs available
          </p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify dispatch page renders**

```bash
npm run dev
```

Navigate to `/dispatch`. Should show the empty state with job/tech counts.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/dispatch/ src/components/optimize-button.tsx
git commit -m "feat: add dispatch board with optimize button, map/list tabs, and route sharing"
```

---

## Task 13: Job & Tech Management Pages

**Files:**
- Create: `src/components/job-form.tsx`
- Create: `src/components/tech-form.tsx`
- Create: `src/app/(app)/jobs/page.tsx`
- Create: `src/app/(app)/techs/page.tsx`

- [ ] **Step 1: Create job form dialog**

Create `src/components/job-form.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Job } from '@/lib/types'

interface JobFormProps {
  onSubmit: (job: Partial<Job>) => Promise<boolean>
}

export default function JobForm({ onSubmit }: JobFormProps) {
  const [open, setOpen] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const ok = await onSubmit({
      customer_name: fd.get('customer_name') as string,
      address: fd.get('address') as string,
      scheduled_date: fd.get('scheduled_date') as string || new Date().toISOString().split('T')[0],
      time_window_start: fd.get('time_window_start') as string || '06:00',
      time_window_end: fd.get('time_window_end') as string || '20:00',
      service_minutes: parseInt(fd.get('service_minutes') as string) || 60,
      priority: parseInt(fd.get('priority') as string) || 5,
      notes: fd.get('notes') as string,
    })
    if (ok) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Job</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Job</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer_name">Customer Name</Label>
            <Input id="customer_name" name="customer_name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" required placeholder="123 Main St, City, ST" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled_date">Date</Label>
              <Input id="scheduled_date" name="scheduled_date" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service_minutes">Duration (min)</Label>
              <Input id="service_minutes" name="service_minutes" type="number" defaultValue={60} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="time_window_start">Earliest</Label>
              <Input id="time_window_start" name="time_window_start" type="time" defaultValue="06:00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time_window_end">Latest</Label>
              <Input id="time_window_end" name="time_window_end" type="time" defaultValue="20:00" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select name="priority" defaultValue="5">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Urgent</SelectItem>
                <SelectItem value="3">High</SelectItem>
                <SelectItem value="5">Normal</SelectItem>
                <SelectItem value="7">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" />
          </div>
          <Button type="submit" className="w-full">Add Job</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Create tech form dialog**

Create `src/components/tech-form.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { Technician } from '@/lib/types'

interface TechFormProps {
  onSubmit: (tech: Partial<Technician>) => Promise<boolean>
}

export default function TechForm({ onSubmit }: TechFormProps) {
  const [open, setOpen] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const ok = await onSubmit({
      name: fd.get('name') as string,
      email: fd.get('email') as string,
      phone: fd.get('phone') as string,
      home_address: fd.get('home_address') as string,
      default_start: fd.get('default_start') as string || '07:00',
      default_quit: fd.get('default_quit') as string || '17:00',
      max_jobs_per_day: parseInt(fd.get('max_jobs_per_day') as string) || 8,
    })
    if (ok) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Tech</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Technician</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="home_address">Home Address</Label>
            <Input id="home_address" name="home_address" placeholder="Starting location" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="default_start">Start Time</Label>
              <Input id="default_start" name="default_start" type="time" defaultValue="07:00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default_quit">Quit Time</Label>
              <Input id="default_quit" name="default_quit" type="time" defaultValue="17:00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_jobs_per_day">Max Jobs</Label>
              <Input id="max_jobs_per_day" name="max_jobs_per_day" type="number" defaultValue={8} />
            </div>
          </div>
          <Button type="submit" className="w-full">Add Tech</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Create jobs management page**

Create `src/app/(app)/jobs/page.tsx`:

```tsx
'use client'

import { useJobs } from '@/hooks/use-jobs'
import JobForm from '@/components/job-form'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { JOB_STATUS_LABELS, PRIORITY_LABELS } from '@/lib/constants'

export default function JobsPage() {
  const { jobs, loading, addJob } = useJobs()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Jobs</h1>
        <JobForm onSubmit={addJob} />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Time Window</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map(job => (
              <TableRow key={job.id}>
                <TableCell className="font-medium">{job.customer_name}</TableCell>
                <TableCell className="max-w-[200px] truncate">{job.address}</TableCell>
                <TableCell>{job.time_window_start} - {job.time_window_end}</TableCell>
                <TableCell>{job.service_minutes} min</TableCell>
                <TableCell>
                  <Badge variant={job.priority <= 3 ? 'destructive' : 'outline'}>
                    {PRIORITY_LABELS[job.priority] || 'Normal'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{JOB_STATUS_LABELS[job.status]}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {jobs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No jobs for today. Add one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create techs management page**

Create `src/app/(app)/techs/page.tsx`:

```tsx
'use client'

import { useTechs } from '@/hooks/use-techs'
import TechForm from '@/components/tech-form'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default function TechsPage() {
  const { techs, loading, addTech } = useTechs()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Technicians</h1>
        <TechForm onSubmit={addTech} />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Max Jobs</TableHead>
              <TableHead>Skills</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {techs.map(tech => (
              <TableRow key={tech.id}>
                <TableCell className="font-medium">{tech.name}</TableCell>
                <TableCell>{tech.phone || '-'}</TableCell>
                <TableCell>{tech.default_start} - {tech.default_quit}</TableCell>
                <TableCell>{tech.max_jobs_per_day}</TableCell>
                <TableCell>
                  {tech.skills?.length > 0
                    ? tech.skills.map(s => <Badge key={s} variant="outline" className="mr-1">{s}</Badge>)
                    : '-'
                  }
                </TableCell>
                <TableCell>
                  <Badge variant={tech.is_active ? 'default' : 'secondary'}>
                    {tech.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {techs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No technicians yet. Add your first tech.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/job-form.tsx src/components/tech-form.tsx src/app/\(app\)/jobs/ src/app/\(app\)/techs/
git commit -m "feat: add job and tech management pages with CRUD forms and tables"
```

---

## Task 14: Public Tech Route View with Check-In/Out

**Files:**
- Create: `src/app/route/[token]/page.tsx`
- Create: `src/components/check-in-out.tsx`

- [ ] **Step 1: Create check-in/out component**

Create `src/components/check-in-out.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface CheckInOutProps {
  jobId: string
  techId: string
  shareToken: string
  checkedIn?: string
  checkedOut?: string
}

export default function CheckInOut({ jobId, techId, shareToken, checkedIn, checkedOut }: CheckInOutProps) {
  const [inTime, setInTime] = useState(checkedIn)
  const [outTime, setOutTime] = useState(checkedOut)
  const [loading, setLoading] = useState(false)

  const handleAction = async (action: 'in' | 'out') => {
    setLoading(true)
    const now = new Date().toISOString()

    const res = await fetch(`/api/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId, technician_id: techId, action, token: shareToken }),
    })

    if (res.ok) {
      if (action === 'in') setInTime(now)
      else setOutTime(now)
    }
    setLoading(false)
  }

  if (outTime) {
    return <span className="text-xs text-green-600 font-medium">Done</span>
  }
  if (inTime) {
    return (
      <Button size="sm" variant="outline" onClick={() => handleAction('out')} disabled={loading}>
        {loading ? '...' : 'Check Out'}
      </Button>
    )
  }
  return (
    <Button size="sm" onClick={() => handleAction('in')} disabled={loading}>
      {loading ? '...' : 'Check In'}
    </Button>
  )
}
```

- [ ] **Step 2: Create public route page**

Create `src/app/route/[token]/page.tsx`:

```tsx
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import CheckInOut from '@/components/check-in-out'

export default async function PublicRoutePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = createAdminClient()

  // Look up the share
  const { data: share } = await supabase
    .from('route_shares')
    .select('*, route_plans(*), technicians(name)')
    .eq('token', token)
    .single()

  if (!share || new Date(share.expires_at) < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-lg font-medium">Route not found or expired</p>
            <p className="text-muted-foreground text-sm mt-1">Ask your dispatcher for a new link.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Get the assignment for this tech in this plan
  const { data: assignment } = await supabase
    .from('route_assignments')
    .select('*')
    .eq('route_plan_id', share.route_plan_id)
    .eq('technician_id', share.technician_id)
    .single()

  const stops = assignment?.stop_order || []
  const techName = (share.technicians as any)?.name || 'Tech'

  // Get existing check-ins
  const jobIds = stops.map((s: any) => s.job_id).filter(Boolean)
  const { data: checkIns } = await supabase
    .from('check_ins')
    .select('*')
    .eq('technician_id', share.technician_id)
    .in('job_id', jobIds.length > 0 ? jobIds : ['none'])

  const checkInMap = new Map(
    (checkIns || []).map(ci => [ci.job_id, ci])
  )

  return (
    <div className="min-h-screen bg-background p-4 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold">{techName}'s Route</h1>
        <p className="text-sm text-muted-foreground">
          {share.route_plans?.plan_date} — {stops.length} stops
        </p>
      </div>

      <div className="space-y-3">
        {stops.map((stop: any, i: number) => {
          const ci = checkInMap.get(stop.job_id)
          return (
            <Card key={stop.job_id || i}>
              <CardContent className="flex items-center gap-3 py-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{stop.name}</p>
                  <p className="text-xs text-muted-foreground">
                    ETA: {stop.arrival_time}
                  </p>
                </div>
                <CheckInOut
                  jobId={stop.job_id}
                  techId={share.technician_id}
                  shareToken={token}
                  checkedIn={ci?.checked_in_at}
                  checkedOut={ci?.checked_out_at}
                />
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create check-in API route**

Create `src/app/api/checkin/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const { job_id, technician_id, action, token } = await request.json()

  // Verify the token is valid
  const supabase = createAdminClient()
  const { data: share } = await supabase
    .from('route_shares')
    .select('id, organization_id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!share) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  if (action === 'in') {
    const { error } = await supabase.from('check_ins').upsert({
      organization_id: share.organization_id,
      job_id,
      technician_id,
      checked_in_at: new Date().toISOString(),
    }, { onConflict: 'job_id,technician_id' })

    // Update job status
    await supabase.from('jobs').update({ status: 'in_progress' }).eq('id', job_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase.from('check_ins')
      .update({ checked_out_at: new Date().toISOString() })
      .eq('job_id', job_id)
      .eq('technician_id', technician_id)

    // Update job status
    await supabase.from('jobs').update({ status: 'completed' }).eq('id', job_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Add unique constraint for check_ins upsert**

Add to a new migration or run in SQL editor:

```sql
ALTER TABLE public.check_ins ADD CONSTRAINT check_ins_job_tech_unique UNIQUE (job_id, technician_id);
```

- [ ] **Step 5: Commit**

```bash
git add src/app/route/ src/app/api/checkin/ src/components/check-in-out.tsx
git commit -m "feat: add public tech route view with check-in/check-out functionality"
```

---

## Task 15: End-to-End Verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Create account and organization**

Navigate to `/signup`. Create an account with a company name. Verify redirect to login, then sign in.

- [ ] **Step 3: Add technicians**

Navigate to `/techs`. Add 2-3 techs with names, start/quit times, and max jobs.

- [ ] **Step 4: Add jobs**

Navigate to `/jobs`. Add 4-6 jobs with addresses, time windows, and durations.

- [ ] **Step 5: Run optimization**

Navigate to `/dispatch`. Click "Optimize Routes." Verify:
- Routes appear in both map and list view
- Each tech has a color-coded route
- Jobs are distributed across techs
- Unassigned jobs (if any) are shown

- [ ] **Step 6: Test tech route sharing**

Click "Share Route" for a tech. Open the copied URL in an incognito tab. Verify:
- Route displays without login
- Check-in/check-out buttons work
- Job status updates

- [ ] **Step 7: Test re-optimization**

Go back to `/jobs`, add a new urgent job. Go to `/dispatch`, hit optimize again. Verify completed jobs stay locked, new job gets assigned.

- [ ] **Step 8: Final commit**

```bash
git add .
git commit -m "feat: RouteIQ MVP complete — route optimization, dispatch board, tech check-in/out"
```

---

## What's Next (Post-MVP)

These are NOT in this plan but are documented for future work:

1. **Geocoding** — Auto-geocode addresses on job creation (Google Maps API)
2. **CSV Import** — Parse and import bulk job lists
3. **Drag-and-drop** — Manual job reordering on the dispatch board
4. **Tech availability page** — Per-day quit times and unavailable blocks UI
5. **Google Maps integration** — Switch from haversine to real drive times
6. **MTM/ERPNext bridge** — The paid integration module
7. **Stripe billing** — Subscription management and payment processing
8. **AI dispatch** — Learning loop from historical job data
