import Stripe from "stripe";
import {
  getIntegrationConfig,
  handleApiError,
  retryWithBackoff,
} from "../integration.helper";
import { IntegrationType } from "../../../../generated/prisma/client";
import ApiError from "../../../utils/ApiError";
import httpStatus from "http-status";

const INTEGRATION_TYPE = IntegrationType.stripe;

/**
 * Get Stripe client for a clinic
 */
const getStripeClient = async (clinicId: string): Promise<Stripe> => {
  const config = await getIntegrationConfig(clinicId, INTEGRATION_TYPE);

  if (!config.secretKey) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Stripe secret key not configured"
    );
  }

  return new Stripe(config.secretKey, {
    apiVersion: "2025-12-15.clover",
  });
};

/**
 * Create payment link for appointment
 */
const createPaymentLink = async (
  clinicId: string,
  data: {
    amount: number;
    currency?: string;
    description: string;
    metadata?: Record<string, string>;
  }
): Promise<{ url: string; id: string }> => {
  try {
    const stripe = await getStripeClient(clinicId);

    const paymentLink = await retryWithBackoff(() =>
      stripe.paymentLinks.create({
        line_items: [
          {
            price_data: {
              currency: data.currency || "usd",
              product_data: {
                name: data.description,
              },
              unit_amount: Math.round(data.amount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        metadata: data.metadata,
        after_completion: {
          type: "redirect",
          redirect: {
            url: `${process.env.FRONTEND_URL}/appointments/payment-success`,
          },
        },
      })
    );

    return {
      url: paymentLink.url,
      id: paymentLink.id,
    };
  } catch (error: any) {
    handleApiError(error, "Stripe");
    return {
      url: "",
      id: "",
    };
  }
};

/**
 * Create checkout session
 */
const createCheckoutSession = async (
  clinicId: string,
  data: {
    amount: number;
    currency?: string;
    description: string;
    customerEmail?: string;
    metadata?: Record<string, string>;
    successUrl?: string;
    cancelUrl?: string;
  }
): Promise<{ sessionId: string; url: string }> => {
  try {
    const stripe = await getStripeClient(clinicId);

    const session = await retryWithBackoff(() =>
      stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: data.currency || "usd",
              product_data: {
                name: data.description,
              },
              unit_amount: Math.round(data.amount * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        customer_email: data.customerEmail,
        metadata: data.metadata,
        success_url:
          data.successUrl ||
          `${process.env.FRONTEND_URL}/appointments/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:
          data.cancelUrl ||
          `${process.env.FRONTEND_URL}/appointments/payment-cancelled`,
      })
    );

    return {
      sessionId: session.id,
      url: session.url || "",
    };
  } catch (error: any) {
    handleApiError(error, "Stripe");
    return {
      sessionId: "",
      url: "",
    };
  }
};

/**
 * Get payment intent status
 */
const getPaymentStatus = async (
  clinicId: string,
  paymentIntentId: string
): Promise<{
  status: string;
  amount: number;
  currency: string;
  metadata: Record<string, string>;
}> => {
  try {
    const stripe = await getStripeClient(clinicId);

    const paymentIntent = await retryWithBackoff(() =>
      stripe.paymentIntents.retrieve(paymentIntentId)
    );

    return {
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata as Record<string, string>,
    };
  } catch (error: any) {
    handleApiError(error, "Stripe");
    return {
      status: "",
      amount: 0,
      currency: "",
      metadata: {},
    };
  }
};

/**
 * Get checkout session
 */
const getCheckoutSession = async (
  clinicId: string,
  sessionId: string
): Promise<any> => {
  try {
    const stripe = await getStripeClient(clinicId);

    const session = await retryWithBackoff(() =>
      stripe.checkout.sessions.retrieve(sessionId)
    );

    return {
      id: session.id,
      status: session.status,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency,
      customerEmail: session.customer_email,
      metadata: session.metadata,
    };
  } catch (error: any) {
    handleApiError(error, "Stripe");
    return {
      id: "",
      status: "",
      paymentStatus: "",
      amountTotal: 0,
      currency: "",
      customerEmail: "",
      metadata: {},
    };
  }
};

/**
 * Process refund
 */
const processRefund = async (
  clinicId: string,
  paymentIntentId: string,
  amount?: number
): Promise<{ refundId: string; status: string }> => {
  try {
    const stripe = await getStripeClient(clinicId);

    const refund = await retryWithBackoff(() =>
      stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
      })
    );

    return {
      refundId: refund.id,
      status: refund.status as string,
    };
  } catch (error: any) {
    handleApiError(error, "Stripe");
    return {
      refundId: "",
      status: "",
    };
  }
};

/**
 * Create customer
 */
const createCustomer = async (
  clinicId: string,
  data: {
    email: string;
    name?: string;
    phone?: string;
    metadata?: Record<string, string>;
  }
): Promise<{ customerId: string }> => {
  try {
    const stripe = await getStripeClient(clinicId);

    const customer = await retryWithBackoff(() =>
      stripe.customers.create({
        email: data.email,
        name: data.name,
        phone: data.phone,
        metadata: data.metadata,
      })
    );

    return {
      customerId: customer.id,
    };
  } catch (error: any) {
    handleApiError(error, "Stripe");
    return {
      customerId: "",
    };
  }
};

/**
 * Verify webhook signature
 */
const verifyWebhookSignature = (
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event => {
  try {
    return Stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error: any) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Webhook signature verification failed: ${error.message}`
    );
  }
};

export default {
  createPaymentLink,
  createCheckoutSession,
  getPaymentStatus,
  getCheckoutSession,
  processRefund,
  createCustomer,
  verifyWebhookSignature,
};
