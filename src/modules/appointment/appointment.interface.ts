export interface IAppointment {
  id: string;
  clinicId: string;
  clinicianId: string;
  clientId: string;
  addedBy: string;
  sessionId: string;
  status: "pending" | "scheduled" | "completed" | "cancelled";
  startTime: Date;
  endTime: Date;
  note?: string;
  meetingType: "in_person" | "zoom" | "google_meet";
  zoomJoinUrl?: string;
  zoomStartUrl?: string;
  zoomMeetingId?: string;
  googleMeetUrl?: string;
  googleMeetId?: string;
  googleCalendarEventId?: string;
  appointmentToken?: string;
  createdAt: Date;
  updatedAt: Date;
}
