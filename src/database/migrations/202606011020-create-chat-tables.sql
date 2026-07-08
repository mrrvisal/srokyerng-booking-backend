CREATE TABLE IF NOT EXISTS chat_conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NULL,
  reservation_id INT NULL,
  customer_id INT NOT NULL,
  owner_id INT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'open',
  last_message_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_chat_conversations_reservation (reservation_id),
  INDEX idx_chat_conversations_customer_id (customer_id),
  INDEX idx_chat_conversations_owner_id (owner_id),
  INDEX idx_chat_conversations_property_id (property_id),

  CONSTRAINT fk_chat_conversations_property
    FOREIGN KEY (property_id) REFERENCES properties(id)
    ON DELETE SET NULL,

  CONSTRAINT fk_chat_conversations_reservation
    FOREIGN KEY (reservation_id) REFERENCES reservations(id)
    ON DELETE SET NULL,

  CONSTRAINT fk_chat_conversations_customer
    FOREIGN KEY (customer_id) REFERENCES users(id),

  CONSTRAINT fk_chat_conversations_owner
    FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  sender_id INT NOT NULL,
  message_body TEXT NOT NULL,
  attachment_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_chat_messages_conversation_id (conversation_id),
  INDEX idx_chat_messages_sender_id (sender_id),
  INDEX idx_chat_messages_created_at (created_at),

  CONSTRAINT fk_chat_messages_conversation
    FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_chat_messages_sender
    FOREIGN KEY (sender_id) REFERENCES users(id)
);
