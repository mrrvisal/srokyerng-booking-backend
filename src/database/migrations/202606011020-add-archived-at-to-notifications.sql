ALTER TABLE notifications
  ADD COLUMN archived_at TIMESTAMP NULL AFTER read_at,
  ADD INDEX idx_notifications_archived (user_id, archived_at, created_at);
