import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';

// Database client will be initialized when needed
let dbClient: any = null;

async function getDbClient() {
  if (!dbClient) {
    const connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST || 'localhost',
      user: process.env.DATABASE_USER || 'root',
      password: process.env.DATABASE_PASSWORD || '',
      database: process.env.DATABASE_NAME || 'icd10_db',
    });
    dbClient = drizzle(connection);
  }
  return dbClient;
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, string>;
}

/**
 * Register a push notification subscription
 */
export async function registerPushSubscription(
  subscription: PushSubscription,
  userId?: string
) {
  try {
    const id = randomUUID();
    const now = Date.now();

    // Check if endpoint already exists
    const db = await getDbClient();
    const existing = await db.query(
      'SELECT id FROM push_subscriptions WHERE endpoint = ?',
      [subscription.endpoint]
    );

    if (existing && existing.length > 0) {
      // Update existing subscription
      await db.query(
        'UPDATE push_subscriptions SET updated_at = ?, is_active = true WHERE endpoint = ?',
        [now, subscription.endpoint]
      );
      return { success: true, isNew: false };
    }

    // Insert new subscription
    await db.query(
      `INSERT INTO push_subscriptions (id, endpoint, auth_key, p256dh_key, user_id, created_at, updated_at, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, true)`,
      [
        id,
        subscription.endpoint,
        subscription.keys.auth,
        subscription.keys.p256dh,
        userId || null,
        now,
        now
      ]
    );

    return { success: true, isNew: true };
  } catch (error) {
    console.error('Error registering push subscription:', error);
    throw error;
  }
}

/**
 * Unregister a push notification subscription
 */
export async function unregisterPushSubscription(endpoint: string) {
  try {
    const db = await getDbClient();
    await db.query(
      'UPDATE push_subscriptions SET is_active = false WHERE endpoint = ?',
      [endpoint]
    );
    return { success: true };
  } catch (error) {
    console.error('Error unregistering push subscription:', error);
    throw error;
  }
}

/**
 * Get all active push subscriptions
 */
export async function getActivePushSubscriptions() {
  try {
    const db = await getDbClient();
    const subscriptions = await db.query(
      'SELECT endpoint, auth_key, p256dh_key FROM push_subscriptions WHERE is_active = true'
    );
    return subscriptions || [];
  } catch (error) {
    console.error('Error getting push subscriptions:', error);
    throw error;
  }
}

/**
 * Send push notification to all subscribers
 */
export async function sendBroadcastPushNotification(
  payload: PushNotificationPayload,
  sentBy?: string
) {
  try {
    const id = randomUUID();
    const now = Date.now();
    const db = await getDbClient();

    // Get all active subscriptions
    const subscriptions = await getActivePushSubscriptions();

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No active push subscriptions found');
      return { success: true, sent: 0, failed: 0 };
    }

    // Log the notification
    await db.query(
      `INSERT INTO push_notifications (id, title, body, icon, badge, tag, sent_at, sent_by, recipient_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        payload.title,
        payload.body,
        payload.icon || null,
        payload.badge || null,
        payload.tag || null,
        now,
        sentBy || null,
        subscriptions.length,
        now
      ]
    );

    // Send to each subscription
    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        // In production, you would send via Web Push Protocol
        // For now, we'll just log it
        console.log(`Push notification queued for: ${sub.endpoint}`);
        sent++;
      } catch (error) {
        console.error(`Failed to send to ${sub.endpoint}:`, error);
        failed++;
      }
    }

    return { success: true, sent, failed, notificationId: id };
  } catch (error) {
    console.error('Error sending broadcast push notification:', error);
    throw error;
  }
}

/**
 * Get push notification history
 */
export async function getPushNotificationHistory(limit = 20) {
  try {
    const db = await getDbClient();
    const notifications = await db.query(
      `SELECT id, title, body, sent_at, sent_by, recipient_count
       FROM push_notifications
       ORDER BY sent_at DESC
       LIMIT ?`,
      [limit]
    );
    return notifications || [];
  } catch (error) {
    console.error('Error getting push notification history:', error);
    throw error;
  }
}
