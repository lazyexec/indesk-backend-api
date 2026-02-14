import mailchimp from "@mailchimp/mailchimp_marketing";
import {
  getIntegrationConfig,
  handleApiError,
  retryWithBackoff,
} from "../integration.helper";
import { IntegrationType } from "@prisma/client";
import ApiError from "../../../utils/ApiError";
import httpStatus from "http-status";

const INTEGRATION_TYPE = IntegrationType.mailchimp;

/**
 * Get configured Mailchimp client
 */
const getMailchimpClient = async (clinicId: string) => {
  const config = await getIntegrationConfig(clinicId, INTEGRATION_TYPE);

  // OAuth flow: use access_token from Mailchimp OAuth
  if (!config.accessToken) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Mailchimp not connected. Please connect your Mailchimp account via OAuth."
    );
  }

  // Fetch server prefix from Mailchimp metadata endpoint using access token
  const metadataResponse = await fetch(
    "https://login.mailchimp.com/oauth2/metadata",
    {
      headers: {
        Authorization: `OAuth ${config.accessToken}`,
      },
    }
  );

  if (!metadataResponse.ok) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to fetch Mailchimp server metadata"
    );
  }

  const metadata: any = await metadataResponse.json();
  const serverPrefix = metadata.dc; // data center (e.g., "us1", "us2")

  mailchimp.setConfig({
    accessToken: config.accessToken,
    server: serverPrefix,
  });

  return mailchimp;
};

/**
 * Add or update contact
 */
const addOrUpdateContact = async (
  clinicId: string,
  data: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    tags?: string[];
  }
): Promise<{ contactId: string; status: string }> => {
  try {
    const config = await getIntegrationConfig(clinicId, INTEGRATION_TYPE);
    const client = await getMailchimpClient(clinicId);

    if (!config.audienceId) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Mailchimp audience ID not configured"
      );
    }

    const response = (await retryWithBackoff(() =>
      client.lists.setListMember(config.audienceId, data.email, {
        email_address: data.email,
        status_if_new: "subscribed",
        merge_fields: {
          FNAME: data.firstName || "",
          LNAME: data.lastName || "",
          PHONE: data.phone || "",
        },
      })
    )) as any;

    return {
      contactId: response.id,
      status: response.status,
    };
  } catch (error: any) {
    handleApiError(error, "Mailchimp");
    return { contactId: "", status: "" };
  }
};

/**
 * Remove contact from list
 */
const removeContact = async (
  clinicId: string,
  email: string
): Promise<void> => {
  try {
    const config = await getIntegrationConfig(clinicId, INTEGRATION_TYPE);
    const client = await getMailchimpClient(clinicId);

    if (!config.audienceId) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Mailchimp audience ID not configured"
      );
    }

    await retryWithBackoff(() =>
      client.lists.updateListMember(config.audienceId, email, {
        status: "unsubscribed",
      })
    );
  } catch (error: any) {
    handleApiError(error, "Mailchimp");
  }
};

/**
 * Add tags to contact
 */
const addTagsToContact = async (
  clinicId: string,
  email: string,
  tags: string[]
): Promise<void> => {
  try {
    const config = await getIntegrationConfig(clinicId, INTEGRATION_TYPE);
    const client = await getMailchimpClient(clinicId);

    if (!config.audienceId) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Mailchimp audience ID not configured"
      );
    }

    await retryWithBackoff(() =>
      client.lists.updateListMemberTags(config.audienceId, email, {
        tags: tags.map((tag) => ({ name: tag, status: "active" })),
      })
    );
  } catch (error: any) {
    handleApiError(error, "Mailchimp");
  }
};

/**
 * Get contact info
 */
const getContact = async (clinicId: string, email: string): Promise<any> => {
  try {
    const config = await getIntegrationConfig(clinicId, INTEGRATION_TYPE);
    const client = await getMailchimpClient(clinicId);

    if (!config.audienceId) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Mailchimp audience ID not configured"
      );
    }

    const response = (await retryWithBackoff(() =>
      client.lists.getListMember(config.audienceId, email)
    )) as any;

    return {
      id: response.id,
      email: response.email_address,
      status: response.status,
      firstName: response.merge_fields.FNAME,
      lastName: response.merge_fields.LNAME,
      phone: response.merge_fields.PHONE,
      tags: response.tags,
    };
  } catch (error: any) {
    handleApiError(error, "Mailchimp");
  }
};

/**
 * Create campaign
 */
