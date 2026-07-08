INSERT INTO account_statuses (status_name, description) VALUES
('active', 'Active account'),
('suspended', 'Suspended account')
ON DUPLICATE KEY UPDATE
  description = VALUES(description);
