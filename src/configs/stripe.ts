import Stripe from "stripe";
import env from "../configs/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover",
});

const success_url = "https://example.com/success";
const cancel_url = "https://example.com/success";

// Create checkout session
const createStripeSession = async ({
  priceId,
  quantity,
  successUrl,
  cancelUrl,
  metadata = {},
  applicationFeeAmount,
  transferDestination,
}: {
  priceId: string;
  quantity: number;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
  applicationFeeAmount?: number;
  transferDestination?: string;
}) => {
  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: [
      {
        price: priceId,
        quantity,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
  };

  if (applicationFeeAmount && transferDestination) {
    sessionConfig.payment_intent_data = {
      application_fee_amount: Math.round(applicationFeeAmount * 100), // Convert to cents
      transfer_data: {
        destination: transferDestination,
      },
    };
  }

  return await stripe.checkout.sessions.create(sessionConfig);
};

//
const createPaymentIntent = async ({
  name,
  amount,
  currency = "usd",
  metadata = {},
  successUrl,
  cancelUrl,
}: {
  name: string;
  amount: number;
  currency?: string;
  metadata?: Record<string, string>;
  successUrl?: string;
  cancelUrl?: string;
}) => {
  return await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency,
          unit_amount: amount,
          product_data: { name },
        },
        quantity: 1,
      },
    ],
    success_url: successUrl || `${env.FRONTEND_URL}/appointment/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl || `${env.FRONTEND_URL}/appointment/payment/cancel`,
    metadata,
  });
};

// Verify Stripe webhook
const verifyWebhook = (req: any, signature: string) => {
  return stripe.webhooks.constructEvent(
    req.body,
    signature,
    env.STRIPE_WEBHOOK_SECRET
  );
};

// Fetch Payment Intent
const getPaymentIntent = async (paymentIntentId: string) => {
  return await stripe.paymentIntents.retrieve(paymentIntentId);
};

// Issue refund
const refundPayment = async (paymentIntentId: string) => {
  return await stripe.refunds.create({
    payment_intent: paymentIntentId,
  });
};

// Transfer teacher earnings (if using Stripe Connect)
const transferToTeacher = async (
  teacherStripeAccountId: string,
  amount: number
) => {
  return await stripe.transfers.create({
    amount,
    currency: "usd",
    destination: teacherStripeAccountId,
  });
};

const createAccountForTeacher = async ({
  country,
  email,
}: {
  country: string;
  email: string;
}) => {
  return await stripe.accounts.create({
    email,
    type: "express",
    country,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    settings: {
      payouts: {
        schedule: {
          interval: "manual",
        },
      },
    },
  });
};

const createOnboardingLink = async (teacherStripeAccountId: string) => {
  return await stripe.accountLinks.create({
    account: teacherStripeAccountId,
    refresh_url: `${env.FRONTEND_URL}/teacher/wallet`,
    return_url: `${env.FRONTEND_URL}/teacher/wallet?stripe_connect=success`,
    type: "account_onboarding",
  });
};

export default {
  stripe,
  createStripeSession,
  verifyWebhook,
  refundPayment,
  getPaymentIntent,
  transferToTeacher,
  createAccountForTeacher,
  createOnboardingLink,
  createPaymentIntent,
};
