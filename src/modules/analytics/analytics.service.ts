import prisma from "../../configs/prisma";
import { AppointmentStatus } from "@prisma/client";

const getFinancialOverview = async (clinicId: string, months: number = 6) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  // Get completed appointments with transactions for revenue calculation
  const completedAppointments = await prisma.appointment.findMany({
    where: {
      clinicId,
      status: AppointmentStatus.completed,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      session: {
        select: {
          name: true,
          price: true,
          duration: true
        }
      },
      transaction: {
        select: {
          amount: true,
          status: true,
          type: true
        }
      }
    },
    orderBy: {
      startTime: 'desc'
    }
  });

  // Calculate monthly revenue
  const monthlyRevenue = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date();
    monthStart.setMonth(monthStart.getMonth() - i);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);
    monthEnd.setHours(23, 59, 59, 999);

    const monthAppointments = completedAppointments.filter(apt =>
      apt.startTime >= monthStart && apt.startTime <= monthEnd
    );

    const monthRevenue = monthAppointments.reduce((sum, apt) => {
      return sum + (apt.transaction?.amount || apt.session.price || 0);
    }, 0);

    monthlyRevenue.push({
      month: monthNames[monthStart.getMonth()],
      year: monthStart.getFullYear(),
      revenue: monthRevenue,
      appointmentCount: monthAppointments.length
    });
  }

  // Calculate totals and growth
  const totalIncome = monthlyRevenue.reduce((sum, month) => sum + month.revenue, 0);
  const avgRevenue = totalIncome / months;

  // Calculate growth (current month vs previous month)
  const currentMonth = monthlyRevenue[monthlyRevenue.length - 1];
  const previousMonth = monthlyRevenue[monthlyRevenue.length - 2];
  const growthRate = previousMonth && previousMonth.revenue > 0
    ? ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100
    : 0;

  // Calculate outstanding amounts (pending/scheduled appointments)
  const pendingAppointments = await prisma.appointment.findMany({
    where: {
      clinicId,
      status: {
        in: [AppointmentStatus.scheduled, AppointmentStatus.pending]
      }
    },
    include: {
      session: {
        select: {
          price: true
        }
      }
    }
  });

  const outstanding = pendingAppointments.reduce((sum, apt) => sum + apt.session.price, 0);

  return {
    totalIncome,
    avgRevenue,
    growthRate,
    outstanding,
    monthlyRevenue,
    totalAppointments: completedAppointments.length
  };
};

const getIncomeSourcesBreakdown = async (clinicId: string, months: number = 6) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  // Get completed appointments grouped by session type
  const appointmentsBySession = await prisma.appointment.findMany({
    where: {
      clinicId,
      status: AppointmentStatus.completed,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      session: {
        select: {
          name: true,
          price: true
        }
      },
      transaction: {
        select: {
          amount: true
        }
      }
    }
  });

  // Group by session type and calculate revenue
  const incomeBySource = appointmentsBySession.reduce((acc, apt) => {
    const sessionName = apt.session.name;
    const revenue = apt.transaction?.amount || apt.session.price || 0;

    if (!acc[sessionName]) {
      acc[sessionName] = {
        name: sessionName,
        revenue: 0,
        count: 0
      };
    }

    acc[sessionName].revenue += revenue;
    acc[sessionName].count += 1;

    return acc;
  }, {} as Record<string, { name: string; revenue: number; count: number }>);

  // Convert to array and calculate percentages
  const totalRevenue = Object.values(incomeBySource).reduce((sum, source) => sum + source.revenue, 0);

  const sources = Object.values(incomeBySource).map(source => ({
    ...source,
    percentage: totalRevenue > 0 ? (source.revenue / totalRevenue) * 100 : 0
  })).sort((a, b) => b.revenue - a.revenue);

  return {
    sources,
    totalRevenue,
    totalSessions: appointmentsBySession.length
  };
};

const getSessionTypeDistribution = async (clinicId: string, months: number = 6) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  // Get all appointments (completed and scheduled) for session distribution
  const appointments = await prisma.appointment.findMany({
    where: {
      clinicId,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      session: {
        select: {
          name: true
        }
      }
    }
  });

  // Categorize sessions based on common therapy types
  const sessionCategories = {
    individual: ['individual', 'therapy', 'counseling', 'session'],
    couples: ['couples', 'couple', 'relationship', 'marriage'],
    family: ['family', 'group therapy'],
    group: ['group', 'workshop', 'class']
  };

  const distribution = {
    individual: { count: 0, percentage: 0 },
    couples: { count: 0, percentage: 0 },
    family: { count: 0, percentage: 0 },
    group: { count: 0, percentage: 0 },
    other: { count: 0, percentage: 0 }
  };

  appointments.forEach(apt => {
    const sessionName = apt.session.name.toLowerCase();
    let categorized = false;

    for (const [category, keywords] of Object.entries(sessionCategories)) {
      if (keywords.some(keyword => sessionName.includes(keyword))) {
        distribution[category as keyof typeof distribution].count++;
        categorized = true;
        break;
      }
    }

    if (!categorized) {
      distribution.other.count++;
    }
  });

  // Calculate percentages
  const totalSessions = appointments.length;
  Object.keys(distribution).forEach(key => {
    const category = key as keyof typeof distribution;
    distribution[category].percentage = totalSessions > 0
      ? (distribution[category].count / totalSessions) * 100
      : 0;
  });

  return {
    distribution,
    totalSessions
  };
};

