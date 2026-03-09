import { defineMiddleware } from "astro:middleware";
import { adminAuth, adminDb } from "./lib/firebase/server";

export const onRequest = defineMiddleware(async (context, next) => {
    const sessionCookie = context.cookies.get("session")?.value;

    // Initialize locals
    context.locals.isLoggedIn = false;
    context.locals.isPremium = false;
    context.locals.user = null;

    // Don't run auth logic for API routes (critical for webhooks & auth calls)
    if (context.url.pathname.startsWith("/api/")) {
        return next();
    }

    if (sessionCookie) {
        try {
            const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
            context.locals.isLoggedIn = true;

            // Fetch user data once and store it
            const user = await adminAuth.getUser(decodedToken.uid);
            context.locals.user = user;

            // Check Firestore for premium status
            const doc = await adminDb.collection('users').doc(decodedToken.uid).get();
            if (doc.exists && doc.data()?.stripe_status === 'active') {
                context.locals.isPremium = true;
            }
        } catch (err) {
            // Session invalid or expired
            context.locals.isLoggedIn = false;
            context.locals.isPremium = false;
            context.locals.user = null;
        }
    }

    return next();
});
