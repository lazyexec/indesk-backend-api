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
  meetingType: "in_person" | "zoom";
  zoomJoinUrl?: string;
  zoomStartUrl?: string;
  zoomMeetingId?: string;
  createdAt: Date;
  updatedAt: Date;
}
