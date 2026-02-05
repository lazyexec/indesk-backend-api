import { PlanType } from "@prisma/client";
import planService from "./plan.service";

const seedDefaultPlans = async () => {
  const defaultPlans = [
    {
      name: "Free Plan",
      type: PlanType.free,
      description: "Basic features for small practices",
      price: 0,
      clientLimit: 10,
      clinicianLimit: 1, // 1 clinician for free plan
      features: {
        clients: true,
        appointments: true,
        notes: true,
        assessments: true,
        integrations: false,
        advanced_reporting: false,
        priority_support: false,
        custom_branding: false,
      }
    },
    {
      name: "Professional Plan",
      type: PlanType.professional,
      description: "Advanced features for growing practices",
      price: 29.99,
      clientLimit: 100,
      clinicianLimit: 5, // 5 clinicians for professional plan
      features: {
        clients: true,
        appointments: true,
        notes: true,
        assessments: true,
        integrations: true,
        advanced_reporting: true,
        priority_support: false,
        custom_branding: false,
      }
    },
    {
      name: "Enterprise Plan",
      type: PlanType.enterprise,
      description: "Full features for large practices",
      price: 99.99,
      clientLimit: 0, // Unlimited
      clinicianLimit: 0, // Unlimited clinicians for enterprise
      features: {
        clients: true,
        appointments: true,
        notes: true,
        assessments: true,
        integrations: true,
        advanced_reporting: true,
        priority_support: true,
        custom_branding: true,
      }
    }
  ];

  const results = [];

  for (const planData of defaultPlans) {
    try {
      // Check if plan already exists
      const existingPlan = await planService.getPlanByType(planData.type).catch(() => null);

      if (!existingPlan) {
        const plan = await planService.createPlan(planData);
        results.push({ success: true, plan, action: 'created' });
        console.log(`✅ Created ${planData.name}`);
      } else {
        results.push({ success: true, plan: existingPlan, action: 'exists' });
        console.log(`ℹ️  ${planData.name} already exists`);
      }
    } catch (error) {
      results.push({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        planType: planData.type
      });
      console.error(`❌ Failed to create ${planData.name}:`, error);
    }
  }

  return results;
};

const updatePlans = async () => {
  try {
    const plans = await planService.getAllPlans(true);

    for (const plan of plans) {
      // Update features based on plan type
      let updatedFeatures = {};

      switch (plan.type) {
        case PlanType.free:
          updatedFeatures = {
            clients: true,
            appointments: true,
            notes: true,
            assessments: true,
            integrations: false,
            advanced_reporting: false,
            priority_support: false,
            custom_branding: false,
          };
          break;
        case PlanType.professional:
          updatedFeatures = {
            clients: true,
            appointments: true,
            notes: true,
            assessments: true,
            integrations: true,
            advanced_reporting: true,
            priority_support: false,
            custom_branding: false,
          };
          break;
        case PlanType.enterprise:
          updatedFeatures = {
            clients: true,
            appointments: true,
            notes: true,
            assessments: true,
            integrations: true,
            advanced_reporting: true,
            priority_support: true,
            custom_branding: true,
          };
          break;
      }

      await planService.updatePlan(plan.id, {
        features: updatedFeatures
      });

      console.log(`✅ Updated features for ${plan.name}`);
    }
  } catch (error) {
    console.error('❌ Failed to update plans:', error);
    throw error;
  }
};

export default {
  seedDefaultPlans,
  updatePlans,
};