import type { APIRoute } from "astro";
import { adminAuth, adminDb } from "../../../lib/firebase/server";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
    const formData = await request.formData();
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return redirect("/login?error=missing_fields");
    }

    // Use Firebase REST API to sign in with email/password
    const apiKey = import.meta.env.PUBLIC_FIREBASE_API_KEY || process.env.PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
        return redirect("/login?error=server_error");
    }
    const firebaseRestUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;

    let idToken: string;
    let uid: string;
    try {
        const res = await fetch(firebaseRestUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, returnSecureToken: true }),
        });

        if (!res.ok) {
            return redirect(`/login?error=invalid_credentials`);
        }

        const data = await res.json();
        idToken = data.idToken;
        uid = data.localId; // Firebase REST API returns the user's UID as localId
    } catch {
        return redirect("/login?error=server_error");
    }

    // Create session cookie using Firebase Admin
    try {
        const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
        const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

        cookies.set("session", sessionCookie, {
            maxAge: expiresIn / 1000,
            httpOnly: true,
            secure: import.meta.env.PROD,
            path: "/",
            sameSite: "lax",
        });

        // Set a client-readable cookie for UI toggles
        cookies.set("isLoggedIn", "true", {
            maxAge: expiresIn / 1000,
            httpOnly: false,
            secure: import.meta.env.PROD,
            path: "/",
            sameSite: "lax",
        });
    } catch {
        return redirect("/login?error=session_error");
    }

    // Check subscription status in Firestore → redirect accordingly
    try {
        const userDoc = await adminDb.collection('users').doc(uid).get();
        const stripeStatus = userDoc.data()?.stripe_status;
        const isPremium = stripeStatus === 'active';

        cookies.set("isPremium", isPremium ? "true" : "false", {
            maxAge: 60 * 60 * 24 * 5, // 5 days
            httpOnly: false,
            secure: import.meta.env.PROD,
            path: "/",
            sameSite: "lax",
        });

        if (isPremium) {
            return redirect("/dashboard");
        } else {
            return redirect("/pricing");
        }
    } catch {
        cookies.set("isPremium", "false", { path: "/" });
        return redirect("/pricing");
    }
};