const createCampaign = async (
  clinicId: string,
  data: {
    subject: string;
    fromName: string;
    replyTo: string;
    title: string;
  }
): Promise<{ campaignId: string }> => {
  try {
    const config = await getIntegrationConfig(clinicId, INTEGRATION_TYPE);
    const client = await getMailchimpClient(clinicId);

    if (!config.audienceId) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Mailchimp audience ID not configured"
      );
    }

    const response = (await retryWithBackoff(() =>
      client.campaigns.create({
        type: "regular",
        recipients: {
          list_id: config.audienceId,
        },
        settings: {
          subject_line: data.subject,
          from_name: data.fromName,
          reply_to: data.replyTo,
          title: data.title,
        },
      })
    )) as any;

    return {
      campaignId: response.id,
    };
  } catch (error: any) {
    handleApiError(error, "Mailchimp");
    return { campaignId: "" };
  }
};

/**
 * Send transactional email (one-to-one email)
 */
const sendTransactionalEmail = async (
  clinicId: string,
  data: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    fromName?: string;
    fromEmail?: string;
  }
): Promise<{ success: boolean; messageId?: string }> => {
  try {
    const config = await getIntegrationConfig(clinicId, INTEGRATION_TYPE);
    const client = await getMailchimpClient(clinicId);

    // For transactional emails, we'll use Mailchimp's API to send directly
    // First, ensure the recipient is in the audience
    if (config.audienceId) {
      try {
        await client.lists.setListMember(config.audienceId, data.to, {
          email_address: data.to,
          status_if_new: "subscribed",
        });
      } catch (error) {
        // Ignore if already exists
      }
    }

    // Create and send a campaign to a specific segment (single recipient)
    const campaign = (await retryWithBackoff(() =>
      client.campaigns.create({
        type: "regular",
        recipients: {
          list_id: config.audienceId,
        },
        settings: {
          subject_line: data.subject,
          from_name: data.fromName || config.fromName || "InDesk",
          reply_to: data.fromEmail || config.fromEmail || "noreply@indesk.com",
          title: `Transactional: ${data.subject}`,
        },
      })
    )) as any;

    // Set campaign content
    await retryWithBackoff(() =>
      client.campaigns.setContent(campaign.id, {
        html: data.html,
        plain_text: data.text,
      })
    );

    // Send campaign
    await retryWithBackoff(() => client.campaigns.send(campaign.id));

    return {
      success: true,
      messageId: campaign.id,
    };
  } catch (error: any) {
    handleApiError(error, "Mailchimp");
    return { success: false };
  }
};

/**
 * Check if Mailchimp is connected for clinic
 */
const isMailchimpConnected = async (clinicId: string): Promise<boolean> => {
  try {
    const config = await getIntegrationConfig(clinicId, INTEGRATION_TYPE);
    return !!config.accessToken && !!config.audienceId;
  } catch (error) {
    return false;
  }
};

/**
 * Send appointment reminder email
 */
const sendAppointmentReminderEmail = async (
  clinicId: string,
  data: {
    to: string;
    clientName: string;
    sessionName: string;
    startTime: Date;
    clinicName: string;
    meetingUrl?: string;
  }
): Promise<{ success: boolean; messageId?: string }> => {
  const { to, clientName, sessionName, startTime, clinicName, meetingUrl } =
    data;

  const formattedDate = startTime.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = startTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const meetingInfo = meetingUrl
    ? `<p><strong>Meeting Link:</strong> <a href="${meetingUrl}">${meetingUrl}</a></p>`
    : `<p><strong>Location:</strong> In-person appointment</p>`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #4CAF50; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Appointment Reminder</h1>
        </div>
        <div class="content">
          <p>Hi ${clientName},</p>
          <p>This is a friendly reminder about your upcoming appointment:</p>
          
          <div class="details">
            <p><strong>Service:</strong> ${sessionName}</p>
            <p><strong>Clinic:</strong> ${clinicName}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Time:</strong> ${formattedTime}</p>
            ${meetingInfo}
          </div>
          
          <p>We look forward to seeing you!</p>
          
          ${meetingUrl
      ? `<a href="${meetingUrl}" class="button">Join Meeting</a>`
      : ""
    }
        </div>
        <div class="footer">
          <p>This is an automated reminder from ${clinicName}</p>
          <p>If you need to reschedule or cancel, please contact us.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Hi ${clientName},

This is a friendly reminder about your upcoming appointment:

Service: ${sessionName}
Clinic: ${clinicName}
Date: ${formattedDate}
Time: ${formattedTime}
${meetingUrl ? `Meeting Link: ${meetingUrl}` : "Location: In-person appointment"}

We look forward to seeing you!

---
This is an automated reminder from ${clinicName}
If you need to reschedule or cancel, please contact us.
  `;

  return sendTransactionalEmail(clinicId, {
    to,
    subject: `Reminder: Your ${sessionName} appointment at ${clinicName}`,
    html,
    text,
    fromName: clinicName,
  });
};

export default {
  addOrUpdateContact,
  removeContact,
  addTagsToContact,
  getContact,
  createCampaign,
  sendTransactionalEmail,
  sendAppointmentReminderEmail,
  isMailchimpConnected,
};
