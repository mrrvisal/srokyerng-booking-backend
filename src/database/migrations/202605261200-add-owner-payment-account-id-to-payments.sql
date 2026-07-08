ALTER TABLE payments
  ADD COLUMN owner_payment_account_id INT NULL AFTER payment_method_id,
  ADD CONSTRAINT fk_payments_owner_account FOREIGN KEY (owner_payment_account_id) REFERENCES owner_payment_accounts(id);
