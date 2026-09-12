import type { APIRoute } from "astro";
import { stripe } from "../../../lib/stripe";
import { adminAuth } from "../../../lib/firebase/server";

/**
 * ネイティブアプリ(Essence)向けのCheckout Sessionエンドポイント。
 * 既存の /api/stripe/checkout はブラウザのセッションCookieを前提にしているが、
 * アプリはCookieを持たないため、Firebase IDトークン(Authorizationヘッダー)で
 * 認証し、リダイレクトではなくJSONでCheckout URLを返す。
 */
export const POST: APIRoute = async ({ request, url }) => {
    const authHeader = request.headers.get("Authorization");
    const idToken = authHeader?.split("Bearer ")[1];

    if (!idToken) {
        return new Response(JSON.stringify({ error: "No token provided" }), { status: 401 });
    }

    let uid: string;
    let email: string | undefined;
    try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        uid = decoded.uid;
        const user = await adminAuth.getUser(uid);
        email = user.email ?? undefined;
    } catch {
        return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 });
    }

    const priceId = import.meta.env.PUBLIC_STRIPE_PRICE_ID;
    if (!priceId) {
        return new Response(JSON.stringify({ error: "PUBLIC_STRIPE_PRICE_ID is not set" }), { status: 500 });
    }

    try {
        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card"],
            client_reference_id: uid,
            ...(email ? { customer_email: email } : {}),
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${url.origin}/app-checkout-complete?status=success`,
            cancel_url: `${url.origin}/app-checkout-complete?status=canceled`,
        });

        if (!session.url) {
            throw new Error("Failed to create checkout session");
        }

        return new Response(JSON.stringify({ url: session.url }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (err: any) {
        console.error("[checkout-app] Stripe Checkout Error:", err);
        return new Response(JSON.stringify({ error: err.message || "Failed to create checkout session" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};
