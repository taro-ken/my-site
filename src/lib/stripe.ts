import Stripe from 'stripe';

const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY;

export const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2026-02-25.clover' as any,
    typescript: true,
});
