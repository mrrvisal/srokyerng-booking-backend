-- Update payment methods at IDs 4, 5, and 6 to be the new bank transfer methods
UPDATE payment_methods 
SET method_name = 'Vattanac', description = 'Pay by Vattanac Bank transfer', is_active = TRUE 
WHERE id = 4;

UPDATE payment_methods 
SET method_name = 'Chip Mong', description = 'Pay by Chip Mong Bank transfer', is_active = TRUE 
WHERE id = 5;

UPDATE payment_methods 
SET method_name = 'Sathapana', description = 'Pay by Sathapana Bank transfer', is_active = TRUE 
WHERE id = 6;

-- Add the remaining new payment methods
INSERT INTO payment_methods (method_name, description, is_active) VALUES
('PPC', 'Pay by PPC Bank transfer', TRUE),
('Woori', 'Pay by Woori Bank transfer', TRUE),
('Canadia', 'Pay by Canadia Bank transfer', TRUE)
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  is_active = VALUES(is_active);