CREATE TABLE property_update_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,

    property_id INT NOT NULL,
    owner_id INT NOT NULL,

    update_data JSON NOT NULL,

    status ENUM(
        'pending',
        'approved',
        'rejected'
    ) DEFAULT 'pending',

    rejection_reason TEXT NULL,

    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_property_update_property
      FOREIGN KEY (property_id) REFERENCES properties(id),

    CONSTRAINT fk_property_update_owner
      FOREIGN KEY (owner_id) REFERENCES users(id),

    CONSTRAINT fk_property_update_admin
      FOREIGN KEY (reviewed_by) REFERENCES users(id)
);