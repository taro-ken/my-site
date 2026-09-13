import type { APIRoute } from "astro";
import { stripe } from "../../../lib/stripe";
import { adminAuth, adminDb } from "../../../lib/firebase/server";

/**
 * ネイティブアプリ(Essence)向けのStripe Billing Portalエンドポイント。
 * checkout-app.tsと同様、Cookieの代わりにFirebase IDトークン(Authorizationヘッダー)で
 * 認証し、リダイレクトではなくJSONでPortal URLを返す。
 */
export const POST: APIRoute = async ({ request, url }) => {
    const authHeader = request.headers.get("Authorization");
    const idToken = authHeader?.split("Bearer ")[1];

    if (!idToken) {
        return new Response(JSON.stringify({ error: "No token provided" }), { status: 401 });
    }

    let uid: string;
    try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        uid = decoded.uid;
    } catch {
        return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 });
    }

    try {
        const userDoc = await adminDb.collection("users").doc(uid).get();
        const customerId = userDoc.data()?.stripe_customer_id;

        if (!customerId) {
            return new Response(JSON.stringify({ error: "No Stripe customer found" }), { status: 400 });
        }

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${url.origin}/app-checkout-complete?status=canceled`,
        });

        return new Response(JSON.stringify({ url: portalSession.url }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (err: any) {
        console.error("[portal-app] Stripe Portal Error:", err);
        return new Response(JSON.stringify({ error: err.message || "Failed to create portal session" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};
