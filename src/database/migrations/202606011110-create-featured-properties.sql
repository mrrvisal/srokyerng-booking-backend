CREATE TABLE IF NOT EXISTS featured_properties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  featured_by INT NULL,
  feature_label VARCHAR(100),
  sort_order INT DEFAULT 0,
  starts_at TIMESTAMP NULL,
  ends_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_featured_properties_property (property_id),
  INDEX idx_featured_properties_active_order (is_active, sort_order),
  INDEX idx_featured_properties_featured_by (featured_by),

  CONSTRAINT fk_featured_properties_property
    FOREIGN KEY (property_id) REFERENCES properties(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_featured_properties_featured_by
    FOREIGN KEY (featured_by) REFERENCES users(id)
    ON DELETE SET NULL
);
