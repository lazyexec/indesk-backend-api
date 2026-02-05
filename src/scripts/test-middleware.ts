import prisma from "../configs/prisma";
import subscriptionService from "../modules/subscription/subscription.service";
import limitService from "../modules/subscription/limit.service";
import { PlanType } from "@prisma/client";

async function testMiddlewareSystem() {
  try {
    console.log('🧪 Testing middleware system...');

    // Test 1: Check if plans exist
    console.log('\n1. Checking if plans exist...');
    const plans = await prisma.plan.findMany();
    console.log(`Found ${plans.length} plans:`, plans.map(p => `${p.name} (${p.type})`));

    // Test 2: Check if any clinics exist
    console.log('\n2. Checking clinics...');
    const clinics = await prisma.clinic.findMany({
      include: {
        subscription: {
          include: {
            plan: true
          }
        }
      }
    });
    console.log(`Found ${clinics.length} clinics`);

    if (clinics.length > 0) {
      const clinic = clinics[0];
      console.log(`Testing with clinic: ${clinic.name} (ID: ${clinic.id})`);

      // Test 3: Check subscription status
      console.log('\n3. Checking subscription status...');
      try {
        const subscription = await subscriptionService.checkSubscriptionStatus(clinic.id);
        console.log(`Subscription status: ${subscription.status}`);
        console.log(`Plan: ${subscription.plan.name} (${subscription.plan.type})`);

        // Test 4: Check client limits
        console.log('\n4. Checking client limits...');
        const usageStats = await limitService.getClientUsageStats(clinic.id);
        console.log(`Client usage: ${usageStats.currentCount}/${usageStats.isUnlimited ? 'unlimited' : usageStats.limit}`);
        console.log(`Can add client: ${usageStats.canAddClient}`);

        // Test 5: Check feature access
        console.log('\n5. Checking feature access...');
        const features = ['integrations', 'advanced_reporting', 'priority_support', 'custom_branding'];
        for (const feature of features) {
          const planFeatures = subscription.plan.features as Record<string, boolean> || {};
          const hasAccess = planFeatures[feature] === true;
          console.log(`${feature}: ${hasAccess ? '✅' : '❌'}`);
        }

      } catch (error: any) {
        console.error('Subscription check failed:', error?.message || error);
      }
    } else {
      console.log('No clinics found. Create a clinic first to test the middleware system.');
    }

    console.log('\n🎉 Middleware system test completed!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Middleware test failed:', error);
    process.exit(1);
  }
}

testMiddlewareSystem();