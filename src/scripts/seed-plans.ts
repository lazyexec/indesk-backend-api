import planSeeder from "../modules/subscription/plan.seeder";

async function seedPlans() {
  try {
    console.log('🌱 Starting plan seeding...');
    
    const results = await planSeeder.seedDefaultPlans();
    
    console.log('\n📊 Seeding Results:');
    results.forEach(result => {
      if (result.success) {
        console.log(`✅ ${result.action === 'created' ? 'Created' : 'Found existing'}: ${(result as any).plan.name}`);
      } else {
        console.log(`❌ Failed: ${(result as any).planType} - ${(result as any).error}`);
      }
    });
    
    console.log('\n🎉 Plan seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Plan seeding failed:', error);
    process.exit(1);
  }
}

seedPlans();