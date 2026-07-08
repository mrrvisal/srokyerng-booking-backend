CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE account_statuses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  status_name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  status_id INT NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(30),
  password_hash TEXT NOT NULL,
  profile_image_url TEXT,
  gender VARCHAR(20),
  date_of_birth DATE,
  address TEXT,
  last_login TIMESTAMP NULL,
  email_verified_at TIMESTAMP NULL,
  google_id VARCHAR(255) NULL UNIQUE COMMENT 'Google account subject id (sub claim) linked to this user, if any',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_users_role
    FOREIGN KEY (role_id) REFERENCES roles(id),

  CONSTRAINT fk_users_status
    FOREIGN KEY (status_id) REFERENCES account_statuses(id)
);

CREATE TABLE password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_password_reset_tokens_user_id (user_id),
  INDEX idx_password_reset_tokens_token_hash (token_hash),
  INDEX idx_password_reset_tokens_expires_at (expires_at),

  CONSTRAINT fk_password_reset_tokens_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  user_agent TEXT NULL,
  ip_address VARCHAR(45) NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP NULL,
  last_used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_refresh_tokens_user_id (user_id),
  INDEX idx_refresh_tokens_token_hash (token_hash),
  INDEX idx_refresh_tokens_expires_at (expires_at),

  CONSTRAINT fk_refresh_tokens_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

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

CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE property_statuses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  status_name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE countries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE provinces (
    id INT AUTO_INCREMENT PRIMARY KEY,
    country_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    UNIQUE (country_id, name),
    FOREIGN KEY (country_id) REFERENCES countries(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE cities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    province_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    UNIQUE (province_id, name),
    FOREIGN KEY (province_id) REFERENCES provinces(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE properties (
    id INT AUTO_INCREMENT PRIMARY KEY,

    owner_id INT NOT NULL,
    category_id INT NOT NULL,
    status_id INT NOT NULL,

    property_name VARCHAR(150) NOT NULL,
    description TEXT,

    address TEXT NOT NULL,
    city_id INT NOT NULL,

    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),

    contact_phone VARCHAR(30),
    contact_email VARCHAR(150),

    rejection_reason TEXT,
    approved_by INT NULL,
    approved_at TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,


    CONSTRAINT fk_properties_owner
        FOREIGN KEY (owner_id) REFERENCES users(id),

    CONSTRAINT fk_properties_category
        FOREIGN KEY (category_id) REFERENCES categories(id),

    CONSTRAINT fk_properties_status
        FOREIGN KEY (status_id) REFERENCES property_statuses(id),

    CONSTRAINT fk_properties_admin
        FOREIGN KEY (approved_by) REFERENCES users(id),

    CONSTRAINT fk_properties_city
        FOREIGN KEY (city_id) REFERENCES cities(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

CREATE TABLE property_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,

    image_url TEXT NOT NULL,
    is_cover BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_property_images_property
        FOREIGN KEY (property_id) REFERENCES properties(id)
        ON DELETE CASCADE
);

CREATE TABLE room_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type_name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,

    property_id INT NOT NULL,
    room_type_id INT NOT NULL,

    room_name VARCHAR(150) NOT NULL,
    description TEXT,

    price_per_night DECIMAL(10,2) NOT NULL,
    max_guests INT NOT NULL DEFAULT 1,
    total_rooms INT NOT NULL DEFAULT 1,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,

    CONSTRAINT fk_rooms_property
        FOREIGN KEY (property_id) REFERENCES properties(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_rooms_type
        FOREIGN KEY (room_type_id) REFERENCES room_types(id)
);

CREATE TABLE room_images (
    id INT AUTO_INCREMENT PRIMARY KEY,

    room_id INT NOT NULL,

    image_url TEXT NOT NULL,
    is_cover BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_room_images_room
        FOREIGN KEY (room_id) REFERENCES rooms(id)
        ON DELETE CASCADE
);

CREATE TABLE amenities (
    id INT AUTO_INCREMENT PRIMARY KEY,

    amenity_name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE property_amenities (
    property_id INT NOT NULL,
    amenity_id INT NOT NULL,

    PRIMARY KEY (property_id, amenity_id),

    CONSTRAINT fk_property_amenities_property
        FOREIGN KEY (property_id) REFERENCES properties(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_property_amenities_amenity
        FOREIGN KEY (amenity_id) REFERENCES amenities(id)
        ON DELETE CASCADE
);

CREATE TABLE reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,

    customer_id INT NOT NULL,
    room_id INT NOT NULL,

    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,

    total_guests INT NOT NULL,
    total_nights INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,

    reservation_status VARCHAR(50) NOT NULL DEFAULT 'pending',

    special_request TEXT,
    cancellation_reason TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_reservations_customer
        FOREIGN KEY (customer_id) REFERENCES users(id),

    CONSTRAINT fk_reservations_room
        FOREIGN KEY (room_id) REFERENCES rooms(id)
);

CREATE TABLE payment_methods (
    id INT AUTO_INCREMENT PRIMARY KEY,

    method_name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE payment_statuses (
    id INT AUTO_INCREMENT PRIMARY KEY,

    status_name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE owner_payment_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,

    owner_id INT NOT NULL,
    payment_method_id INT NOT NULL,

    account_name VARCHAR(150) NOT NULL,
    account_number VARCHAR(100),
    qr_image_url TEXT,

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_owner_payment_accounts_owner
        FOREIGN KEY (owner_id) REFERENCES users(id),

    CONSTRAINT fk_owner_payment_accounts_method
        FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)
);

CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,

    reservation_id INT NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    owner_id INT NOT NULL,

    payment_method_id INT NOT NULL,
    owner_payment_account_id INT NULL,
    payment_status_id INT NOT NULL,

    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',

    transaction_reference VARCHAR(255),
    rejection_reason TEXT,
    receipt_image_url TEXT,

    verified_by INT NULL,
    verified_at TIMESTAMP NULL,
    paid_at TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_payments_reservation
        FOREIGN KEY (reservation_id) REFERENCES reservations(id),

    CONSTRAINT fk_payments_customer
        FOREIGN KEY (customer_id) REFERENCES users(id),

    CONSTRAINT fk_payments_owner
        FOREIGN KEY (owner_id) REFERENCES users(id),

    CONSTRAINT fk_payments_method
        FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id),

    CONSTRAINT fk_payments_owner_account
        FOREIGN KEY (owner_payment_account_id) REFERENCES owner_payment_accounts(id),

    CONSTRAINT fk_payments_status
        FOREIGN KEY (payment_status_id) REFERENCES payment_statuses(id),

    CONSTRAINT fk_payments_verified_by
        FOREIGN KEY (verified_by) REFERENCES users(id)
);

CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,

    reservation_id INT NOT NULL UNIQUE,
    property_id INT NOT NULL,
    customer_id INT NOT NULL,

    rating INT NOT NULL,
    comment TEXT,

    owner_reply TEXT,
    replied_by INT NULL,
    replied_at TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_reviews_reservation
        FOREIGN KEY (reservation_id) REFERENCES reservations(id),

    CONSTRAINT fk_reviews_property
        FOREIGN KEY (property_id) REFERENCES properties(id),

    CONSTRAINT fk_reviews_customer
        FOREIGN KEY (customer_id) REFERENCES users(id),

    CONSTRAINT fk_reviews_owner_reply
        FOREIGN KEY (replied_by) REFERENCES users(id)
);

CREATE TABLE wishlists (
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

CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    notification_type VARCHAR(80) NOT NULL,
    channel VARCHAR(30) NOT NULL DEFAULT 'in_app',
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    metadata JSON NULL,
    delivery_status VARCHAR(30) NOT NULL DEFAULT 'pending',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    archived_at TIMESTAMP NULL,
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_notifications_user_id (user_id),
    INDEX idx_notifications_unread (user_id, is_read, created_at),
    INDEX idx_notifications_archived (user_id, archived_at, created_at),
    INDEX idx_notifications_type (notification_type),

    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE chat_conversations (
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

CREATE TABLE chat_messages (
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

CREATE TABLE reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reporter_id INT NOT NULL,
    assigned_admin_id INT NULL,
    property_id INT NULL,
    reservation_id INT NULL,
    payment_id INT NULL,
    report_type VARCHAR(80) NOT NULL,
    subject VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    resolution_note TEXT,
    resolved_by INT NULL,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_reports_reporter_id (reporter_id),
    INDEX idx_reports_assigned_admin_id (assigned_admin_id),
    INDEX idx_reports_status (status),
    INDEX idx_reports_property_id (property_id),
    INDEX idx_reports_reservation_id (reservation_id),
    INDEX idx_reports_payment_id (payment_id),

    CONSTRAINT fk_reports_reporter
        FOREIGN KEY (reporter_id) REFERENCES users(id),

    CONSTRAINT fk_reports_assigned_admin
        FOREIGN KEY (assigned_admin_id) REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_reports_property
        FOREIGN KEY (property_id) REFERENCES properties(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_reports_reservation
        FOREIGN KEY (reservation_id) REFERENCES reservations(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_reports_payment
        FOREIGN KEY (payment_id) REFERENCES payments(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_reports_resolved_by
        FOREIGN KEY (resolved_by) REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE TABLE report_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    sender_id INT NOT NULL,
    message_body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_report_messages_report_id (report_id),
    INDEX idx_report_messages_sender_id (sender_id),

    CONSTRAINT fk_report_messages_report
        FOREIGN KEY (report_id) REFERENCES reports(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_report_messages_sender
        FOREIGN KEY (sender_id) REFERENCES users(id)
);

CREATE TABLE report_attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    uploaded_by INT NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_report_attachments_report_id (report_id),
    INDEX idx_report_attachments_uploaded_by (uploaded_by),

    CONSTRAINT fk_report_attachments_report
        FOREIGN KEY (report_id) REFERENCES reports(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_report_attachments_uploaded_by
        FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE TABLE room_availability_blocks (
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

CREATE TABLE refund_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_id INT NOT NULL,
    requested_by INT NOT NULL,
    handled_by INT NULL,
    refund_status VARCHAR(50) NOT NULL DEFAULT 'requested',
    amount DECIMAL(10,2) NULL,
    reason TEXT,
    decision_note TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    handled_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_refund_requests_payment_id (payment_id),
    INDEX idx_refund_requests_requested_by (requested_by),
    INDEX idx_refund_requests_handled_by (handled_by),
    INDEX idx_refund_requests_status (refund_status),

    CONSTRAINT fk_refund_requests_payment
        FOREIGN KEY (payment_id) REFERENCES payments(id),

    CONSTRAINT fk_refund_requests_requested_by
        FOREIGN KEY (requested_by) REFERENCES users(id),

    CONSTRAINT fk_refund_requests_handled_by
        FOREIGN KEY (handled_by) REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    actor_id INT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id INT NULL,
    metadata JSON NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_audit_logs_actor_id (actor_id),
    INDEX idx_audit_logs_entity (entity_type, entity_id),
    INDEX idx_audit_logs_action (action),
    INDEX idx_audit_logs_created_at (created_at),

    CONSTRAINT fk_audit_logs_actor
        FOREIGN KEY (actor_id) REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE TABLE featured_properties (
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
