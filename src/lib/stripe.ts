/**
 * Stripe client helpers.
 * Server-side: use getStripe() for API route operations.
 * Client-side: use getStripeJs() for Checkout redirects.
 */

import Stripe from 'stripe'
import { loadStripe, type Stripe as StripeJs } from '@stripe/stripe-js'

// Server-side Stripe instance (used in API routes only)
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-03-31.basil' as any,
    })
  }
  return _stripe
}

// Client-side Stripe.js instance (used for redirectToCheckout)
let _stripeJs: Promise<StripeJs | null> | null = null

export function getStripeJs() {
  if (!_stripeJs) {
    _stripeJs = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
  }
  return _stripeJs
}