const getClientGrowthAnalysis = async (clinicId: string, months: number = 6) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  // Get monthly client data
  const monthlyData = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date();
    monthStart.setMonth(monthStart.getMonth() - i);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);
    monthEnd.setHours(23, 59, 59, 999);

    // New clients this month
    const newClients = await prisma.client.count({
      where: {
        clinicId,
        createdAt: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    });

    // Churned clients (clients who had their last appointment more than 60 days ago)
    const churnDate = new Date(monthEnd);
    churnDate.setDate(churnDate.getDate() - 60);

    const churnedClients = await prisma.client.count({
      where: {
        clinicId,
        createdAt: {
          lt: monthStart
        },
        appointments: {
          every: {
            startTime: {
              lt: churnDate
            }
          }
        }
      }
    });

    monthlyData.push({
      month: monthNames[monthStart.getMonth()],
      year: monthStart.getFullYear(),
      newClients,
      churnedClients,
      netGrowth: newClients - churnedClients
    });
  }

  // Calculate totals
  const totalNewClients = monthlyData.reduce((sum, month) => sum + month.newClients, 0);
  const totalChurnedClients = monthlyData.reduce((sum, month) => sum + month.churnedClients, 0);
  const netGrowth = totalNewClients - totalChurnedClients;

  // Calculate current active clients
  const activeClients = await prisma.client.count({
    where: {
      clinicId,
      status: 'active'
    }
  });

  return {
    monthlyData,
    summary: {
      totalNewClients,
      totalChurnedClients,
      netGrowth,
      activeClients,
      churnRate: activeClients > 0 ? (totalChurnedClients / activeClients) * 100 : 0
    }
  };
};

const getExpensesAnalysis = async (clinicId: string, months: number = 6) => {
  // For now, we'll calculate estimated expenses based on subscription costs
  // In a real implementation, you might have an expenses table

  const subscription = await prisma.subscription.findUnique({
    where: { clinicId },
    include: {
      plan: {
        select: {
          price: true,
          name: true
        }
      }
    }
  });

  const monthlySubscriptionCost = subscription?.plan.price || 0;
  const totalExpenses = monthlySubscriptionCost * months;

  // Get revenue for margin calculation
  const financialOverview = await getFinancialOverview(clinicId, months);
  const margin = financialOverview.totalIncome > 0
    ? ((financialOverview.totalIncome - totalExpenses) / financialOverview.totalIncome) * 100
    : 0;

  return {
    totalExpenses,
    monthlySubscriptionCost,
    margin,
    breakdown: [
      {
        category: 'Platform Subscription',
        amount: totalExpenses,
        percentage: 100
      }
    ]
  };
};

const getComprehensiveAnalytics = async (clinicId: string, months: number = 6) => {
  const [
    financialOverview,
    incomeSources,
    sessionDistribution,
    clientGrowth,
    expenses
  ] = await Promise.all([
    getFinancialOverview(clinicId, months),
    getIncomeSourcesBreakdown(clinicId, months),
    getSessionTypeDistribution(clinicId, months),
    getClientGrowthAnalysis(clinicId, months),
    getExpensesAnalysis(clinicId, months)
  ]);

  return {
    period: {
      months,
      startDate: new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000),
      endDate: new Date()
    },
    financial: financialOverview,
    incomeSources,
    sessionDistribution,
    clientGrowth,
    expenses
  };
};

