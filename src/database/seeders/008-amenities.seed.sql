INSERT INTO amenities (amenity_name, description) VALUES
('Wi-Fi', 'Wireless internet access'),
('Parking', 'Parking available'),
('Breakfast', 'Breakfast available'),
('Air Conditioning', 'Air conditioning available'),
('Swimming Pool', 'Swimming pool available'),
('Restaurant', 'Restaurant available'),
('Gym', 'Fitness gym available'),
('Laundry', 'Laundry service available'),
('Airport Shuttle', 'Airport shuttle service available'),
('Pet Friendly', 'Pets are allowed')
ON DUPLICATE KEY UPDATE
  description = VALUES(description);
