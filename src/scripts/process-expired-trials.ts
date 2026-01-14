import trialService from "../modules/subscription/trial.service";

async function processExpiredTrials() {
  try {
    console.log('🔄 Starting expired trial processing...');
    
    const results = await trialService.processExpiredTrials();
    
    console.log('\n📊 Processing Results:');
    console.log(`Total processed: ${results.processed}`);
    console.log(`Successful: ${results.successful}`);
    console.log(`Failed: ${results.failed}`);
    
    if (results.results.length > 0) {
      console.log('\n📋 Details:');
      results.results.forEach(result => {
        if (result.success) {
          console.log(`✅ ${result.clinicName}: ${result.previousPlan} → ${result.newPlan}`);
        } else {
          console.log(`❌ ${result.clinicName}: ${result.error}`);
        }
      });
    }
    
    console.log('\n🎉 Expired trial processing completed!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Expired trial processing failed:', error);
    process.exit(1);
  }
}

processExpiredTrials();