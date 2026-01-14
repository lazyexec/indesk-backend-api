import Stripe from "stripe";
import prisma from "../../configs/prisma";
import logger from "../../utils/logger";
import appointmentService from "../appointment/appointment.service";
import invoiceService from "../invoice/invoice.service";
import subscriptionService from "../subscription/subscription.service";
import env from "../../configs/env";
import ApiError from "../../utils/ApiError";
import httpStatus from "http-status";
import { SubscriptionStatus } from "../../../generated/prisma/client";

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

const processWebHookStripe = async (event: any) => {
  switch (event.type) {
    // Existing appointment payment webhooks
    case "checkout.session.completed": {
      const session = event.data.object;
      const appointmentId = session.metadata?.appointmentId;

      if (appointmentId) {
        try {
          await paymentStateApply(appointmentId, "scheduled");
          logger.info(`Appointment ${appointmentId} marked as paid`);
        } catch (error: any) {
          logger.error(
            `Failed to update appointment payment: ${error.message}`
          );
        }
      }
      break;
    }
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object;
      const appointmentId = paymentIntent.metadata?.appointmentId;

      if (appointmentId) {
        try {
          await paymentStateApply(appointmentId, "scheduled");
          logger.info(`Appointment ${appointmentId} marked as paid`);
        } catch (error: any) {
          logger.error(
            `Failed to update appointment payment: ${error.message}`
          );
        }
      }
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object;
      const appointmentId = charge.metadata?.appointmentId;

      if (appointmentId) {
        try {
          await paymentStateApply(appointmentId, "cancelled");
          logger.info(`Appointment ${appointmentId} marked as cancelled`);
        } catch (error: any) {
          logger.error(`Failed to update appointment refund: ${error.message}`);
        }
      }
      break;
    }
    case "checkout.session.async_payment_failed":
    case "payment_intent.payment_failed": {
      const payment = event.data.object;
      const appointmentId = payment.metadata?.appointmentId;

      if (appointmentId) {
        try {
          await paymentStateApply(appointmentId, "failed");
          logger.info(`Appointment ${appointmentId} marked as failed`);
        } catch (error: any) {
          logger.error(
            `Failed to update appointment payment status: ${error.message}`
          );
        }
      }
      break;
    }
    
    // New subscription webhooks
    case "customer.subscription.created": {
      const subscription = event.data.object;
      await handleSubscriptionCreated(subscription);
      break;
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object;
      await handleSubscriptionUpdated(subscription);
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      await handleSubscriptionDeleted(subscription);
      break;
    }
    case "invoice.payment_succeeded": {
      const invoice = event.data.object;
      await handleInvoicePaymentSucceeded(invoice);
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      await handleInvoicePaymentFailed(invoice);
      break;
    }
  }
};

const paymentStateApply = async (appointmentId: string, state: string) => {
  try {
    await appointmentService.updateAppointmentStatus(appointmentId, state);
    logger.info(`Appointment ${appointmentId} marked as paid`);
  } catch (error: any) {
    logger.error(`Failed to update appointment payment: ${error.message}`);
  }
  if (state === "scheduled")
    await invoiceService.createSuccessInvoice(appointmentId);
};

// Subscription webhook handlers
const handleSubscriptionCreated = async (subscription: any) => {
  try {
    const clinicId = subscription.metadata?.clinicId;
    
    if (!clinicId) {
      logger.error('No clinicId in subscription metadata');
      return;
    }

    // Update local subscription with Stripe data
    await subscriptionService.updateSubscriptionByClinicId(clinicId, {
      stripeSubscriptionId: subscription.id,
      status: subscription.status === 'trialing' ? SubscriptionStatus.trialing : SubscriptionStatus.active,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : undefined,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
    });

    logger.info(`✅ Subscription created for clinic ${clinicId}`);
  } catch (error: any) {
    logger.error('Failed to handle subscription created:', error);
  }
};

const handleSubscriptionUpdated = async (subscription: any) => {
  try {
    await syncSubscriptionFromStripe(subscription.id);
    logger.info(`✅ Subscription updated for ${subscription.id}`);
  } catch (error: any) {
    logger.error('Failed to handle subscription updated:', error);
  }
};

const handleSubscriptionDeleted = async (subscription: any) => {
  try {
    const clinicId = subscription.metadata?.clinicId;
    
    if (!clinicId) {
      logger.error('No clinicId in subscription metadata');
      return;
    }

    // Update local subscription status
    await subscriptionService.updateSubscriptionByClinicId(clinicId, {
      status: SubscriptionStatus.cancelled,
      cancelledAt: new Date(),
    });

    logger.info(`✅ Subscription cancelled for clinic ${clinicId}`);
  } catch (error: any) {
    logger.error('Failed to handle subscription deleted:', error);
  }
};

