CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actor_id INT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id INT NULL,
  metadata JSON NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_audit_logs_actor_id (actor_id),
  INDEX idx_audit_logs_entity (entity_type, entity_id),
  INDEX idx_audit_logs_action (action),
  INDEX idx_audit_logs_created_at (created_at),

  CONSTRAINT fk_audit_logs_actor
    FOREIGN KEY (actor_id) REFERENCES users(id)
    ON DELETE SET NULL
);
