import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock web-push
vi.mock('web-push', () => ({
  default: {
    sendNotification: vi.fn().mockResolvedValue({}),
  },
}));

// Mock mysql2/promise
vi.mock('mysql2/promise', () => ({
  default: {
    createConnection: vi.fn().mockResolvedValue({
      query: vi.fn().mockResolvedValue([[]]),
      end: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

import { registerPushSubscription, sendBroadcastPushNotification } from './pushNotifications';

describe('Push Notifications', () => {
  const mockSubscription = {
    endpoint: 'https://example.com/push/endpoint',
    keys: {
      p256dh: 'test_p256dh_key',
      auth: 'test_auth_key',
    },
  };

  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerPushSubscription', () => {
    it('should validate subscription endpoint is not empty', async () => {
      const invalidSubscription = {
        endpoint: '',
        keys: { p256dh: 'key', auth: 'auth' },
      };

      await expect(
        registerPushSubscription(invalidSubscription as any, mockUserId)
      ).rejects.toThrow();
    });

    it('should validate subscription p256dh key is not empty', async () => {
      const invalidSubscription = {
        endpoint: 'https://example.com/push',
        keys: { p256dh: '', auth: 'auth' },
      };

      await expect(
        registerPushSubscription(invalidSubscription as any, mockUserId)
      ).rejects.toThrow();
    });

    it('should validate subscription auth key is not empty', async () => {
      const invalidSubscription = {
        endpoint: 'https://example.com/push',
        keys: { p256dh: 'key', auth: '' },
      };

      await expect(
        registerPushSubscription(invalidSubscription as any, mockUserId)
      ).rejects.toThrow();
    });
  });

  describe('sendBroadcastPushNotification', () => {
    it('should validate notification title is not empty', async () => {
      await expect(
        sendBroadcastPushNotification(
          {
            title: '',
            body: 'Test body',
            icon: '/icon.png',
            badge: '/badge.png',
          },
          mockUserId
        )
      ).rejects.toThrow();
    });

    it('should validate notification body is not empty', async () => {
      await expect(
        sendBroadcastPushNotification(
          {
            title: 'Test Title',
            body: '',
            icon: '/icon.png',
            badge: '/badge.png',
          },
          mockUserId
        )
      ).rejects.toThrow();
    });

    it('should validate notification title length', async () => {
      const longTitle = 'a'.repeat(300);
      await expect(
        sendBroadcastPushNotification(
          {
            title: longTitle,
            body: 'Test body',
            icon: '/icon.png',
            badge: '/badge.png',
          },
          mockUserId
        )
      ).rejects.toThrow();
    });

    it('should validate notification body length', async () => {
      const longBody = 'a'.repeat(1000);
      await expect(
        sendBroadcastPushNotification(
          {
            title: 'Test Title',
            body: longBody,
            icon: '/icon.png',
            badge: '/badge.png',
          },
          mockUserId
        )
      ).rejects.toThrow();
    });
  });
});
