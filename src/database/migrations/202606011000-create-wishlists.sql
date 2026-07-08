CREATE TABLE IF NOT EXISTS wishlists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  property_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_wishlists_customer_property (customer_id, property_id),
  INDEX idx_wishlists_customer_id (customer_id),
  INDEX idx_wishlists_property_id (property_id),

  CONSTRAINT fk_wishlists_customer
    FOREIGN KEY (customer_id) REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_wishlists_property
    FOREIGN KEY (property_id) REFERENCES properties(id)
    ON DELETE CASCADE
);
