ALTER TABLE refresh_tokens
  ADD COLUMN user_agent TEXT NULL AFTER token_hash,
  ADD COLUMN ip_address VARCHAR(45) NULL AFTER user_agent,
  ADD COLUMN last_used_at TIMESTAMP NULL AFTER revoked_at;
