import type { APIRoute } from 'astro';
import { stripe } from '../../../lib/stripe';
import { adminDb } from '../../../lib/firebase/server';

export const POST: APIRoute = async ({ request }) => {
    const signature = request.headers.get('stripe-signature');
    const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
        console.error('[webhook.ts] Missing signature or secret:', { hasSignature: !!signature, hasSecret: !!webhookSecret });
        return new Response('Stripe signature or secret missing', { status: 400 });
    }

    try {
        const body = await request.text();
        const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        console.log(`[webhook.ts] Received event type: ${event.type}`);

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;

                // This is the Firebase UID we passed in checkout.ts
                const userId = session.client_reference_id;
                const customerId = session.customer as string;
                const subscriptionId = session.subscription as string;

                if (userId) {
                    console.log(`[webhook.ts] Updating Firestore for userId: ${userId}`);
                    // Update user's metadata in Firestore
                    await adminDb.collection('users').doc(userId).set({
                        stripe_customer_id: customerId,
                        stripe_subscription_id: subscriptionId,
                        stripe_status: 'active',
                        updatedAt: new Date()
                    }, { merge: true });
                    console.log(`[webhook.ts] Successfully updated Firestore for ${userId}`);
                } else {
                    console.warn(`[webhook.ts] Warning: No client_reference_id found on session obj!`);
                }
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                const customerId = subscription.customer as string;

                console.log(`[webhook.ts] Sub Updated - ID: ${subscription.id}, Customer: ${customerId}, Status: ${subscription.status}, CancelAtEnd: ${subscription.cancel_at_period_end}`);

                const usersRef = adminDb.collection('users');
                const snapshot = await usersRef.where('stripe_customer_id', '==', customerId).get();

                if (snapshot.empty) {
                    console.error(`[webhook.ts] Error: User not found in Firestore for customerId: ${customerId}`);
                    break;
                }

                if (subscription.cancel_at_period_end || subscription.status === 'canceled' || subscription.status === 'unpaid') {
                    console.log(`[webhook.ts] Revoking access for customer: ${customerId} (Reason: ${subscription.status}, CancelAtEnd: ${subscription.cancel_at_period_end})`);
                    for (const doc of snapshot.docs) {
                        await usersRef.doc(doc.id).update({
                            stripe_status: 'canceled',
                            updatedAt: new Date()
                        });
                    }
                } else if (subscription.status === 'active') {
                    console.log(`[webhook.ts] Ensuring active status for customer: ${customerId}`);
                    for (const doc of snapshot.docs) {
                        await usersRef.doc(doc.id).update({
                            stripe_status: 'active',
                            updatedAt: new Date()
                        });
                    }
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const customerId = subscription.customer as string;

                console.log(`[webhook.ts] customer.subscription.deleted! Customer: ${customerId}`);
                const usersRef = adminDb.collection('users');
                const snapshot = await usersRef.where('stripe_customer_id', '==', customerId).get();

                if (!snapshot.empty) {
                    for (const doc of snapshot.docs) {
                        await usersRef.doc(doc.id).update({
                            stripe_status: 'canceled',
                            updatedAt: new Date()
                        });
                    }
                    console.log(`[webhook.ts] Successfully marked as canceled in Firestore.`);
                }
                break;
            }
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 });
    } catch (err: any) {
        console.error('Webhook Error:', err.message);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }
};
