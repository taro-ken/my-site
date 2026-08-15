import type { APIRoute } from "astro";

export const ALL: APIRoute = async ({ cookies, redirect }) => {
    const cookieOptions = {
        path: "/",
        secure: import.meta.env.PROD,
        sameSite: "lax" as const,
    };

    cookies.delete("session", cookieOptions);
    cookies.delete("isLoggedIn", cookieOptions);
    cookies.delete("isPremium", cookieOptions);
    return redirect("/login");
};
