/**
 * Job Initialization
 * Starts all scheduled jobs when the server starts
 */

import { startDailyImageFetchJob, stopDailyImageFetchJob } from './dailyImageFetch';

/**
 * Initialize all jobs
 */
export function initializeJobs() {
  console.log('\n📋 Initializing scheduled jobs...\n');
  
  try {
    startDailyImageFetchJob();
    console.log('✅ All jobs initialized successfully\n');
  } catch (error) {
    console.error('❌ Error initializing jobs:', error);
  }
}

/**
 * Shutdown all jobs
 */
export function shutdownJobs() {
  console.log('\n📋 Shutting down scheduled jobs...\n');
  
  try {
    stopDailyImageFetchJob();
    console.log('✅ All jobs shut down successfully\n');
  } catch (error) {
    console.error('❌ Error shutting down jobs:', error);
  }
}

// Export individual jobs for manual triggering
export { startDailyImageFetchJob, stopDailyImageFetchJob, triggerDailyImageFetch, getJobStatus } from './dailyImageFetch';
