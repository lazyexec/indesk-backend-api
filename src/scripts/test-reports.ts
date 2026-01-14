import reportService from "../modules/report/report.service";

async function testReportModule() {
  try {
    console.log('📊 Testing report module...');
    
    // Test 1: Subscription Overview
    console.log('\n1. Testing subscription overview...');
    try {
      const subscriptionOverview = await reportService.getSubscriptionOverview();
      console.log('✅ Subscription Overview:');
      console.log(`   Total Clinics: ${subscriptionOverview.totalClinics}`);
      console.log(`   Active Subscriptions: ${subscriptionOverview.activeSubscriptions}`);
      console.log(`   Total MRR: $${subscriptionOverview.totalMRR.toFixed(2)}`);
      console.log(`   Plans: ${subscriptionOverview.subscriptionsByPlan.map(p => `${p.planName} (${p.count})`).join(', ')}`);
    } catch (error: any) {
      console.error('❌ Subscription overview failed:', error.message);
    }
    
    // Test 2: Client Usage Report
    console.log('\n2. Testing client usage report...');
    try {
      const clientUsage = await reportService.getClientUsageReport();
      console.log('✅ Client Usage Report:');
      console.log(`   Total Clients: ${clientUsage.summary.totalClients}`);
      console.log(`   Clinics at Limit: ${clientUsage.summary.clinicsAtLimit}`);
      console.log(`   Clinics Near Limit: ${clientUsage.summary.clinicsNearLimit}`);
      console.log(`   Average Clients per Clinic: ${clientUsage.summary.averageClientsPerClinic}`);
      
      if (clientUsage.clinics.length > 0) {
        console.log(`   Sample Clinic: ${clientUsage.clinics[0].clinicName} - ${clientUsage.clinics[0].clientCount} clients`);
      }
    } catch (error: any) {
      console.error('❌ Client usage report failed:', error.message);
    }
    
    // Test 3: Trial Report
    console.log('\n3. Testing trial report...');
    try {
      const trialReport = await reportService.getTrialReport();
      console.log('✅ Trial Report:');
      console.log(`   Active Trials: ${trialReport.summary.activeTrials}`);
      console.log(`   Expiring Soon: ${trialReport.summary.expiringSoon}`);
      console.log(`   Total Trials Started: ${trialReport.summary.totalTrialsStarted}`);
      console.log(`   Trial Conversions: ${trialReport.summary.trialConversions}`);
      console.log(`   Conversion Rate: ${trialReport.summary.conversionRate}%`);
    } catch (error: any) {
      console.error('❌ Trial report failed:', error.message);
    }
    
    // Test 4: Revenue Report
    console.log('\n4. Testing revenue report...');
    try {
      const revenueReport = await reportService.getRevenueReport();
      console.log('✅ Revenue Report:');
      console.log(`   Period: ${revenueReport.period.startDate.toDateString()} - ${revenueReport.period.endDate.toDateString()}`);
      console.log(`   Total MRR: $${revenueReport.summary.totalMRR.toFixed(2)}`);
      console.log(`   New Subscriptions: ${revenueReport.summary.newSubscriptions}`);
      console.log(`   Cancelled Subscriptions: ${revenueReport.summary.cancelledSubscriptions}`);
      console.log(`   Net Growth: ${revenueReport.summary.netGrowth}`);
    } catch (error: any) {
      console.error('❌ Revenue report failed:', error.message);
    }
    
    // Test 5: System Health Report
    console.log('\n5. Testing system health report...');
    try {
      const systemHealth = await reportService.getSystemHealthReport();
      console.log('✅ System Health Report:');
      console.log(`   Total Users: ${systemHealth.systemStats.totalUsers}`);
      console.log(`   Active Users: ${systemHealth.systemStats.activeUsers}`);
      console.log(`   Total Clinics: ${systemHealth.systemStats.totalClinics}`);
      console.log(`   Total Clients: ${systemHealth.systemStats.totalClients}`);
      console.log(`   User Activation Rate: ${systemHealth.healthIndicators.userActivationRate}%`);
      console.log(`   Past Due Subscriptions: ${systemHealth.healthIndicators.pastDueSubscriptions}`);
      console.log(`   Restricted Users: ${systemHealth.healthIndicators.restrictedUsers}`);
    } catch (error: any) {
      console.error('❌ System health report failed:', error.message);
    }
    
    console.log('\n🎉 Report module testing completed!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Report module test failed:', error);
    process.exit(1);
  }
}

testReportModule();