import axios from "axios";
import {
  getIntegrationConfig,
  updateIntegrationConfig,
  isTokenExpired,
  handleApiError,
  retryWithBackoff,
} from "../integration.helper";
import { IntegrationType } from "@prisma/client";
import env from "../../../configs/env";

const INTEGRATION_TYPE = IntegrationType.zoom;

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
      "https://zoom.us/oauth/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: config.refreshToken,
      }),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${env.zoom.clientId}:${env.zoom.clientSecret}`
          ).toString("base64")}`,
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
    handleApiError(error, "Zoom");
  }
};

/**
 * Create Zoom meeting
 */
const createMeeting = async (
  clinicId: string,
  data: {
    topic: string;
    startTime: Date;
    duration: number; // in minutes
    agenda?: string;
    password?: string;
  }
): Promise<{
  meetingId: string;
  joinUrl: string;
  startUrl: string;
  password: string;
}> => {
  try {
    const accessToken = await getAccessToken(clinicId);

    const response = await retryWithBackoff(() =>
      axios.post(
        "https://api.zoom.us/v2/users/me/meetings",
        {
          topic: data.topic,
          type: 2, // Scheduled meeting
          start_time: data.startTime.toISOString(),
          duration: data.duration,
          agenda: data.agenda,
          settings: {
            host_video: true,
            participant_video: true,
            join_before_host: false,
            mute_upon_entry: true,
            waiting_room: true,
            audio: "both",
            auto_recording: "none",
          },
          password: data.password,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      )
    );

    return {
      meetingId: response.data.id.toString(),
      joinUrl: response.data.join_url,
      startUrl: response.data.start_url,
      password: response.data.password,
    };
  } catch (error: any) {
    handleApiError(error, "Zoom");
    return {
      meetingId: "",
      joinUrl: "",
      startUrl: "",
      password: "",
    };
  }
};

/**
 * Get meeting details
 */
const getMeetingDetails = async (
  clinicId: string,
  meetingId: string
): Promise<any> => {
  try {
    const accessToken = await getAccessToken(clinicId);

    const response = await retryWithBackoff(() =>
      axios.get(`https://api.zoom.us/v2/meetings/${meetingId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    );

    return {
      id: response.data.id,
      topic: response.data.topic,
      startTime: response.data.start_time,
      duration: response.data.duration,
      joinUrl: response.data.join_url,
      startUrl: response.data.start_url,
      status: response.data.status,
    };
  } catch (error: any) {
    handleApiError(error, "Zoom");
  }
};

/**
 * Update meeting
 */
const updateMeeting = async (
  clinicId: string,
  meetingId: string,
  updates: {
    topic?: string;
    startTime?: Date;
    duration?: number;
    agenda?: string;
  }
): Promise<void> => {
  try {
    const accessToken = await getAccessToken(clinicId);

    const payload: any = {};
    if (updates.topic) payload.topic = updates.topic;
    if (updates.startTime) payload.start_time = updates.startTime.toISOString();
    if (updates.duration) payload.duration = updates.duration;
    if (updates.agenda) payload.agenda = updates.agenda;

    await retryWithBackoff(() =>
      axios.patch(`https://api.zoom.us/v2/meetings/${meetingId}`, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      })
    );
  } catch (error: any) {
    handleApiError(error, "Zoom");
  }
};

/**
 * Delete meeting
 */
const deleteMeeting = async (
  clinicId: string,
  meetingId: string
): Promise<void> => {
  try {
    const accessToken = await getAccessToken(clinicId);

    await retryWithBackoff(() =>
      axios.delete(`https://api.zoom.us/v2/meetings/${meetingId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    );
  } catch (error: any) {
    // Ignore 404 errors (meeting already deleted)
    if (error.response?.status === 404) {
      return;
    }
    handleApiError(error, "Zoom");
  }
};

export default {
  createMeeting,
  getMeetingDetails,
  updateMeeting,
  deleteMeeting,
  refreshAccessToken,
};
