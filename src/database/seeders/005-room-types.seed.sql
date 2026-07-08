INSERT INTO room_types (type_name, description) VALUES
('Standard', 'Standard room'),
('Deluxe', 'Deluxe room'),
('Suite', 'Suite room'),
('Family', 'Family room'),
('Single', 'Single bed room'),
('Double', 'Double bed room'),
('Twin', 'Twin bed room')
ON DUPLICATE KEY UPDATE
  description = VALUES(description);
