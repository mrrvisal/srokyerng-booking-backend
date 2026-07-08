-- ========================================================
-- 1. CREATE LOCATION LOOKUP TABLES SAFELY
-- ========================================================
CREATE TABLE IF NOT EXISTS countries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS provinces (
    id INT AUTO_INCREMENT PRIMARY KEY,
    country_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    UNIQUE (country_id, name),
    FOREIGN KEY (country_id) REFERENCES countries(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS cities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    province_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    UNIQUE (province_id, name),
    FOREIGN KEY (province_id) REFERENCES provinces(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- ========================================================
-- 2. ADD city_id AS NULLABLE FIRST (TO PREVENT ALTER CRASH)
-- ========================================================
ALTER TABLE properties ADD COLUMN city_id INT NULL AFTER address;

-- ========================================================
-- 3. EXTRACT AND SEED LOOKUP DATA FROM EXISTING RECORDS
-- ========================================================

-- Seed unique countries from existing properties
INSERT IGNORE INTO countries (name)
SELECT DISTINCT country FROM properties WHERE country IS NOT NULL AND country <> '';

-- In case no properties exist yet, insert Cambodia as default
INSERT IGNORE INTO countries (name) VALUES ('Cambodia');

-- Seed unique provinces, matching them to their country's new ID
INSERT IGNORE INTO provinces (country_id, name)
SELECT DISTINCT c.id, p.province 
FROM properties p 
JOIN countries c ON p.country = c.name 
WHERE p.province IS NOT NULL AND p.province <> '';

-- Seed unique cities, matching them to their province's new ID
INSERT IGNORE INTO cities (province_id, name)
SELECT DISTINCT pr.id, p.city 
FROM properties p 
JOIN provinces pr ON p.province = pr.name 
WHERE p.city IS NOT NULL AND p.city <> '';

-- ========================================================
-- 4. MAP OLD TEXT FIELDS TO THE NEW city_id COLUMN
-- ========================================================
UPDATE properties p
JOIN provinces pr ON p.province = pr.name
JOIN cities ci ON p.city = ci.name AND ci.province_id = pr.id
SET p.city_id = ci.id;

-- ========================================================
-- 5. ENFORCE CONSTRAINTS AND DROP DEPRECATED COLUMNS
-- ========================================================

-- Now that all existing properties have a city_id, we can safely enforce NOT NULL
ALTER TABLE properties MODIFY COLUMN city_id INT NOT NULL;

-- Add the Foreign Key constraint
ALTER TABLE properties
ADD CONSTRAINT fk_properties_city
FOREIGN KEY (city_id) REFERENCES cities(id)
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- Finally, drop the old redundant columns since data has been migrated
ALTER TABLE properties
DROP COLUMN city,
DROP COLUMN province,
DROP COLUMN country;