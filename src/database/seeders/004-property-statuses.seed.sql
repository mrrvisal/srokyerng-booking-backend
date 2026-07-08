INSERT INTO property_statuses (status_name, description) VALUES
('pending', 'Waiting for admin approval'),
('approved', 'Approved and visible to customers'),
('rejected', 'Rejected by admin'),
('suspended', 'Suspended by admin')
ON DUPLICATE KEY UPDATE status_name = status_name;