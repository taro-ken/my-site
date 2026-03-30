import type { APIRoute } from "astro";

import { adminAuth, adminDb } from "../../../lib/firebase/server";

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const sessionCookie = cookies.get("session")?.value;
  let isPremium = false;
  let uid: string | null = null;

  if (sessionCookie) {
    try {
      const decodedToken = await adminAuth.verifySessionCookie(sessionCookie);
      uid = decodedToken.uid;
      const doc = await adminDb.collection("users").doc(uid).get();
      if (doc.exists && doc.data()?.stripe_status === "active") {
        isPremium = true;
      }
    } catch (e) {
      console.error("Session verify failed in Discord Callback", e);
    }
  }

  // 1. プレミアムユーザーでなければ弾く（直リンク対策）
  if (!isPremium) {
    return redirect("/membership");
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    console.error("Discord Auth canceled or failed:", error);
    return redirect("/dashboard?discord=canceled");
  }

  if (!code) {
    return new Response("Discord認証コードがありません", { status: 400 });
  }

  const clientId = import.meta.env.DISCORD_CLIENT_ID;
  const clientSecret = import.meta.env.DISCORD_CLIENT_SECRET;
  const redirectUri = import.meta.env.DISCORD_REDIRECT_URI;
  const botToken = import.meta.env.DISCORD_BOT_TOKEN;
  const guildId = import.meta.env.DISCORD_GUILD_ID;
  const roleId = import.meta.env.DISCORD_ROLE_ID;
  const channelId = import.meta.env.DISCORD_CHANNEL_ID;

  if (!clientId || !clientSecret || !botToken || !guildId) {
    console.error("Discord Keys missing in .env");
    return new Response("サーバー設定エラー: 管理者にお問い合わせください", { status: 500 });
  }

  try {
    // 2. 認証コードをアクセストークン（ユーザー操作権限）と交換
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", await tokenResponse.text());
      return redirect("/dashboard?discord=failed");
    }

    const { access_token } = await tokenResponse.json();

    // 3. Discordユーザー自身の情報を取得（自身のIDを知るため）
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userResponse.ok) {
      console.error("Failed to fetch Discord user:", await userResponse.text());
      return redirect("/dashboard?discord=failed");
    }

    const discordUser = await userResponse.json();
    const discordUserId = discordUser.id;

    // 4. ユーザーをサーバーに追加（guilds.joinスコープ＋アクセストークン使用）しつつロールを付与
    const addGuildResponse = await fetch(`https://discord.com/api/guilds/${guildId}/members/${discordUserId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        access_token: access_token,
        roles: roleId ? [roleId] : [] // プレミアムロールを同時に付ける
      })
    });

    // 201 Created: 新しく参加した
    // 204 No Content: すでに参加していた（rolesの更新は試みられる）
    if (!addGuildResponse.ok && addGuildResponse.status !== 204 && addGuildResponse.status !== 201) {
      console.error("Failed to add to guild:", await addGuildResponse.text());
      // 致命的でないかもしれないのでとりあえず続行
    }

    // 5. 念のため（既に参加済み＝204だった場合など）明示的にロールを追加するAPIを叩く
    if (roleId && addGuildResponse.status === 204) {
      const addRoleResponse = await fetch(`https://discord.com/api/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bot ${botToken}`
        }
      });
      if (!addRoleResponse.ok) {
        console.error("Failed to add role explicitly:", await addRoleResponse.text());
      }
    }

    // 5.5 新規: Discord 連携済みフラグを Firestore に保存
    if (uid) {
      try {
        await adminDb.collection("users").doc(uid).update({
          discord_linked: true,
          discord_id: discordUserId, // 念のため Discord の ID も保存
          updated_at: new Date()
        });
      } catch (firestoreErr) {
        console.error("Failed to update firestore discord_linked:", firestoreErr);
      }
    }

    // 6. すべて成功！ユーザーをご自身のDiscordサーバー画面へ直接飛ばす
    if (channelId) {
      return redirect(`https://discord.com/channels/${guildId}/${channelId}`);
    } else {
      return redirect(`https://discord.com/channels/${guildId}`);
    }

  } catch (err: any) {
    console.error("Discord callback Error:", err);
    return new Response("システムエラーが発生しました", { status: 500 });
  }
};
