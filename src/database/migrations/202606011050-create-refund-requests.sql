CREATE TABLE IF NOT EXISTS refund_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_id INT NOT NULL,
  requested_by INT NOT NULL,
  handled_by INT NULL,
  refund_status VARCHAR(50) NOT NULL DEFAULT 'requested',
  amount DECIMAL(10,2) NULL,
  reason TEXT,
  decision_note TEXT,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  handled_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_refund_requests_payment_id (payment_id),
  INDEX idx_refund_requests_requested_by (requested_by),
  INDEX idx_refund_requests_handled_by (handled_by),
  INDEX idx_refund_requests_status (refund_status),

  CONSTRAINT fk_refund_requests_payment
    FOREIGN KEY (payment_id) REFERENCES payments(id),

  CONSTRAINT fk_refund_requests_requested_by
    FOREIGN KEY (requested_by) REFERENCES users(id),

  CONSTRAINT fk_refund_requests_handled_by
    FOREIGN KEY (handled_by) REFERENCES users(id)
    ON DELETE SET NULL
);
