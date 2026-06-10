import Stripe from "stripe";

let cachedStripe: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) return null;
  if (!cachedStripe) {
    cachedStripe = new Stripe(secretKey, {
      apiVersion: "2026-03-25.dahlia" as any,
    });
  }
  return cachedStripe;
}
