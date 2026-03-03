-- Push Notification Subscriptions Table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id VARCHAR(255) PRIMARY KEY,
  endpoint VARCHAR(500) NOT NULL UNIQUE,
  auth_key VARCHAR(255) NOT NULL,
  p256dh_key VARCHAR(255) NOT NULL,
  user_id VARCHAR(255),
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- Push Notifications Log Table
CREATE TABLE IF NOT EXISTS push_notifications (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  icon VARCHAR(500),
  badge VARCHAR(500),
  tag VARCHAR(100),
  sent_at BIGINT NOT NULL,
  sent_by VARCHAR(255),
  recipient_count INT DEFAULT 0,
  created_at BIGINT NOT NULL,
  INDEX idx_sent_at (sent_at),
  INDEX idx_sent_by (sent_by)
);
