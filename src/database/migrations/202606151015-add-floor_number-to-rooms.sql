-- Add number_of_floors to properties table
ALTER TABLE properties 
ADD COLUMN number_of_floors INT DEFAULT NULL COMMENT 'Total number of floors in the property';

-- Add floor_number to rooms table
ALTER TABLE rooms 
ADD COLUMN floor_number INT DEFAULT NULL COMMENT 'Which floor the room is located on';
