INSERT INTO payment_statuses (status_name, description) VALUES
('pending', 'Payment created but customer has not submitted proof'),
('submitted', 'Customer submitted payment proof and waiting for verification'),
('paid', 'Payment verified successfully'),
('failed', 'Payment failed or proof rejected'),
('refunded', 'Payment refunded to customer')
ON DUPLICATE KEY UPDATE
  description = VALUES(description);
