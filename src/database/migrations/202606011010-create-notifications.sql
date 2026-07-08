CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  notification_type VARCHAR(80) NOT NULL,
  channel VARCHAR(30) NOT NULL DEFAULT 'in_app',
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  metadata JSON NULL,
  delivery_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  sent_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_notifications_user_id (user_id),
  INDEX idx_notifications_unread (user_id, is_read, created_at),
  INDEX idx_notifications_type (notification_type),

  CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);