// Provider-level analytics (aggregated across all clinics)
const getProviderFinancialOverview = async (months: number = 6) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  // Get all completed appointments across all clinics
  const completedAppointments = await prisma.appointment.findMany({
    where: {
      status: AppointmentStatus.completed,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      session: {
        select: {
          name: true,
          price: true,
          duration: true
        }
      },
      transaction: {
        select: {
          amount: true,
          status: true,
          type: true
        }
      },
      clinic: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: {
      startTime: 'desc'
    }
  });

  // Calculate monthly revenue across all clinics
  const monthlyRevenue = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date();
    monthStart.setMonth(monthStart.getMonth() - i);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);
    monthEnd.setHours(23, 59, 59, 999);

    const monthAppointments = completedAppointments.filter(apt =>
      apt.startTime >= monthStart && apt.startTime <= monthEnd
    );

    const monthRevenue = monthAppointments.reduce((sum, apt) => {
      return sum + (apt.transaction?.amount || apt.session.price || 0);
    }, 0);

    monthlyRevenue.push({
      month: monthNames[monthStart.getMonth()],
      year: monthStart.getFullYear(),
      revenue: monthRevenue,
      appointmentCount: monthAppointments.length
    });
  }

  // Calculate totals and growth
  const totalIncome = monthlyRevenue.reduce((sum, month) => sum + month.revenue, 0);
  const avgRevenue = totalIncome / months;

  // Calculate growth (current month vs previous month)
  const currentMonth = monthlyRevenue[monthlyRevenue.length - 1];
  const previousMonth = monthlyRevenue[monthlyRevenue.length - 2];
  const growthRate = previousMonth && previousMonth.revenue > 0
    ? ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100
    : 0;

  // Calculate outstanding amounts across all clinics
  const pendingAppointments = await prisma.appointment.findMany({
    where: {
      status: {
        in: [AppointmentStatus.scheduled, AppointmentStatus.pending]
      }
    },
    include: {
      session: {
        select: {
          price: true
        }
      }
    }
  });

  const outstanding = pendingAppointments.reduce((sum, apt) => sum + apt.session.price, 0);

  return {
    totalIncome,
    avgRevenue,
    growthRate,
    outstanding,
    monthlyRevenue,
    totalAppointments: completedAppointments.length,
    totalClinics: new Set(completedAppointments.map(apt => apt.clinic.id)).size
  };
};

const getProviderIncomeSourcesBreakdown = async (months: number = 6) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  // Get completed appointments across all clinics
  const appointmentsBySession = await prisma.appointment.findMany({
    where: {
      status: AppointmentStatus.completed,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      session: {
        select: {
          name: true,
          price: true
        }
      },
      transaction: {
        select: {
          amount: true
        }
      },
      clinic: {
        select: {
          name: true
        }
      }
    }
  });

  // Group by session type and calculate revenue
  const incomeBySource = appointmentsBySession.reduce((acc, apt) => {
    const sessionName = apt.session.name;
    const revenue = apt.transaction?.amount || apt.session.price || 0;

    if (!acc[sessionName]) {
      acc[sessionName] = {
        name: sessionName,
        revenue: 0,
        count: 0,
        clinics: new Set()
      };
    }

    acc[sessionName].revenue += revenue;
    acc[sessionName].count += 1;
    acc[sessionName].clinics.add(apt.clinic.name);

    return acc;
  }, {} as Record<string, { name: string; revenue: number; count: number; clinics: Set<string> }>);

  // Convert to array and calculate percentages
  const totalRevenue = Object.values(incomeBySource).reduce((sum, source) => sum + source.revenue, 0);

  const sources = Object.values(incomeBySource).map(source => ({
    name: source.name,
    revenue: source.revenue,
    count: source.count,
    clinicCount: source.clinics.size,
    percentage: totalRevenue > 0 ? (source.revenue / totalRevenue) * 100 : 0
  })).sort((a, b) => b.revenue - a.revenue);

  return {
    sources,
    totalRevenue,
    totalSessions: appointmentsBySession.length,
    totalClinics: new Set(appointmentsBySession.map(apt => apt.clinic.name)).size
  };
};

const getProviderSessionTypeDistribution = async (months: number = 6) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  // Get all appointments across all clinics
  const appointments = await prisma.appointment.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      session: {
        select: {
          name: true
        }
      }
    }
  });

  // Use the same categorization logic
  const sessionCategories = {
    individual: ['individual', 'therapy', 'counseling', 'session'],
    couples: ['couples', 'couple', 'relationship', 'marriage'],
    family: ['family', 'group therapy'],
    group: ['group', 'workshop', 'class']
  };

  const distribution = {
    individual: { count: 0, percentage: 0 },
    couples: { count: 0, percentage: 0 },
    family: { count: 0, percentage: 0 },
    group: { count: 0, percentage: 0 },
    other: { count: 0, percentage: 0 }
  };

  appointments.forEach(apt => {
    const sessionName = apt.session.name.toLowerCase();
    let categorized = false;

    for (const [category, keywords] of Object.entries(sessionCategories)) {
      if (keywords.some(keyword => sessionName.includes(keyword))) {
        distribution[category as keyof typeof distribution].count++;
        categorized = true;
        break;
      }
    }

    if (!categorized) {
      distribution.other.count++;
    }
  });

  // Calculate percentages
  const totalSessions = appointments.length;
  Object.keys(distribution).forEach(key => {
    const category = key as keyof typeof distribution;
    distribution[category].percentage = totalSessions > 0
      ? (distribution[category].count / totalSessions) * 100
      : 0;
  });

  return {
    distribution,
    totalSessions
  };
};

