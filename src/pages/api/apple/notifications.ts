import type { APIRoute } from "astro";
import { adminDb } from "../../../lib/firebase/server";
import { verifyAppleNotification, verifyAppleTransaction } from "../../../lib/apple";

/**
 * Apple App Store Server Notifications V2の受信口。
 * サブスクの更新・期限切れ・返金などが起きるたびにAppleからサーバー間で届く。
 * このURLをApp Store Connect > App情報 > App Store Server通知 に設定する。
 * (本番URL・Sandbox URLをそれぞれ設定可能。このエンドポイントは両方を受け付ける)
 */
export const POST: APIRoute = async ({ request }) => {
    let body: { signedPayload?: string };
    try {
        body = await request.json();
    } catch {
        return new Response("Invalid JSON", { status: 400 });
    }

    if (!body.signedPayload) {
        return new Response("Missing signedPayload", { status: 400 });
    }

    try {
        const notification = await verifyAppleNotification(body.signedPayload);

        // TEST通知(App Store Connectの「テスト通知を送信」)には取引情報が無いので、受信確認のみ返す。
        if (notification.notificationType === "TEST" || !notification.data?.signedTransactionInfo) {
            return new Response(JSON.stringify({ received: true }), { status: 200 });
        }

        const transaction = await verifyAppleTransaction(notification.data.signedTransactionInfo);
        const originalTransactionId = transaction.originalTransactionId;
        if (!originalTransactionId) {
            return new Response(JSON.stringify({ received: true }), { status: 200 });
        }

        const usersRef = adminDb.collection("users");
        const snapshot = await usersRef.where("apple_original_transaction_id", "==", originalTransactionId).get();

        if (snapshot.empty) {
            console.warn(`[apple/notifications] No user found for originalTransactionId=${originalTransactionId}`);
            return new Response(JSON.stringify({ received: true }), { status: 200 });
        }

        const isRevoked = !!transaction.revocationDate;
        const isExpired = typeof transaction.expiresDate === "number" && transaction.expiresDate < Date.now();
        const status = isRevoked || isExpired ? "canceled" : "active";

        for (const doc of snapshot.docs) {
            await usersRef.doc(doc.id).update({
                apple_status: status,
                apple_expires_date: transaction.expiresDate ? new Date(transaction.expiresDate) : null,
                updatedAt: new Date(),
            });
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 });
    } catch (err: any) {
        console.error("[apple/notifications] Verification error:", err);
        // 検証に失敗したリクエストはApple以外からの可能性があるため200は返さず拒否する。
        return new Response("Verification failed", { status: 400 });
    }
};
