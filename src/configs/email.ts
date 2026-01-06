import env from "./env";
import logger from "../utils/logger";
import nodemailer from "nodemailer";
import ApiError from "../utils/ApiError";
import httpStatus from "http-status";

// Create a test account or replace with real credentials.
const transporter = nodemailer.createTransport(env.email.provider);
transporter
  .verify()
  .then(() => {
    logger.info("SMTP transporter is Ready for Usage!");
  })
  .catch((err) => {
    logger.error("SMTP transporter failed to connect with error:", err);
  });

const sendMail = async (options: nodemailer.SendMailOptions) => {
  try {
    await transporter.sendMail({
      from: env.email.from,
      ...options,
    });
  } catch (error: any) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.message);
  }
};

const sendRegistrationEmail = async (to: string, token: string) => {
  logger.info(`Sending registration email to ${to} with token ${token}`);
  await sendMail({
    to,
    subject: "Registration Confirmation",
    text: `Please confirm your registration using this token: ${token}`,
  });
  // Implementation for sending registration email
};

const sendResetPasswordEmail = async (to: string, token: string) => {
  await sendMail({
    to,
    subject: "Reset Password",
    text: `Please Recover your account using this code: ${token}`,
  });
  // Implementation for sending reset password email
  logger.info(`Sending reset password email to ${to} with token ${token}`);
};

const sendRestrictionEmail = async (to: string, reason: string) => {
  await sendMail({
    to,
    subject: "Account Restriction",
    text: `Your account has been restricted. Reason: ${reason}. Consider to contact support for assistance.`,
  });
  logger.info(`Sending restriction email to ${to}`);
};

const sendUnrestrictedEmail = async (to: string) => {
  await sendMail({
    to,
    subject: "Account Unrestricted",
    text: `Your account has been unrestricted. Enjoy your stay!`,
  });
  logger.info(`Sending unrestricted email to ${to}`);
};

const sendWelcomeEmail = async (to: string, token: string) => {
  await sendMail({
    to,
    subject: "Welcome to InDesk",
    text: `Please confirm your registration using this token: ${token}`,
  });
  // Implementation for sending registration email
  logger.info(`Sending welcome email to ${to} with token ${token}`);
};

export default {
  sendRegistrationEmail,
  sendResetPasswordEmail,
  sendRestrictionEmail,
  sendUnrestrictedEmail,
  sendWelcomeEmail,
};
