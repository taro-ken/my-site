import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-02-25.clover",
});

async function testCancel() {
    const subscriptions = await stripe.subscriptions.list({ limit: 1 });
    if (subscriptions.data.length === 0) {
        console.log("No subscriptions found.");
        return;
    }

    const sub = subscriptions.data[0];
    console.log("Canceling subscription", sub.id);

    // Immediately cancel the subscription
    const deletedSub = await stripe.subscriptions.cancel(sub.id);
    console.log("Deleted:", deletedSub.status);
}

testCancel().catch(console.error);
