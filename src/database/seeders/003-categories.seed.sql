INSERT INTO categories (category_name, description) VALUES
('Hotel', 'Hotel accommodation'),
('Guesthouse', 'Guesthouse accommodation'),
('Homestay', 'Local homestay accommodation'),
('Apartment', 'Apartment accommodation'),
('Villa', 'Villa accommodation'),
('Resort', 'Resort accommodation'),
('Hostel', 'Hostel accommodation')
ON DUPLICATE KEY UPDATE category_name = category_name;