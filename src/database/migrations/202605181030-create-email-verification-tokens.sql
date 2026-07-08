CREATE TABLE email_verification_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_email_verification_tokens_user_id (user_id),
  INDEX idx_email_verification_tokens_token_hash (token_hash),
  INDEX idx_email_verification_tokens_expires_at (expires_at),

  CONSTRAINT fk_email_verification_tokens_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);
