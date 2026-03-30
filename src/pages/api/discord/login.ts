import type { APIRoute } from "astro";

import { adminAuth, adminDb } from "../../../lib/firebase/server";

export const GET: APIRoute = async ({ cookies, redirect }) => {
  const sessionCookie = cookies.get("session")?.value;
  let isPremium = false;

  if (sessionCookie) {
    try {
      const decodedToken = await adminAuth.verifySessionCookie(sessionCookie);
      const doc = await adminDb.collection("users").doc(decodedToken.uid).get();
      if (doc.exists && doc.data()?.stripe_status === "active") {
        isPremium = true;
      }
    } catch (e) {
      console.error("Session verify failed in Discord API", e);
    }
  }

  if (!isPremium) {
    return redirect("/membership");
  }

  const clientId = import.meta.env.DISCORD_CLIENT_ID;
  const redirectUri = import.meta.env.DISCORD_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return new Response("サーバー側のDiscord API設定が未完了です。管理人にお問い合わせください。", { status: 500 });
  }

  // Generate a random state string for security (optional but recommended)
  const state = Math.random().toString(36).substring(7);

  const url = new URL("https://discord.com/api/oauth2/authorize");
  url.searchParams.append("client_id", clientId);
  url.searchParams.append("redirect_uri", redirectUri);
  url.searchParams.append("response_type", "code");
  // identify: ユーザーID等の取得, guilds.join: サーバー自動追加権限
  url.searchParams.append("scope", "identify guilds.join");
  url.searchParams.append("state", state);

  return redirect(url.toString());
};
