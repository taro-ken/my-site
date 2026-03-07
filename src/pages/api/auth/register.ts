import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request, redirect }) => {
    const formData = await request.formData();
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return redirect("/register?error=missing_fields");
    }

    // Use Firebase REST API to create user with email/password
    // Try both Astro's import.meta.env and Node's process.env as fallback
    const apiKey = import.meta.env.PUBLIC_FIREBASE_API_KEY || process.env.PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
        console.error("Firebase API key not found in environment");
        return redirect("/register?error=server_error");
    }
    const firebaseRestUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;

    try {
        const res = await fetch(firebaseRestUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, returnSecureToken: true }),
        });

        if (!res.ok) {
            const err = await res.json();
            const code: string = err?.error?.message ?? "UNKNOWN";
            // Pass raw code to URL so we can see it; map known codes to friendly ones
            if (code.includes("EMAIL_EXISTS")) {
                return redirect("/register?error=email_exists");
            }
            if (code.includes("WEAK_PASSWORD")) {
                return redirect("/register?error=weak_password");
            }
            // Pass the raw firebase error code so it shows in the page
            return redirect(`/register?error=firebase_${encodeURIComponent(code)}`);
        }

        // Registration successful, redirect to login
        return redirect("/login?registered=true");
    } catch {
        return redirect("/register?error=server_error");
    }
};
