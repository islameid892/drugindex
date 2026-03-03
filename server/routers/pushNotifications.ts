import { router, publicProcedure, protectedProcedure, adminProcedure } from '../_core/trpc';
import { z } from 'zod';
import {
  registerPushSubscription,
  unregisterPushSubscription,
  sendBroadcastPushNotification,
  getPushNotificationHistory,
  type PushSubscription,
  type PushNotificationPayload
} from '../pushNotifications';

export const pushNotificationsRouter = router({
  /**
   * Register a push notification subscription
   */
  subscribe: publicProcedure
    .input(
      z.object({
        subscription: z.object({
          endpoint: z.string(),
          keys: z.object({
            auth: z.string(),
            p256dh: z.string()
          })
        })
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await registerPushSubscription(
          input.subscription as PushSubscription,
          ctx.user?.id ? String(ctx.user.id) : undefined
        );
        return result;
      } catch (error) {
        console.error('Error subscribing to push notifications:', error);
        throw new Error('Failed to subscribe to push notifications');
      }
    }),

  /**
   * Unregister a push notification subscription
   */
  unsubscribe: publicProcedure
    .input(
      z.object({
        endpoint: z.string()
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await unregisterPushSubscription(input.endpoint);
        return result;
      } catch (error) {
        console.error('Error unsubscribing from push notifications:', error);
        throw new Error('Failed to unsubscribe from push notifications');
      }
    }),

  /**
   * Send broadcast push notification (admin only)
   */
  sendBroadcast: adminProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        body: z.string().min(1).max(1000),
        icon: z.string().optional(),
        badge: z.string().optional(),
        tag: z.string().optional(),
        data: z.record(z.string(), z.string()).optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await sendBroadcastPushNotification(
          input as PushNotificationPayload,
          ctx.user?.id ? String(ctx.user.id) : undefined
        );
        return result;
      } catch (error) {
        console.error('Error sending broadcast push notification:', error);
        throw new Error('Failed to send push notification');
      }
    }),

  /**
   * Get push notification history (admin only)
   */
  getHistory: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(20)
      })
    )
    .query(async ({ input }) => {
      try {
        const notifications = await getPushNotificationHistory(input.limit || 20);
        return notifications;
      } catch (error) {
        console.error('Error getting push notification history:', error);
        throw new Error('Failed to get push notification history');
      }
    })
});