const handleInvoicePaymentSucceeded = async (invoice: any) => {
  try {
    if (invoice.subscription && typeof invoice.subscription === 'string') {
      const subscription = await getSubscription(invoice.subscription);
      await syncSubscriptionFromStripe(subscription.id);
      logger.info(`✅ Payment succeeded for subscription ${subscription.id}`);
    }
  } catch (error: any) {
    logger.error('Failed to handle invoice payment succeeded:', error);
  }
};

const handleInvoicePaymentFailed = async (invoice: any) => {
  try {
    if (invoice.subscription && typeof invoice.subscription === 'string') {
      const subscription = await getSubscription(invoice.subscription);
      const clinicId = subscription.metadata?.clinicId;
      
      if (clinicId) {
        // Update subscription status to past_due
        await subscriptionService.updateSubscriptionByClinicId(clinicId, {
          status: SubscriptionStatus.past_due,
        });
        
        logger.info(`⚠️ Payment failed for subscription ${subscription.id}, marked as past_due`);
      }
    }
  } catch (error: any) {
    logger.error('Failed to handle invoice payment failed:', error);
  }
};

// Stripe API functions for subscription management
const createCustomer = async (data: {
  email: string;
  name: string;
  clinicId: string;
}) => {
  try {
    const customer = await stripe.customers.create({
      email: data.email,
      name: data.name,
      metadata: {
        clinicId: data.clinicId,
      },
    });

    return customer;
  } catch (error) {
    logger.error('Stripe customer creation failed:', error);
    throw new ApiError(httpStatus.BAD_REQUEST, "Failed to create Stripe customer");
  }
};

const createSubscription = async (data: {
  customerId: string;
  priceId: string;
  clinicId: string;
  trialPeriodDays?: number;
}) => {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: data.customerId,
      items: [{ price: data.priceId }],
      trial_period_days: data.trialPeriodDays,
      metadata: {
        clinicId: data.clinicId,
      },
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    return subscription;
  } catch (error) {
    logger.error('Stripe subscription creation failed:', error);
    throw new ApiError(httpStatus.BAD_REQUEST, "Failed to create Stripe subscription");
  }
};

const cancelSubscription = async (subscriptionId: string) => {
  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId);
    return subscription;
  } catch (error) {
    logger.error('Stripe subscription cancellation failed:', error);
    throw new ApiError(httpStatus.BAD_REQUEST, "Failed to cancel Stripe subscription");
  }
};

const getSubscription = async (subscriptionId: string) => {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    logger.error('Stripe subscription retrieval failed:', error);
    throw new ApiError(httpStatus.NOT_FOUND, "Stripe subscription not found");
  }
};

const syncSubscriptionFromStripe = async (stripeSubscriptionId: string) => {
  try {
    const stripeSubscription: any = await getSubscription(stripeSubscriptionId);
    
    // Find local subscription
    const localSubscription = await subscriptionService.getSubscriptionByClinicId(
      stripeSubscription.metadata?.clinicId
    );

    // Map Stripe status to local status
    let status: SubscriptionStatus;
    switch (stripeSubscription.status) {
      case 'active':
        status = SubscriptionStatus.active;
        break;
      case 'trialing':
        status = SubscriptionStatus.trialing;
        break;
      case 'past_due':
        status = SubscriptionStatus.past_due;
        break;
      case 'canceled':
      case 'unpaid':
        status = SubscriptionStatus.cancelled;
        break;
      default:
        status = SubscriptionStatus.inactive;
    }

    // Update local subscription
    return await subscriptionService.updateSubscription(localSubscription.id, {
      status,
      stripeSubscriptionId: stripeSubscription.id,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      trialStart: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : undefined,
      trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : undefined,
      cancelledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : undefined,
    });
  } catch (error) {
    logger.error('Failed to sync subscription from Stripe:', error);
    throw error;
  }
};

const createPaymentIntent = async (data: {
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
  customerId?: string;
}) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: data.amount,
      currency: data.currency,
      metadata: data.metadata || {},
      customer: data.customerId,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return paymentIntent;
  } catch (error) {
    logger.error('Stripe payment intent creation failed:', error);
    throw new ApiError(httpStatus.BAD_REQUEST, "Failed to create payment intent");
  }
};

const retrievePaymentIntent = async (paymentIntentId: string) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    logger.error('Stripe payment intent retrieval failed:', error);
    throw new ApiError(httpStatus.NOT_FOUND, "Payment intent not found");
  }
};

const confirmPaymentIntent = async (paymentIntentId: string, paymentMethodId?: string) => {
  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId,
    });
    return paymentIntent;
  } catch (error) {
    logger.error('Stripe payment intent confirmation failed:', error);
    throw new ApiError(httpStatus.BAD_REQUEST, "Failed to confirm payment intent");
  }
};

export default {
  processWebHookStripe,
  createCustomer,
  createSubscription,
  cancelSubscription,
  getSubscription,
  syncSubscriptionFromStripe,
  createPaymentIntent,
  retrievePaymentIntent,
  confirmPaymentIntent,
};
