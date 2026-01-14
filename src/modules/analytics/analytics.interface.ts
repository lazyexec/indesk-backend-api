export interface MonthlyRevenue {
  month: string;
  year: number;
  revenue: number;
  appointmentCount: number;
}

export interface FinancialOverview {
  totalIncome: number;
  avgRevenue: number;
  growthRate: number;
  outstanding: number;
  monthlyRevenue: MonthlyRevenue[];
  totalAppointments: number;
}

export interface IncomeSource {
  name: string;
  revenue: number;
  count: number;
  percentage: number;
}

export interface IncomeSourcesBreakdown {
  sources: IncomeSource[];
  totalRevenue: number;
  totalSessions: number;
}

export interface SessionTypeDistribution {
  distribution: {
    individual: { count: number; percentage: number };
    couples: { count: number; percentage: number };
    family: { count: number; percentage: number };
    group: { count: number; percentage: number };
    other: { count: number; percentage: number };
  };
  totalSessions: number;
}

export interface MonthlyClientData {
  month: string;
  year: number;
  newClients: number;
  churnedClients: number;
  netGrowth: number;
}

export interface ClientGrowthAnalysis {
  monthlyData: MonthlyClientData[];
  summary: {
    totalNewClients: number;
    totalChurnedClients: number;
    netGrowth: number;
    activeClients: number;
    churnRate: number;
  };
}

export interface ExpenseBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export interface ExpensesAnalysis {
  totalExpenses: number;
  monthlySubscriptionCost: number;
  margin: number;
  breakdown: ExpenseBreakdown[];
}

export interface ComprehensiveAnalytics {
  period: {
    months: number;
    startDate: Date;
    endDate: Date;
  };
  financial: FinancialOverview;
  incomeSources: IncomeSourcesBreakdown;
  sessionDistribution: SessionTypeDistribution;
  clientGrowth: ClientGrowthAnalysis;
  expenses: ExpensesAnalysis;
}