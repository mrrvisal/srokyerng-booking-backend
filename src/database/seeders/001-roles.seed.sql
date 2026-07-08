INSERT INTO roles (role_name, description) VALUES
('customer', 'Customer who books accommodation'),
('owner', 'Property owner who manages properties and rooms'),
('admin', 'System administrator')
ON DUPLICATE KEY UPDATE
  description = VALUES(description);
