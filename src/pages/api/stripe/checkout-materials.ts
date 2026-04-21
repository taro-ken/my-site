import type { APIRoute } from 'astro';
import { stripe } from '../../../lib/stripe';
import { adminAuth } from '../../../lib/firebase/server';
import { LEARNING_MATERIALS_PRODUCT } from '../../../lib/stripe-materials';

const LOGIN_REDIRECT = '/login?redirect=' + encodeURIComponent('/engineering-roadmap#purchase');

/**
 * ログイン必須・買い切り教材用 Checkout（mode: payment）
 */
export const POST: APIRoute = async ({ redirect, cookies, url }) => {
  const sessionCookie = cookies.get('session')?.value;
  if (!sessionCookie) {
    return redirect(LOGIN_REDIRECT, 303);
  }

  let uid: string;
  let email: string | undefined;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    uid = decoded.uid;
    const user = await adminAuth.getUser(uid);
    email = user.email ?? undefined;
  } catch {
    return redirect(LOGIN_REDIRECT, 303);
  }

  const priceId = import.meta.env.PUBLIC_STRIPE_MATERIALS_PRICE_ID;
  if (!priceId) {
    return new Response('PUBLIC_STRIPE_MATERIALS_PRICE_ID is not set', { status: 500 });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      client_reference_id: uid,
      ...(email ? { customer_email: email } : {}),
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { product: LEARNING_MATERIALS_PRODUCT },
      success_url: `${url.origin}/engineering-roadmap?session_id={CHECKOUT_SESSION_ID}#purchase`,
      cancel_url: `${url.origin}/engineering-roadmap?canceled=1#purchase`,
    });

    if (!session.url) {
      throw new Error('No checkout URL');
    }

    return redirect(session.url, 303);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Checkout failed';
    console.error('[checkout-materials]', message);
    return new Response(message, { status: 500 });
  }
};
