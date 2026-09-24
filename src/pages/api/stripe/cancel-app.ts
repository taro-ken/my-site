import type { APIRoute } from "astro";
import { stripe } from "../../../lib/stripe";
import { adminAuth, adminDb } from "../../../lib/firebase/server";

/**
 * ネイティブアプリ(Essence)向け: 解約を「予約」する(cancel_at_period_end)。
 * 即座に解約するのではなく、今回お支払い済みの期間が終わるタイミングで
 * 自動更新を止める。それまでは stripe_status は 'active' のまま(=利用は継続)。
 * checkout-app.ts / portal-app.tsと同様、Firebase IDトークン(Authorizationヘッダー)で認証する。
 */
export const POST: APIRoute = async ({ request }) => {
    const authHeader = request.headers.get("Authorization");
    const idToken = authHeader?.split("Bearer ")[1];

    if (!idToken) {
        return json({ error: "No token provided" }, 401);
    }

    let uid: string;
    try {
        uid = (await adminAuth.verifyIdToken(idToken)).uid;
    } catch {
        return json({ error: "Invalid token" }, 401);
    }

    try {
        const userRef = adminDb.collection("users").doc(uid);
        const userDoc = await userRef.get();
        const subscriptionId = userDoc.data()?.stripe_subscription_id;

        if (!subscriptionId) {
            return json({ error: "No active subscription found" }, 400);
        }

        const subscription = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
        });
        const currentPeriodEndUnix = subscription.items.data[0]?.current_period_end ?? null;
        const currentPeriodEnd = currentPeriodEndUnix ? new Date(currentPeriodEndUnix * 1000) : null;

        // Webhookの到達を待たず、その場でFirestoreにも反映しておく(アプリ側の即時反映のため)。
        await userRef.set(
            {
                stripe_cancel_at_period_end: true,
                stripe_current_period_end: currentPeriodEnd,
                updatedAt: new Date(),
            },
            { merge: true }
        );

        return json(
            {
                cancelAtPeriodEnd: true,
                currentPeriodEnd: currentPeriodEnd ? currentPeriodEnd.toISOString() : null,
            },
            200
        );
    } catch (err: any) {
        console.error("[cancel-app] Stripe Error:", err);
        return json({ error: err.message || "Failed to cancel subscription" }, 500);
    }
};

function json(body: unknown, status: number) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}
