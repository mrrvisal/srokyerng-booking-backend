INSERT INTO payment_methods (method_name, description, is_active) VALUES
('ABA', 'Pay by ABA Bank transfer', TRUE),
('ACLEDA', 'Pay by ACLEDA Bank transfer', TRUE),
('Wing', 'Pay by Wing transfer', TRUE),
('Vattanac', 'Pay by Vattanac Bank transfer', TRUE),
('Chip Mong', 'Pay by Chip Mong Bank transfer', TRUE),
('Sathapana', 'Pay by Sathapana Bank transfer', TRUE),
('PPC', 'Pay by PPC Bank transfer', TRUE),
('Woori', 'Pay by Woori Bank transfer', TRUE),
('Canadia', 'Pay by Canadia Bank transfer', TRUE)
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  is_active = VALUES(is_active);
