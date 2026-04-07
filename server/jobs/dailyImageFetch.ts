/**
 * Daily Image Fetch Job
 * Runs every day at 2 AM to fetch images for 100 drugs
 * Uses node-cron for scheduling
 */

import cron, { ScheduledTask } from 'node-cron';
import { fetchDrugImages } from '../services/drugImageFetcher';

let scheduledJob: ScheduledTask | null = null;

/**
 * Start the daily image fetch job
 * Runs at 2:00 AM every day (UTC timezone)
 */
export function startDailyImageFetchJob() {
  if (scheduledJob) {
    console.log('Daily image fetch job already running');
    return;
  }

  // Schedule: 0 2 * * * = 2 AM every day
  scheduledJob = cron.schedule('0 2 * * *', async () => {
    console.log('\n🖼️ [Daily Job] Starting daily image fetch at', new Date().toISOString());
    
    try {
      const result = await fetchDrugImages(100);
      console.log(`✅ [Daily Job] Completed: ${result.success} images fetched, ${result.failed} failed`);
      
      // Log summary
      const timestamp = new Date().toISOString();
      console.log(`📊 [${timestamp}] Daily fetch summary: Success=${result.success}, Failed=${result.failed}`);
    } catch (error) {
      console.error('❌ [Daily Job] Error during image fetch:', error);
    }
  });

  console.log('✅ Daily image fetch job scheduled (runs at 2 AM UTC every day)');
}

/**
 * Stop the daily image fetch job
 */
export function stopDailyImageFetchJob() {
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
    console.log('✅ Daily image fetch job stopped');
  }
}

/**
 * Manually trigger the daily image fetch (for testing)
 */
export async function triggerDailyImageFetch() {
  console.log('\n🖼️ [Manual Trigger] Starting image fetch...');
  
  try {
    const result = await fetchDrugImages(100);
    console.log(`✅ [Manual Trigger] Completed: ${result.success} images fetched, ${result.failed} failed`);
    return result;
  } catch (error) {
    console.error('❌ [Manual Trigger] Error during image fetch:', error);
    throw error;
  }
}

// Export job status
export function getJobStatus() {
  return {
    isRunning: scheduledJob !== null,
    nextRun: scheduledJob ? 'Scheduled for 2 AM UTC daily' : 'Not scheduled',
  };
}
