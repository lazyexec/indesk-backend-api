import reportService from "../modules/report/report.service";

async function runAdminReports() {
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'dashboard':
        await showDashboard();
        break;
      case 'subscriptions':
        await showSubscriptions();
        break;
      case 'trials':
        await showTrials();
        break;
      case 'revenue':
        await showRevenue();
        break;
      case 'health':
        await showHealth();
        break;
      case 'usage':
        await showUsage();
        break;
      default:
        showHelp();
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function showDashboard() {
  console.log('📊 ADMIN DASHBOARD SUMMARY');
  console.log('=' .repeat(50));
  
  const [subscriptions, trials, health, usage] = await Promise.all([
    reportService.getSubscriptionOverview(),
    reportService.getTrialReport(),
    reportService.getSystemHealthReport(),
    reportService.getClientUsageReport()
  ]);

  console.log(`🏥 Total Clinics: ${subscriptions.totalClinics}`);
  console.log(`📋 Active Subscriptions: ${subscriptions.activeSubscriptions}`);
  console.log(`💰 Monthly Recurring Revenue: $${subscriptions.totalMRR.toFixed(2)}`);
  console.log(`👥 Total Clients: ${usage.summary.totalClients}`);
  
  console.log('\n🚨 ATTENTION NEEDED:');
  console.log(`   Trials Expiring Soon: ${trials.summary.expiringSoon}`);
  console.log(`   Clinics at Client Limit: ${usage.summary.clinicsAtLimit}`);
  console.log(`   Past Due Subscriptions: ${health.subscriptionHealth.pastDueSubscriptions}`);
  
  console.log('\n📈 RECENT ACTIVITY (Last 7 days):');
  console.log(`   New Users: ${health.recentActivity.newUsers}`);
  console.log(`   New Clinics: ${health.recentActivity.newClinics}`);
  console.log(`   New Clients: ${health.recentActivity.newClients}`);
  console.log(`   New Appointments: ${health.recentActivity.newAppointments}`);
  
  // Calculate and show health score
  const healthScore = calculateHealthScore(health, trials, usage);
  const healthEmoji = healthScore >= 80 ? '🟢' : healthScore >= 60 ? '🟡' : '🔴';
  console.log(`\n${healthEmoji} System Health Score: ${healthScore}/100`);
}

async function showSubscriptions() {
  console.log('📋 SUBSCRIPTION OVERVIEW');
  console.log('=' .repeat(50));
  
  const report = await reportService.getSubscriptionOverview();
  
  console.log(`Total Clinics: ${report.totalClinics}`);
  console.log(`Active Subscriptions: ${report.activeSubscriptions}`);
  console.log(`Monthly Recurring Revenue: $${report.totalMRR.toFixed(2)}`);
  
  console.log('\n📊 BY PLAN TYPE:');
  report.subscriptionsByPlan.forEach(plan => {
    const revenue = plan.planPrice * plan.count;
    console.log(`   ${plan.planName}: ${plan.count} subscriptions ($${revenue.toFixed(2)}/month)`);
  });
  
  console.log('\n📈 BY STATUS:');
  report.subscriptionsByStatus.forEach(status => {
    console.log(`   ${status.status}: ${status.count}`);
  });
}

async function showTrials() {
  console.log('🎯 TRIAL REPORT');
  console.log('=' .repeat(50));
  
  const report = await reportService.getTrialReport();
  
  console.log(`Active Trials: ${report.summary.activeTrials}`);
  console.log(`Expiring Soon (≤3 days): ${report.summary.expiringSoon}`);
  console.log(`Total Trials Started: ${report.summary.totalTrialsStarted}`);
  console.log(`Successful Conversions: ${report.summary.trialConversions}`);
  console.log(`Conversion Rate: ${report.summary.conversionRate}%`);
  
  if (report.trials.length > 0) {
    console.log('\n🔥 EXPIRING SOON:');
    const expiringSoon = report.trials.filter(t => t.isExpiringSoon);
    if (expiringSoon.length > 0) {
      expiringSoon.forEach(trial => {
        console.log(`   ${trial.clinicName}: ${trial.daysRemaining} days left`);
      });
    } else {
      console.log('   No trials expiring soon');
    }
  }
}

async function showRevenue() {
  console.log('💰 REVENUE REPORT (Last 30 days)');
  console.log('=' .repeat(50));
  
  const report = await reportService.getRevenueReport();
  
  console.log(`Period: ${report.period.startDate.toDateString()} - ${report.period.endDate.toDateString()}`);
  console.log(`Current MRR: $${report.summary.totalMRR.toFixed(2)}`);
  console.log(`New Subscriptions: ${report.summary.newSubscriptions}`);
  console.log(`Cancelled Subscriptions: ${report.summary.cancelledSubscriptions}`);
  console.log(`Net Growth: ${report.summary.netGrowth}`);
  
  console.log('\n📊 MRR BY PLAN:');
  Object.entries(report.mrrByPlan).forEach(([planType, data]) => {
    console.log(`   ${planType}: ${data.count} subs × $${(data.revenue / data.count).toFixed(2)} = $${data.revenue.toFixed(2)}/month`);
  });
}

async function showHealth() {
  console.log('🏥 SYSTEM HEALTH REPORT');
  console.log('=' .repeat(50));
  
  const report = await reportService.getSystemHealthReport();
  
  console.log('📊 SYSTEM STATS:');
  console.log(`   Total Users: ${report.systemStats.totalUsers}`);
  console.log(`   Active Users: ${report.systemStats.activeUsers} (${report.healthIndicators.userActivationRate}%)`);
  console.log(`   Total Clinics: ${report.systemStats.totalClinics}`);
  console.log(`   Total Clients: ${report.systemStats.totalClients}`);
  console.log(`   Total Appointments: ${report.systemStats.totalAppointments}`);
  
  console.log('\n📈 RECENT ACTIVITY (Last 7 days):');
  console.log(`   New Users: ${report.recentActivity.newUsers}`);
  console.log(`   New Clinics: ${report.recentActivity.newClinics}`);
  console.log(`   New Clients: ${report.recentActivity.newClients}`);
  console.log(`   New Appointments: ${report.recentActivity.newAppointments}`);
  
  console.log('\n🚨 HEALTH INDICATORS:');
  console.log(`   Restricted Users: ${report.healthIndicators.restrictedUsers}`);
  console.log(`   Past Due Subscriptions: ${report.healthIndicators.pastDueSubscriptions}`);
  console.log(`   User Activation Rate: ${report.healthIndicators.userActivationRate}%`);
}

async function showUsage() {
  console.log('👥 CLIENT USAGE REPORT');
  console.log('=' .repeat(50));
  
  const report = await reportService.getClientUsageReport();
  
  console.log(`Total Clients: ${report.summary.totalClients}`);
  console.log(`Average per Clinic: ${report.summary.averageClientsPerClinic}`);
  console.log(`Clinics at Limit: ${report.summary.clinicsAtLimit}`);
  console.log(`Clinics Near Limit (≥80%): ${report.summary.clinicsNearLimit}`);
  
  if (report.clinics.length > 0) {
    console.log('\n🔥 CLINICS NEEDING ATTENTION:');
    const needsAttention = report.clinics.filter(c => c.isAtLimit || c.isNearLimit);
    if (needsAttention.length > 0) {
      needsAttention.slice(0, 10).forEach(clinic => {
        const status = clinic.isAtLimit ? '🔴 AT LIMIT' : '🟡 NEAR LIMIT';
        console.log(`   ${status} ${clinic.clinicName}: ${clinic.clientCount}/${clinic.clientLimit} (${clinic.usagePercentage}%)`);
      });
      if (needsAttention.length > 10) {
        console.log(`   ... and ${needsAttention.length - 10} more`);
      }
    } else {
      console.log('   All clinics within healthy usage limits');
    }
  }
}

function calculateHealthScore(health: any, trials: any, usage: any): number {
  let score = 100;
  
  // Deduct points for issues
  if (health.healthIndicators.pastDueSubscriptions > 0) {
    score -= Math.min(20, health.healthIndicators.pastDueSubscriptions * 2);
  }
  
  if (health.healthIndicators.restrictedUsers > 0) {
    score -= Math.min(10, health.healthIndicators.restrictedUsers);
  }
  
  if (trials.summary.conversionRate < 20) {
    score -= 15;
  }
  
  if (usage.summary.clinicsAtLimit > usage.summary.totalClients * 0.1) {
    score -= 10;
  }
  
  // Bonus points for good metrics
  if (trials.summary.conversionRate > 50) {
    score += 5;
  }
  
  if (health.healthIndicators.userActivationRate > 90) {
    score += 5;
  }
  
  return Math.max(0, Math.min(100, score));
}

function showHelp() {
  console.log('🔧 ADMIN REPORTS CLI');
  console.log('=' .repeat(50));
  console.log('Usage: npm run admin:reports <command>');
  console.log('');
  console.log('Available commands:');
  console.log('  dashboard     - Complete overview with key metrics');
  console.log('  subscriptions - Subscription and plan distribution');
  console.log('  trials        - Trial analytics and conversions');
  console.log('  revenue       - Revenue and financial metrics');
  console.log('  health        - System health and performance');
  console.log('  usage         - Client usage and limits');
  console.log('');
  console.log('Examples:');
  console.log('  npm run admin:reports dashboard');
  console.log('  npm run admin:reports trials');
}

runAdminReports();