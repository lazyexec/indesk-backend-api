export interface IDashboardOverview {
  summary: {
    totalAppointments: number;
    completedAppointments: number;
    pendingAppointments: number;
    cancelledAppointments: number;
    upcomingAppointments: number;
    todayAppointments: number;
    completionRate: number;
    totalClients: number;
    activeClients: number;
    newClientsThisMonth: number;
    totalClinicians: number;
    activeClinicians: number;
  };
  financial: {
    totalRevenue: number;
    pendingRevenue: number;
    revenueGrowth: number;
    averageAppointmentValue: number;
  };
  recentAppointments: IRecentAppointment[];
  subscription: ISubscriptionInfo | null;
  dateRange: {
    gte: Date;
    lte: Date;
  };
}

export interface IRecentAppointment {
  id: string;
  clientName: string;
  sessionName: string;
  clinicianName: string;
  startTime: Date;
  status: string;
  price: number;
}

export interface ISubscriptionInfo {
  planName: string;
  status: string;
  clientLimit: number | null;
  clientUsage: number;
  usagePercentage: number;
}

export interface ICalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: string;
  meetingType: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
  };
  clinician: {
    id: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      avatar?: string;
    };
  };
  session: {
    id: string;
    name: string;
    duration: number;
    price: number;
    color?: string;
  };
  note?: string;
  zoomJoinUrl?: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

export interface IDashboardCalendar {
  events: ICalendarEvent[];
  totalCount: number;
  dateRange: {
    gte: Date;
    lte: Date;
  };
  view: string;
}

export interface IClinicianDashboard {
  summary: {
    totalAppointments: number;
    completedAppointments: number;
    upcomingAppointments: number;
    todayAppointments: number;
    completionRate: number;
    totalRevenue: number;
    averageAppointmentValue: number;
  };
  todaySchedule: ITodayAppointment[];
  recentClients: IRecentClient[];
  clinician: IClinicianInfo | null;
  dateRange: {
    gte: Date;
    lte: Date;
  };
}

export interface ITodayAppointment {
  id: string;
  clientName: string;
  sessionName: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: string;
  price: number;
}

export interface IRecentClient {
  id: string;
  name: string;
  email: string;
  lastAppointment: Date;
}

export interface IClinicianInfo {
  name: string;
  avatar?: string;
  email: string;
  clinic: string;
  role: string;
}

export interface IQuickStats {
  todayAppointments: number;
  upcomingAppointments: number;
  totalClients: number;
  totalClinicians: number;
}

export interface IDashboardFilter {
  startDate?: string;
  endDate?: string;
  view?: 'month' | 'week' | 'day';
}