-- Add google_id to users, so a customer/owner account can be linked to a
-- Google account independently of login (profile "Connections" tab).
ALTER TABLE users
ADD COLUMN google_id VARCHAR(255) NULL UNIQUE COMMENT 'Google account subject id (sub claim) linked to this user, if any';
