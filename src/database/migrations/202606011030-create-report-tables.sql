CREATE TABLE IF NOT EXISTS reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reporter_id INT NOT NULL,
  assigned_admin_id INT NULL,
  property_id INT NULL,
  reservation_id INT NULL,
  payment_id INT NULL,
  report_type VARCHAR(80) NOT NULL,
  subject VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  resolution_note TEXT,
  resolved_by INT NULL,
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_reports_reporter_id (reporter_id),
  INDEX idx_reports_assigned_admin_id (assigned_admin_id),
  INDEX idx_reports_status (status),
  INDEX idx_reports_property_id (property_id),
  INDEX idx_reports_reservation_id (reservation_id),
  INDEX idx_reports_payment_id (payment_id),

  CONSTRAINT fk_reports_reporter
    FOREIGN KEY (reporter_id) REFERENCES users(id),

  CONSTRAINT fk_reports_assigned_admin
    FOREIGN KEY (assigned_admin_id) REFERENCES users(id)
    ON DELETE SET NULL,

  CONSTRAINT fk_reports_property
    FOREIGN KEY (property_id) REFERENCES properties(id)
    ON DELETE SET NULL,

  CONSTRAINT fk_reports_reservation
    FOREIGN KEY (reservation_id) REFERENCES reservations(id)
    ON DELETE SET NULL,

  CONSTRAINT fk_reports_payment
    FOREIGN KEY (payment_id) REFERENCES payments(id)
    ON DELETE SET NULL,

  CONSTRAINT fk_reports_resolved_by
    FOREIGN KEY (resolved_by) REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS report_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_id INT NOT NULL,
  sender_id INT NOT NULL,
  message_body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_report_messages_report_id (report_id),
  INDEX idx_report_messages_sender_id (sender_id),

  CONSTRAINT fk_report_messages_report
    FOREIGN KEY (report_id) REFERENCES reports(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_report_messages_sender
    FOREIGN KEY (sender_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS report_attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_id INT NOT NULL,
  uploaded_by INT NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_report_attachments_report_id (report_id),
  INDEX idx_report_attachments_uploaded_by (uploaded_by),

  CONSTRAINT fk_report_attachments_report
    FOREIGN KEY (report_id) REFERENCES reports(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_report_attachments_uploaded_by
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);
