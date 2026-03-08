import type { APIRoute } from "astro";
import { adminAuth, adminDb } from "../../../lib/firebase/server";

export const ALL: APIRoute = async ({ request, cookies, redirect }) => {
    // Extract ID Token from Authorization header
    const authHeader = request.headers.get("Authorization");
    const idToken = authHeader?.split("Bearer ")[1];

    if (!idToken) {
        return new Response(JSON.stringify({ error: "No token provided" }), {
            status: 401,
        });
    }

    try {
        // Verify the ID token and create a session cookie
        const decodedToken = await adminAuth.verifyIdToken(idToken);

        // Set session expiration to 5 days
        const expiresIn = 60 * 60 * 24 * 5 * 1000;

        // Create the session cookie
        const sessionCookie = await adminAuth.createSessionCookie(idToken, {
            expiresIn,
        });

        // Set cookie on the client securely
        cookies.set("session", sessionCookie, {
            path: "/",
            httpOnly: true,
            secure: import.meta.env.PROD,
            sameSite: "lax",
            maxAge: expiresIn / 1000, // maxAge in seconds
        });

        // Set a client-readable cookie for UI toggles
        cookies.set("isLoggedIn", "true", {
            path: "/",
            httpOnly: false,
            secure: import.meta.env.PROD,
            sameSite: "lax",
            maxAge: expiresIn / 1000,
        });

        // Check subscription status in Firestore → redirect accordingly
        try {
            const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
            const stripeStatus = userDoc.data()?.stripe_status;
            const isPremium = stripeStatus === 'active';

            cookies.set("isPremium", isPremium ? "true" : "false", {
                path: "/",
                httpOnly: false,
                secure: import.meta.env.PROD,
                sameSite: "lax",
                maxAge: expiresIn / 1000,
            });

            if (isPremium) {
                return new Response(JSON.stringify({ success: true, url: "/dashboard" }), { status: 200 });
            } else {
                return new Response(JSON.stringify({ success: true, url: "/pricing" }), { status: 200 });
            }
        } catch {
            cookies.set("isPremium", "false", { path: "/" });
            return new Response(JSON.stringify({ success: true, url: "/pricing" }), { status: 200 });
        }
    } catch (error: any) {
        console.error("Session creation error", error);
        return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 });
    }
};
