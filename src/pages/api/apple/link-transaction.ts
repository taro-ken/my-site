import type { APIRoute } from "astro";
import { adminAuth, adminDb } from "../../../lib/firebase/server";
import { verifyAppleTransaction } from "../../../lib/apple";

const MEMBERSHIP_PRODUCT_ID = "com.kk.essence.membership.monthly";

/**
 * ネイティブアプリ(Essence)向け: StoreKitで購入が完了した直後に、
 * 署名付きトランザクション(Transaction.jwsRepresentation)をAppleの公開鍵で検証し、
 * 問題なければFirestoreのapple_statusを更新する。Webhook(notifications.ts)到着を
 * 待たずにその場で会員状態を反映するための即時経路。
 */
export const POST: APIRoute = async ({ request }) => {
    const authHeader = request.headers.get("Authorization");
    const idToken = authHeader?.split("Bearer ")[1];

    if (!idToken) {
        return json({ error: "No token provided" }, 401);
    }

    let uid: string;
    try {
        uid = (await adminAuth.verifyIdToken(idToken)).uid;
    } catch {
        return json({ error: "Invalid token" }, 401);
    }

    let body: { jws?: string };
    try {
        body = await request.json();
    } catch {
        return json({ error: "Invalid JSON" }, 400);
    }

    if (!body.jws) {
        return json({ error: "Missing jws" }, 400);
    }

    try {
        const transaction = await verifyAppleTransaction(body.jws);

        if (transaction.productId !== MEMBERSHIP_PRODUCT_ID) {
            return json({ error: "Unexpected product" }, 400);
        }

        const isRevoked = !!transaction.revocationDate;
        const isExpired = typeof transaction.expiresDate === "number" && transaction.expiresDate < Date.now();
        const status = isRevoked || isExpired ? "canceled" : "active";

        await adminDb.collection("users").doc(uid).set(
            {
                apple_status: status,
                apple_original_transaction_id: transaction.originalTransactionId,
                apple_product_id: transaction.productId,
                apple_expires_date: transaction.expiresDate ? new Date(transaction.expiresDate) : null,
                updatedAt: new Date(),
            },
            { merge: true }
        );

        return json({ status }, 200);
    } catch (err: any) {
        console.error("[apple/link-transaction] Verification error:", err);
        return json({ error: "Failed to verify transaction" }, 400);
    }
};

function json(body: unknown, status: number) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}
