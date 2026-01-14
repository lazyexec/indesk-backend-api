import axios from "axios";
import {
  getIntegrationConfig,
  updateIntegrationConfig,
  isTokenExpired,
  handleApiError,
  retryWithBackoff,
} from "../integration.helper";
import { IntegrationType } from "../../../../generated/prisma/client";

const INTEGRATION_TYPE = IntegrationType.xero;

/**
 * Get access token (refresh if needed)
 */
const getAccessToken = async (clinicId: string): Promise<string> => {
  const config = await getIntegrationConfig(clinicId, INTEGRATION_TYPE);

  // Refresh token if expired
  if (config.expiresAt && isTokenExpired(config.expiresAt)) {
    await refreshAccessToken(clinicId);
    const newConfig = await getIntegrationConfig(clinicId, INTEGRATION_TYPE);
    return newConfig.accessToken;
  }

  return config.accessToken;
};

/**
 * Refresh access token
 */
const refreshAccessToken = async (clinicId: string): Promise<void> => {
  try {
    const config = await getIntegrationConfig(clinicId, INTEGRATION_TYPE);

    const response = await axios.post(
      "https://identity.xero.com/connect/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: config.refreshToken,
      }),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`
          ).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    await updateIntegrationConfig(clinicId, INTEGRATION_TYPE, {
      ...config,
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || config.refreshToken,
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
    });
  } catch (error: any) {
    handleApiError(error, "Xero");
  }
};

/**
 * Create invoice
 */
const createInvoice = async (
  clinicId: string,
  data: {
    contactName: string;
    contactEmail: string;
    lineItems: Array<{
      description: string;
      quantity: number;
      unitAmount: number;
      accountCode?: string;
    }>;
    dueDate?: Date;
    reference?: string;
  }
): Promise<{ invoiceId: string; invoiceNumber: string }> => {
  try {
    const accessToken = await getAccessToken(clinicId);
    const config = await getIntegrationConfig(clinicId, INTEGRATION_TYPE);

    const invoice = {
      Type: "ACCREC",
      Contact: {
        Name: data.contactName,
        EmailAddress: data.contactEmail,
      },
      LineItems: data.lineItems.map((item) => ({
        Description: item.description,
        Quantity: item.quantity,
        UnitAmount: item.unitAmount,
        AccountCode: item.accountCode || "200", // Default sales account
      })),
      Date: new Date().toISOString().split("T")[0],
      DueDate: data.dueDate
        ? data.dueDate.toISOString().split("T")[0]
        : undefined,
      Reference: data.reference,
      Status: "DRAFT",
    };

    const response = await retryWithBackoff(() =>
      axios.post(
        "https://api.xero.com/api.xro/2.0/Invoices",
        { Invoices: [invoice] },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "xero-tenant-id": config.tenantId,
            "Content-Type": "application/json",
          },
        }
      )
    );

    const createdInvoice = response.data.Invoices[0];

    return {
      invoiceId: createdInvoice.InvoiceID,
      invoiceNumber: createdInvoice.InvoiceNumber,
    };
  } catch (error: any) {
    handleApiError(error, "Xero");
    return { invoiceId: "", invoiceNumber: "" };
  }
};

/**
 * Get invoice
 */
const getInvoice = async (
  clinicId: string,
  invoiceId: string
): Promise<any> => {
  try {
    const accessToken = await getAccessToken(clinicId);
    const config = await getIntegrationConfig(clinicId, INTEGRATION_TYPE);

    const response = await retryWithBackoff(() =>
      axios.get(`https://api.xero.com/api.xro/2.0/Invoices/${invoiceId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "xero-tenant-id": config.tenantId,
        },
      })
    );

    const invoice = response.data.Invoices[0];

    return {
      invoiceId: invoice.InvoiceID,
      invoiceNumber: invoice.InvoiceNumber,
      status: invoice.Status,
      total: invoice.Total,
      amountDue: invoice.AmountDue,
      amountPaid: invoice.AmountPaid,
      dueDate: invoice.DueDate,
    };
  } catch (error: any) {
    handleApiError(error, "Xero");
  }
};

/**
 * Create contact
 */
const createContact = async (
  clinicId: string,
  data: {
    name: string;
    email: string;
    phone?: string;
  }
): Promise<{ contactId: string }> => {
  try {
    const accessToken = await getAccessToken(clinicId);
    const config = await getIntegrationConfig(clinicId, INTEGRATION_TYPE);

    const contact = {
      Name: data.name,
      EmailAddress: data.email,
      Phones: data.phone
        ? [
            {
              PhoneType: "MOBILE",
              PhoneNumber: data.phone,
            },
          ]
        : [],
    };

    const response = await retryWithBackoff(() =>
      axios.post(
        "https://api.xero.com/api.xro/2.0/Contacts",
        { Contacts: [contact] },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "xero-tenant-id": config.tenantId,
            "Content-Type": "application/json",
          },
        }
      )
    );

    return {
      contactId: response.data.Contacts[0].ContactID,
    };
  } catch (error: any) {
    handleApiError(error, "Xero");
    return { contactId: "" };
  }
};

export default {
  createInvoice,
  getInvoice,
  createContact,
  refreshAccessToken,
};
