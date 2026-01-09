import stripe from "../../configs/stripe";
import logger from "../../utils/logger";
import env from "../../configs/env";
import appointmentService from "../appointment/appointment.service";

/**
 * Create payment session for appointment
 * @param {string} appointmentId
 * @param {string} paymentToken
 * @returns {Promise<any>}
 */
const createAppointmentPaymentSession = async (
  appointmentId: string,
  paymentToken: string
) => {
  // Get appointment to verify token and get amount
  const appointment = await appointmentService.getAppointmentByToken(
    paymentToken
  );

  if (appointment.id !== appointmentId) {
    throw new Error("Appointment ID does not match token");
  }

  if (appointment.paymentStatus === "paid") {
    throw new Error("Appointment is already paid");
  }

  if (!appointment.session.price || appointment.session.price <= 0) {
    throw new Error("Appointment has no payment amount");
  }

  // Create Stripe checkout session
  const session = await stripe.createPaymentIntent({
    name: `Appointment: ${appointment.session.name}`,
    amount: Math.round(appointment.session.price * 100), // Convert to cents
    currency: "usd",
    metadata: {
      appointmentId: appointment.id,
      clientId: appointment.clientId,
      clinicId: appointment.clinicId,
      sessionId: appointment.sessionId,
    },
  });

  // Update appointment with Stripe session ID
  await appointmentService.updateAppointmentStripeSession(
    appointment.id,
    session.id
  );

  return {
    sessionId: session.id,
    url: session.url,
    appointmentId: appointment.id,
    amount: appointment.session.price,
  };
};

/**
 * Process Stripe webhook events
 * @param {any} event
 */
const processWebHookStripe = async (event: any) => {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const appointmentId = session.metadata?.appointmentId;

      if (appointmentId) {
        try {
          await appointmentService.updateAppointmentPayment(
            appointmentId,
            "paid",
            session.id
          );
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
          await appointmentService.updateAppointmentPayment(
            appointmentId,
            "paid"
          );
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
          await appointmentService.updateAppointmentPayment(
            appointmentId,
            "refunded"
          );
          logger.info(`Appointment ${appointmentId} marked as refunded`);
        } catch (error: any) {
          logger.error(
            `Failed to update appointment refund: ${error.message}`
          );
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
          await appointmentService.updateAppointmentPayment(
            appointmentId,
            "failed"
          );
          logger.info(`Appointment ${appointmentId} payment failed`);
        } catch (error: any) {
          logger.error(
            `Failed to update appointment payment status: ${error.message}`
          );
        }
      }
      break;
    }
  }
};

export default {
  processWebHookStripe,
  createAppointmentPaymentSession,
};
