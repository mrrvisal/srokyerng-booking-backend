CREATE TABLE IF NOT EXISTS room_availability_blocks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  owner_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_room_availability_blocks_room_dates (room_id, start_date, end_date),
  INDEX idx_room_availability_blocks_owner_id (owner_id),

  CONSTRAINT fk_room_availability_blocks_room
    FOREIGN KEY (room_id) REFERENCES rooms(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_room_availability_blocks_owner
    FOREIGN KEY (owner_id) REFERENCES users(id)
);
