import stripeConfig from "../../configs/stripe";
import prisma from "../../configs/prisma";
import logger from "../../utils/logger";
import appointmentService from "../appointment/appointment.service";
import invoiceService from "../invoice/invoice.service";
import subscriptionService from "../subscription/subscription.service";
import transactionService from "../transaction/transaction.service";
import ApiError from "../../utils/ApiError";
import httpStatus from "http-status";
import { SubscriptionStatus } from "../../../generated/prisma/client";

const processWebHookStripe = async (event: any) => {
  switch (event.type) {
    // Checkout session completed - handle clinic purchase
    case "checkout.session.completed": {
      const session = event.data.object;

      // Check if this is a clinic purchase
      if (session.metadata?.purchaseType === "clinic_subscription") {
        const { userId, clinicId, planId } = session.metadata;

        try {
          // Get plan details for transaction
          const plan = await prisma.plan.findUnique({
            where: { id: planId },
          });

          // Create transaction record
          await transactionService.createTransaction({
            clinicId,
            userId,
            transactionId: session.id,
            amount: session.amount_total ? session.amount_total / 100 : 0, // Convert from cents
            type: "clinic_purchase",
            method: "stripe",
            status: "completed",
            description: `Clinic plan purchase: ${plan?.name || "Unknown Plan"}`,
            meta: {
              planId,
              planName: plan?.name,
              planType: plan?.type,
              stripeSessionId: session.id,
              stripeSubscriptionId: session.subscription,
              stripeCustomerId: session.customer,
              paymentStatus: session.payment_status,
            },
          });

          // Activate the clinic
          await prisma.clinic.update({
            where: { id: clinicId },
            data: {
              isActive: true,
              activatedAt: new Date(),
            },
          });

          // Create subscription record
          await subscriptionService.createSubscription({
            clinicId,
            planId,
            status: "active",
            stripeSubscriptionId: session.subscription as string,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          });

          // Add user as clinic owner in clinic members
          await prisma.clinicMember.create({
            data: {
              userId,
              clinicId,
              role: "superAdmin",
              availability: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
              specialization: [],
            },
          });

          logger.info(`✅ Clinic ${clinicId} activated successfully via checkout`);
        } catch (error: any) {
          logger.error(`Failed to activate clinic ${clinicId}:`, error);

          // Create failed transaction record
          try {
            await transactionService.createTransaction({
              clinicId,
              userId,
              transactionId: session.id,
              amount: session.amount_total ? session.amount_total / 100 : 0,
              type: "clinic_purchase",
              method: "stripe",
              status: "failed",
              description: `Failed clinic plan purchase`,
              meta: {
                error: error.message,
                stripeSessionId: session.id,
              },
            });
          } catch (txError) {
            logger.error("Failed to create failed transaction record:", txError);
          }
        }
      }

      // Handle appointment payments
      const appointmentId = session.metadata?.appointmentId;
      const appointmentToken = session.metadata?.appointmentToken;

      if (appointmentId) {
        try {
          await paymentStateApply(appointmentId, "scheduled");
          logger.info(`Appointment ${appointmentId} marked as paid`);
        } catch (error: any) {
          logger.error(
            `Failed to update appointment payment: ${error.message}`
          );
        }
      } else if (appointmentToken) {
        try {
          // Find appointment by token
          const appointment = await prisma.appointment.findFirst({
            where: { appointmentToken },
          });

          if (appointment) {
            await paymentStateApply(appointment.id, "scheduled");
            logger.info(`Appointment ${appointment.id} marked as paid via token`);
          } else {
            logger.error(`Appointment not found for token: ${appointmentToken}`);
          }
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

      // Handle appointment payments
      const appointmentId = paymentIntent.metadata?.appointmentId;
      const appointmentToken = paymentIntent.metadata?.appointmentToken;

      if (appointmentId) {
        try {
          await paymentStateApply(appointmentId, "scheduled");
          logger.info(`Appointment ${appointmentId} marked as paid`);
        } catch (error: any) {
          logger.error(
            `Failed to update appointment payment: ${error.message}`
          );
        }
      } else if (appointmentToken) {
        try {
          // Find appointment by token
          const appointment = await prisma.appointment.findFirst({
            where: { appointmentToken },
          });

          if (appointment) {
            await paymentStateApply(appointment.id, "scheduled");
            logger.info(`Appointment ${appointment.id} marked as paid via token`);
          } else {
            logger.error(`Appointment not found for token: ${appointmentToken}`);
          }
        } catch (error: any) {
          logger.error(
            `Failed to update appointment payment: ${error.message}`
          );
        }
      }

      // Handle invoice payments
      const invoiceId = paymentIntent.metadata?.invoiceId;
      if (invoiceId && paymentIntent.metadata?.type === "invoice_payment") {
        try {
          await invoiceService.processInvoicePayment(invoiceId, paymentIntent.id);
          logger.info(`Invoice ${invoiceId} marked as paid via payment intent`);
        } catch (error: any) {
          logger.error(
            `Failed to update invoice payment: ${error.message}`
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

      // Handle appointment payment failures
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

      // Handle invoice payment failures
      const invoiceId = payment.metadata?.invoiceId;
      if (invoiceId && payment.metadata?.type === "invoice_payment") {
        try {
          // Create failed transaction record
          await transactionService.createTransaction({
            clinicId: payment.metadata.clinicId,
            clientId: payment.metadata.clientId,
            transactionId: payment.id,
            amount: payment.amount ? payment.amount / 100 : 0,
            type: "invoice_payment",
            method: "stripe",
            status: "failed",
            description: `Failed invoice payment`,
            meta: {
              invoiceId,
              paymentIntentId: payment.id,
              error: payment.last_payment_error?.message || "Payment failed",
            },
          });
          logger.info(`Invoice ${invoiceId} payment failed`);
        } catch (error: any) {
          logger.error(
            `Failed to record invoice payment failure: ${error.message}`
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

      // Create transaction record for subscription renewal
      const clinicId = subscription.metadata?.clinicId;
      if (clinicId) {
        const localSubscription = await subscriptionService.getSubscriptionByClinicId(clinicId);

        await transactionService.createTransaction({
          clinicId,
          userId: subscription.metadata?.userId,
          transactionId: invoice.id,
          amount: invoice.amount_paid ? invoice.amount_paid / 100 : 0,
          type: "subscription_renewal",
          method: "stripe",
          status: "completed",
          description: `Subscription renewal payment`,
          meta: {
            planId: localSubscription.planId,
            stripeInvoiceId: invoice.id,
            stripeSubscriptionId: subscription.id,
            billingReason: invoice.billing_reason,
            periodStart: new Date(invoice.period_start * 1000),
            periodEnd: new Date(invoice.period_end * 1000),
          },
        });
      }

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
        // Create failed transaction record
        const localSubscription = await subscriptionService.getSubscriptionByClinicId(clinicId);

        await transactionService.createTransaction({
          clinicId,
          userId: subscription.metadata?.userId,
          transactionId: invoice.id,
          amount: invoice.amount_due ? invoice.amount_due / 100 : 0,
          type: "subscription_renewal",
          method: "stripe",
          status: "failed",
          description: `Failed subscription renewal payment`,
          meta: {
            planId: localSubscription.planId,
            stripeInvoiceId: invoice.id,
            stripeSubscriptionId: subscription.id,
            billingReason: invoice.billing_reason,
            failureMessage: invoice.last_payment_error?.message,
          },
        });

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
    const customer = await stripeConfig.createCustomer({
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
    const subscription = await stripeConfig.createSubscription({
      customerId: data.customerId,
      priceId: data.priceId,
      trialPeriodDays: data.trialPeriodDays,
      metadata: {
        clinicId: data.clinicId,
      },
    });

    return subscription;
  } catch (error) {
    logger.error('Stripe subscription creation failed:', error);
    throw new ApiError(httpStatus.BAD_REQUEST, "Failed to create Stripe subscription");
  }
};

const cancelSubscription = async (subscriptionId: string) => {
  try {
    const subscription = await stripeConfig.cancelSubscription(subscriptionId);
    return subscription;
  } catch (error) {
    logger.error('Stripe subscription cancellation failed:', error);
    throw new ApiError(httpStatus.BAD_REQUEST, "Failed to cancel Stripe subscription");
  }
};

const getSubscription = async (subscriptionId: string) => {
  try {
    const subscription = await stripeConfig.getSubscription(subscriptionId);
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
    const paymentIntent = await stripeConfig.createPaymentIntent({
      amount: data.amount,
      currency: data.currency,
      metadata: data.metadata,
      customerId: data.customerId,
    });

    return paymentIntent;
  } catch (error) {
    logger.error('Stripe payment intent creation failed:', error);
    throw new ApiError(httpStatus.BAD_REQUEST, "Failed to create payment intent");
  }
};

const retrievePaymentIntent = async (paymentIntentId: string) => {
  try {
    const paymentIntent = await stripeConfig.getPaymentIntent(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    logger.error('Stripe payment intent retrieval failed:', error);
    throw new ApiError(httpStatus.NOT_FOUND, "Payment intent not found");
  }
};

const confirmPaymentIntent = async (paymentIntentId: string, paymentMethodId?: string) => {
  try {
    const paymentIntent = await stripeConfig.confirmPaymentIntent(paymentIntentId, paymentMethodId);
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
