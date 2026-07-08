ALTER TABLE properties
ADD COLUMN deleted_at TIMESTAMP NULL AFTER updated_at;
