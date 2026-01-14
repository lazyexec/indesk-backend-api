import analyticsService from "../modules/analytics/analytics.service";
import prisma from "../configs/prisma";

async function testAnalyticsModule() {
  try {
    console.log('📊 Testing analytics module...');
    
    // Check if any clinics exist
    const clinics = await prisma.clinic.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            appointments: true,
            clients: true
          }
        }
      }
    });

    if (clinics.length === 0) {
      console.log('ℹ️  No clinics found. Create a clinic with appointments to test analytics.');
      process.exit(0);
    }

    const testClinic = clinics[0];
    console.log(`\n🏥 Testing with clinic: ${testClinic.name} (ID: ${testClinic.id})`);
    console.log(`   Appointments: ${testClinic._count.appointments}`);
    console.log(`   Clients: ${testClinic._count.clients}`);

    // Test 1: Financial Overview
    console.log('\n1. Testing financial overview...');
    try {
      const financial = await analyticsService.getFinancialOverview(testClinic.id, 6);
      console.log('✅ Financial Overview:');
      console.log(`   Total Income: $${financial.totalIncome.toFixed(2)}`);
      console.log(`   Average Revenue: $${financial.avgRevenue.toFixed(2)}`);
      console.log(`   Growth Rate: ${financial.growthRate.toFixed(2)}%`);
      console.log(`   Outstanding: $${financial.outstanding.toFixed(2)}`);
      console.log(`   Total Appointments: ${financial.totalAppointments}`);
      console.log(`   Monthly Data Points: ${financial.monthlyRevenue.length}`);
    } catch (error: any) {
      console.error('❌ Financial overview failed:', error.message);
    }

    // Test 2: Income Sources
    console.log('\n2. Testing income sources breakdown...');
    try {
      const incomeSources = await analyticsService.getIncomeSourcesBreakdown(testClinic.id, 6);
      console.log('✅ Income Sources:');
      console.log(`   Total Revenue: $${incomeSources.totalRevenue.toFixed(2)}`);
      console.log(`   Total Sessions: ${incomeSources.totalSessions}`);
      console.log(`   Income Sources: ${incomeSources.sources.length}`);
      
      if (incomeSources.sources.length > 0) {
        const topSource = incomeSources.sources[0];
        console.log(`   Top Source: ${topSource.name} - $${topSource.revenue.toFixed(2)} (${topSource.percentage.toFixed(1)}%)`);
      }
    } catch (error: any) {
      console.error('❌ Income sources failed:', error.message);
    }

    // Test 3: Session Distribution
    console.log('\n3. Testing session type distribution...');
    try {
      const sessionDist = await analyticsService.getSessionTypeDistribution(testClinic.id, 6);
      console.log('✅ Session Distribution:');
      console.log(`   Total Sessions: ${sessionDist.totalSessions}`);
      console.log(`   Individual: ${sessionDist.distribution.individual.count} (${sessionDist.distribution.individual.percentage.toFixed(1)}%)`);
      console.log(`   Couples: ${sessionDist.distribution.couples.count} (${sessionDist.distribution.couples.percentage.toFixed(1)}%)`);
      console.log(`   Family: ${sessionDist.distribution.family.count} (${sessionDist.distribution.family.percentage.toFixed(1)}%)`);
      console.log(`   Group: ${sessionDist.distribution.group.count} (${sessionDist.distribution.group.percentage.toFixed(1)}%)`);
      console.log(`   Other: ${sessionDist.distribution.other.count} (${sessionDist.distribution.other.percentage.toFixed(1)}%)`);
    } catch (error: any) {
      console.error('❌ Session distribution failed:', error.message);
    }

    // Test 4: Client Growth
    console.log('\n4. Testing client growth analysis...');
    try {
      const clientGrowth = await analyticsService.getClientGrowthAnalysis(testClinic.id, 6);
      console.log('✅ Client Growth:');
      console.log(`   Total New Clients: ${clientGrowth.summary.totalNewClients}`);
      console.log(`   Total Churned Clients: ${clientGrowth.summary.totalChurnedClients}`);
      console.log(`   Net Growth: ${clientGrowth.summary.netGrowth}`);
      console.log(`   Active Clients: ${clientGrowth.summary.activeClients}`);
      console.log(`   Churn Rate: ${clientGrowth.summary.churnRate.toFixed(2)}%`);
      console.log(`   Monthly Data Points: ${clientGrowth.monthlyData.length}`);
    } catch (error: any) {
      console.error('❌ Client growth failed:', error.message);
    }

    // Test 5: Expenses Analysis
    console.log('\n5. Testing expenses analysis...');
    try {
      const expenses = await analyticsService.getExpensesAnalysis(testClinic.id, 6);
      console.log('✅ Expenses Analysis:');
      console.log(`   Total Expenses: $${expenses.totalExpenses.toFixed(2)}`);
      console.log(`   Monthly Subscription: $${expenses.monthlySubscriptionCost.toFixed(2)}`);
      console.log(`   Profit Margin: ${expenses.margin.toFixed(2)}%`);
      console.log(`   Expense Categories: ${expenses.breakdown.length}`);
    } catch (error: any) {
      console.error('❌ Expenses analysis failed:', error.message);
    }

    // Test 6: Comprehensive Analytics
    console.log('\n6. Testing comprehensive analytics...');
    try {
      const comprehensive = await analyticsService.getComprehensiveAnalytics(testClinic.id, 6);
      console.log('✅ Comprehensive Analytics:');
      console.log(`   Period: ${comprehensive.period.months} months`);
      console.log(`   Financial Data: ✓`);
      console.log(`   Income Sources: ✓`);
      console.log(`   Session Distribution: ✓`);
      console.log(`   Client Growth: ✓`);
      console.log(`   Expenses: ✓`);
    } catch (error: any) {
      console.error('❌ Comprehensive analytics failed:', error.message);
    }

    console.log('\n🎉 Analytics module testing completed!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Analytics module test failed:', error);
    process.exit(1);
  }
}

testAnalyticsModule();