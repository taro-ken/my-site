import type { APIRoute } from "astro";
import { stripe } from "../../../lib/stripe";
import { adminAuth, adminDb } from "../../../lib/firebase/server";

/**
 * ネイティブアプリ(Essence)向け: cancel-app.tsで予約した解約を取り消す。
 * 支払い済み期間が終わる前であれば、自動更新をそのまま継続させる。
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

        await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: false,
        });

        await userRef.set(
            {
                stripe_cancel_at_period_end: false,
                updatedAt: new Date(),
            },
            { merge: true }
        );

        return json({ cancelAtPeriodEnd: false }, 200);
    } catch (err: any) {
        console.error("[resume-app] Stripe Error:", err);
        return json({ error: err.message || "Failed to resume subscription" }, 500);
    }
};

function json(body: unknown, status: number) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}
