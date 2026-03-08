import type { APIRoute } from "astro";
import { stripe } from "../../../lib/stripe";
import { adminAuth, adminDb } from "../../../lib/firebase/server";

export const ALL: APIRoute = async ({ cookies, redirect, url }) => {
    const sessionCookie = cookies.get("session");

    if (!sessionCookie) {
        return redirect("/login");
    }

    try {
        const decodedToken = await adminAuth.verifySessionCookie(sessionCookie.value, true);

        // Get Stripe customer ID from Firestore
        const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
        const customerId = userDoc.data()?.stripe_customer_id;

        if (!customerId) {
            return new Response("No Stripe customer found", { status: 400 });
        }

        // Create Stripe Billing Portal session
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${url.origin}/dashboard`,
        });

        return redirect(portalSession.url);
    } catch (err: any) {
        console.error("Stripe Portal Error:", err);
        return new Response(err.message || "Failed to create portal session", { status: 500 });
    }
};
