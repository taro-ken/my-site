import type { APIRoute } from "astro";
import { stripe } from "../../../lib/stripe";
import { adminAuth } from "../../../lib/firebase/server";
import { ESSENCE_JOIN_OPEN } from "../../../lib/essence";

export const ALL: APIRoute = async ({ cookies, redirect, url }) => {
    if (!ESSENCE_JOIN_OPEN) {
        return redirect("/dashboard");
    }

    const sessionCookie = cookies.get("session");

    if (!sessionCookie) {
        return redirect("/login");
    }

    try {
        const decodedToken = await adminAuth.verifySessionCookie(sessionCookie.value, true);
        const user = await adminAuth.getUser(decodedToken.uid);

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            client_reference_id: user.uid, // Links Stripe checkout to Firebase UID
            customer_email: user.email,
            line_items: [
                {
                    price: import.meta.env.PUBLIC_STRIPE_PRICE_ID,
                    quantity: 1,
                },
            ],
            success_url: `${url.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}&success=true`,
            cancel_url: `${url.origin}/membership?canceled=true`,
        });

        if (!session.url) {
            throw new Error("Failed to create checkout session");
        }

        return redirect(session.url);
    } catch (err: any) {
        console.error("Stripe Checkout Error:", err);
        return new Response(err.message || "Failed to create checkout session", { status: 500 });
    }
};