const getProviderClientGrowthAnalysis = async (months: number = 6) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  // Get monthly client data across all clinics
  const monthlyData = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date();
    monthStart.setMonth(monthStart.getMonth() - i);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);
    monthEnd.setHours(23, 59, 59, 999);

    // New clients this month across all clinics
    const newClients = await prisma.client.count({
      where: {
        createdAt: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    });

    // Churned clients across all clinics
    const churnDate = new Date(monthEnd);
    churnDate.setDate(churnDate.getDate() - 60);

    const churnedClients = await prisma.client.count({
      where: {
        createdAt: {
          lt: monthStart
        },
        appointments: {
          every: {
            startTime: {
              lt: churnDate
            }
          }
        }
      }
    });

    monthlyData.push({
      month: monthNames[monthStart.getMonth()],
      year: monthStart.getFullYear(),
      newClients,
      churnedClients,
      netGrowth: newClients - churnedClients
    });
  }

  // Calculate totals
  const totalNewClients = monthlyData.reduce((sum, month) => sum + month.newClients, 0);
  const totalChurnedClients = monthlyData.reduce((sum, month) => sum + month.churnedClients, 0);
  const netGrowth = totalNewClients - totalChurnedClients;

  // Calculate current active clients across all clinics
  const activeClients = await prisma.client.count({
    where: {
      status: 'active'
    }
  });

  return {
    monthlyData,
    summary: {
      totalNewClients,
      totalChurnedClients,
      netGrowth,
      activeClients,
      churnRate: activeClients > 0 ? (totalChurnedClients / activeClients) * 100 : 0
    }
  };
};

const getProviderExpensesAnalysis = async (months: number = 6) => {
  // Calculate total subscription revenue (this is provider income from subscriptions)
  const activeSubscriptions = await prisma.subscription.findMany({
    where: {
      status: {
        in: ['active', 'trialing']
      }
    },
    include: {
      plan: {
        select: {
          price: true,
          name: true,
          type: true
        }
      }
    }
  });

  const monthlySubscriptionRevenue = activeSubscriptions.reduce((sum, sub) => sum + sub.plan.price, 0);
  const totalSubscriptionRevenue = monthlySubscriptionRevenue * months;

  // For providers, "expenses" might be operational costs, but we'll show subscription revenue breakdown
  const revenueByPlan = activeSubscriptions.reduce((acc, sub) => {
    const planType = sub.plan.type;
    if (!acc[planType]) {
      acc[planType] = {
        count: 0,
        revenue: 0,
        planName: sub.plan.name
      };
    }
    acc[planType].count += 1;
    acc[planType].revenue += sub.plan.price;
    return acc;
  }, {} as Record<string, { count: number; revenue: number; planName: string }>);

  const breakdown = Object.entries(revenueByPlan).map(([planType, data]) => ({
    category: data.planName,
    amount: data.revenue * months,
    percentage: totalSubscriptionRevenue > 0 ? (data.revenue * months / totalSubscriptionRevenue) * 100 : 0,
    subscriptionCount: data.count
  }));

  return {
    totalSubscriptionRevenue,
    monthlySubscriptionRevenue,
    activeSubscriptions: activeSubscriptions.length,
    breakdown
  };
};

const getProviderComprehensiveAnalytics = async (months: number = 6) => {
  const [
    financialOverview,
    incomeSources,
    sessionDistribution,
    clientGrowth,
    expenses
  ] = await Promise.all([
    getProviderFinancialOverview(months),
    getProviderIncomeSourcesBreakdown(months),
    getProviderSessionTypeDistribution(months),
    getProviderClientGrowthAnalysis(months),
    getProviderExpensesAnalysis(months)
  ]);

  return {
    period: {
      months,
      startDate: new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000),
      endDate: new Date()
    },
    financial: financialOverview,
    incomeSources,
    sessionDistribution,
    clientGrowth,
    expenses
  };
};

export default {
  getFinancialOverview,
  getIncomeSourcesBreakdown,
  getSessionTypeDistribution,
  getClientGrowthAnalysis,
  getExpensesAnalysis,
  getComprehensiveAnalytics,
  // Provider-level functions
  getProviderFinancialOverview,
  getProviderIncomeSourcesBreakdown,
  getProviderSessionTypeDistribution,
  getProviderClientGrowthAnalysis,
  getProviderExpensesAnalysis,
  getProviderComprehensiveAnalytics,
};