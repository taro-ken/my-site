import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ cookies, redirect }) => {
    cookies.delete("session", { path: "/" });
    cookies.delete("isLoggedIn", { path: "/" });
    cookies.delete("isPremium", { path: "/" });
    return redirect("/login");
};
