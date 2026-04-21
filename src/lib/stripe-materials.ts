import { stripe } from './stripe';

/** checkout.metadata.product と一致させる */
export const LEARNING_MATERIALS_PRODUCT = 'learning_materials';

export type VerifyMaterialsResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | 'not_configured'
        | 'invalid_session'
        | 'wrong_mode'
        | 'not_paid'
        | 'wrong_product'
        | 'wrong_user';
    };

async function verifyLearningMaterialsSessionPayload(
  session: Awaited<ReturnType<typeof stripe.checkout.sessions.retrieve>>
): Promise<VerifyMaterialsResult> {
  const priceId = import.meta.env.PUBLIC_STRIPE_MATERIALS_PRICE_ID;
  if (!priceId) {
    return { ok: false, reason: 'not_configured' };
  }
  if (session.mode !== 'payment') {
    return { ok: false, reason: 'wrong_mode' };
  }
  if (session.payment_status !== 'paid') {
    return { ok: false, reason: 'not_paid' };
  }
  const items = session.line_items?.data ?? [];
  const hasPrice = items.some((li) => li.price?.id === priceId);
  if (!hasPrice) {
    return { ok: false, reason: 'wrong_product' };
  }
  return { ok: true };
}

/** 買い切り教材用 Checkout Session か（Stripe API のみ） */
export async function verifyLearningMaterialsCheckoutSession(sessionId: string): Promise<VerifyMaterialsResult> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items.data.price'],
    });
    return verifyLearningMaterialsSessionPayload(session);
  } catch {
    return { ok: false, reason: 'invalid_session' };
  }
}

/** 上記に加え、client_reference_id がログインユーザーと一致するか（リンク共有対策） */
export async function verifyLearningMaterialsCheckoutSessionForUser(
  sessionId: string,
  uid: string
): Promise<VerifyMaterialsResult> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items.data.price'],
    });
    const base = await verifyLearningMaterialsSessionPayload(session);
    if (!base.ok) {
      return base;
    }
    if (session.client_reference_id !== uid) {
      return { ok: false, reason: 'wrong_user' };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: 'invalid_session' };
  }
}
