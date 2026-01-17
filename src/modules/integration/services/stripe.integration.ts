import Stripe from "stripe";
import {
  handleApiError,
  retryWithBackoff,
} from "../integration.helper";
import { IntegrationType } from "../../../../generated/prisma/client";
import ApiError from "../../../utils/ApiError";
import httpStatus from "http-status";
import env from "../../../configs/env";
import prisma from "../../../configs/prisma";
import stripe from "../../../configs/stripe";
import logger from "../../../utils/logger";

const INTEGRATION_TYPE = IntegrationType.stripe;

/**
 * Get connected account ID for a clinic
 */
const getConnectedAccountId = async (clinicId: string): Promise<string | null> => {
  const integration = await prisma.integration.findFirst({
    where: {
      clinicId,
      type: INTEGRATION_TYPE,
      status: "connected",
    },
  });

  logger.info("Integration >>> ",integration)

  // accountId is stored in the config JSON field
  const config = integration?.config as any;
  return config?.stripeUserId || null;
};

/**
 * Create payment link for appointment using Stripe Connect
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
    // Get the clinic's connected Stripe account
    const accountId = await getConnectedAccountId(clinicId);

    if (!accountId) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Clinic has not connected Stripe account"
      );
    }
    const paymentLink = await retryWithBackoff(() =>
      stripe.stripe.paymentLinks.create(
        {
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
              url: `${env.FRONTEND_URL}/appointments/payment-success`,
            },
          },
        },
        {
          stripeAccount: accountId, // Use connected account
        }
      )
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
 * Create checkout session using Stripe Connect
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
    // Get the clinic's connected Stripe account
    const accountId = await getConnectedAccountId(clinicId);

    console.log("clinic account id" , accountId)
    if (!accountId) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Clinic has not connected Stripe account"
      );
    }

    const session = await retryWithBackoff(() =>
      stripe.stripe.checkout.sessions.create(
        {
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
            `${env.FRONTEND_URL}/appointments/payment-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url:
            data.cancelUrl ||
            `${env.FRONTEND_URL}/appointments/payment-cancelled`,
        },
        {
          stripeAccount: accountId, // Use connected account
        }
      )
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
    const accountId = await getConnectedAccountId(clinicId);

    const paymentIntent = await retryWithBackoff(() =>
      accountId
        ? stripe.stripe.paymentIntents.retrieve(paymentIntentId, {
          stripeAccount: accountId,
        })
        : stripe.stripe.paymentIntents.retrieve(paymentIntentId)
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
    const accountId = await getConnectedAccountId(clinicId);
    const session = await retryWithBackoff(() =>
      accountId
        ? stripe.stripe.checkout.sessions.retrieve(sessionId, {
          stripeAccount: accountId,
        })
        : stripe.stripe.checkout.sessions.retrieve(sessionId)
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
    const accountId = await getConnectedAccountId(clinicId);
    const refund = await retryWithBackoff(() =>
      accountId
        ? stripe.stripe.refunds.create(
          {
            payment_intent: paymentIntentId,
            amount: amount ? Math.round(amount * 100) : undefined,
          },
          {
            stripeAccount: accountId,
          }
        )
        : stripe.stripe.refunds.create({
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
    const accountId = await getConnectedAccountId(clinicId);
    const customer = await retryWithBackoff(() =>
      accountId
        ? stripe.stripe.customers.create(
          {
            email: data.email,
            name: data.name,
            phone: data.phone,
            metadata: data.metadata,
          },
          {
            stripeAccount: accountId,
          }
        )
        : stripe.stripe.customers.create({
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


export default {
  createPaymentLink,
  createCheckoutSession,
  getPaymentStatus,
  getCheckoutSession,
  processRefund,
  createCustomer,
};
