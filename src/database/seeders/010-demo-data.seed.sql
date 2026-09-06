-- =============================================================================
-- 010-demo-data.seed.sql
-- =============================================================================
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- IDEMPOTENT RESET: delete any previously-seeded demo rows (bottom-up by FK)
-- so this file can be re-run safely without stacking duplicates.
-- -----------------------------------------------------------------------------
DELETE FROM report_attachments;
DELETE FROM report_messages;
DELETE FROM reports;
DELETE FROM chat_messages;
DELETE FROM chat_conversations;
DELETE FROM wishlists;
DELETE FROM notifications;
DELETE FROM reviews;
DELETE FROM refund_requests;
DELETE FROM payments;
DELETE FROM reservations;
DELETE FROM room_availability_blocks;
DELETE FROM room_images;
DELETE FROM property_amenities;
DELETE FROM property_images;
DELETE FROM rooms;
DELETE FROM properties;
DELETE FROM owner_payment_accounts;
DELETE FROM featured_properties;
DELETE FROM audit_logs;
DELETE FROM property_update_requests;
DELETE FROM users WHERE id BETWEEN 2 AND 7;
-- -----------------------------------------------------------------------------
-- DEMO USERS  (role_id: 1=customer 2=owner 3=admin | status_id: 1=active 2=suspended)
-- All demo passwords are "Password123" (bcrypt hash below).
-- -----------------------------------------------------------------------------
INSERT INTO users (id, role_id, status_id, full_name, email, phone, password_hash, gender, date_of_birth, address, email_verified_at) VALUES
(2, 3, 1, 'Kim Chhay', 'kim.admin@example.com', '+85510000002', '$2b$10$E.20yokEOqliVSnLsp0Lw.iSdyU9odm1t9gUTyfQiT.IitcUG8R2m', 'male', '1988-04-12', 'Phnom Penh, Cambodia', NOW()),
(3, 2, 1, 'Sokha Pen', 'sokha.owner@example.com', '+85510000003', '$2b$10$E.20yokEOqliVSnLsp0Lw.iSdyU9odm1t9gUTyfQiT.IitcUG8R2m', 'female', '1985-08-22', 'Phnom Penh, Cambodia', NOW()),
(4, 2, 1, 'Chhay Torng', 'chhay.owner@example.com', '+85510000004', '$2b$10$E.20yokEOqliVSnLsp0Lw.iSdyU9odm1t9gUTyfQiT.IitcUG8R2m', 'male', '1982-02-17', 'Siem Reap, Cambodia', NOW()),
(5, 1, 1, 'Visal Ei', 'visal.customer@example.com', '+85510000005', '$2b$10$E.20yokEOqliVSnLsp0Lw.iSdyU9odm1t9gUTyfQiT.IitcUG8R2m', 'male', '1995-11-30', 'Phnom Penh, Cambodia', NOW()),
(6, 1, 1, 'Sreymom Chhay', 'sreymom.customer@example.com', '+85510000006', '$2b$10$E.20yokEOqliVSnLsp0Lw.iSdyU9odm1t9gUTyfQiT.IitcUG8R2m', 'female', '1997-07-08', 'Kampot, Cambodia', NOW()),
(7, 1, 2, 'Rith Kun', 'rith.customer@example.com', '+85510000007', '$2b$10$E.20yokEOqliVSnLsp0Lw.iSdyU9odm1t9gUTyfQiT.IitcUG8R2m', 'male', '1993-01-25', 'Battambang, Cambodia', NOW())
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), role_id = VALUES(role_id), status_id = VALUES(status_id), email_verified_at = VALUES(email_verified_at);

-- -----------------------------------------------------------------------------
-- PROPERTIES  (owner_id -> users | category_id -> categories | status_id: 2=approved 1=pending)
-- city_id: 13=Phnom Penh 18=Siem Reap 7=Kampot 19=Preah Sihanouk
-- -----------------------------------------------------------------------------
INSERT INTO properties (id, owner_id, category_id, status_id, city_id, property_name, description, address, latitude, longitude, contact_phone, contact_email, approved_by, approved_at) VALUES
(1, 3, 1, 2, 18, 'Angkor Paradise Hotel', 'Luxury hotel minutes from Angkor Wat with pool, spa and Khmer hospitality.', 'Street 60, Siem Reap', 13.3671, 103.8448, '+85512345678', 'angkor@paradise.kh', 2, NOW()),
(2, 3, 5, 2, 13, 'Mekong Riverside Villa', 'Serene villa on the Mekong riverbank with garden and river views.', 'Riverside Road, Phnom Penh', 11.5623, 104.9160, '+85598765432', 'mekong@villa.kh', 2, NOW()),
(3, 4, 6, 2, 19, 'Sihanoukville Beach Resort', 'Beachfront resort with infinity pool, bar and seafood restaurant.', 'Ochheuteal Beach, Preah Sihanouk', 10.6093, 103.5228, '+85511223344', 'beach@resort.kh', 2, NOW()),
(4, 4, 3, 1, 7, 'Kampot Heritage Homestay', 'Colonial-era homestay near the Kampot riverfront and Bokor trails.', 'Kampot Town', 10.6106, 104.1775, '+85599887766', 'stay@kampot.kh', NULL, NULL)
ON DUPLICATE KEY UPDATE property_name = VALUES(property_name), status_id = VALUES(status_id);

-- -----------------------------------------------------------------------------
-- PROPERTY IMAGES  (property_id -> properties)
-- -----------------------------------------------------------------------------
INSERT INTO property_images (property_id, image_url, is_cover, sort_order) VALUES
(1, 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800', 1, 1),
(1, 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800', 0, 2),
(1, 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800', 0, 3),
(2, 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800', 1, 1),
(2, 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', 0, 2),
(3, 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800', 1, 1),
(3, 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800', 0, 2),
(4, 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800', 1, 1),
(4, 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', 0, 2)
ON DUPLICATE KEY UPDATE image_url = VALUES(image_url);

-- -----------------------------------------------------------------------------
-- PROPERTY AMENITIES  (amenity_id: 1=Wi-Fi 2=Parking 3=Breakfast 4=AC 5=Pool 6=Restaurant 7=Gym 8=Laundry 9=Airport Shuttle 10=Pet Friendly)
-- -----------------------------------------------------------------------------
INSERT INTO property_amenities (property_id, amenity_id) VALUES
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 9),
(2, 1), (2, 2), (2, 3), (2, 4), (2, 6), (2, 8), (2, 10),
(3, 1), (3, 2), (3, 3), (3, 4), (3, 5), (3, 6), (3, 8), (3, 9),
(4, 1), (4, 3), (4, 4), (4, 8), (4, 10)
ON DUPLICATE KEY UPDATE property_id = property_id;

-- -----------------------------------------------------------------------------
-- ROOMS  (property_id -> properties | room_type_id: 1=Standard 2=Deluxe 3=Suite 4=Family 5=Single 6=Double 7=Twin)
-- -----------------------------------------------------------------------------
INSERT INTO rooms (id, property_id, room_type_id, room_name, description, max_guests, price_per_night, total_rooms, floor_number) VALUES
(1, 1, 2, 'Deluxe King Room', 'Spacious 35m2 room with king bed and city view.', 2, 65.00, 8, 2),
(2, 1, 3, 'Family Suite', 'Two-bedroom suite with living area, sleeps 4.', 4, 120.00, 4, 3),
(3, 1, 1, 'Standard Twin', 'Comfortable twin room for friends or colleagues.', 2, 40.00, 10, 1),
(4, 2, 3, 'River View Suite', 'Premium suite with panoramic Mekong views.', 2, 150.00, 3, 4),
(5, 2, 4, 'Family Villa', 'Entire ground-floor villa with garden access.', 6, 220.00, 2, 1),
(6, 3, 2, 'Deluxe Ocean View', 'Beach-facing room with balcony and ocean views.', 2, 95.00, 6, 2),
(7, 3, 4, 'Beach Family Bungalow', 'Standalone bungalow steps from the sand.', 5, 140.00, 4, 1),
(8, 4, 5, 'Heritage Single Room', 'Cozy single room in the colonial house.', 1, 20.00, 3, 1),
(9, 4, 6, 'Heritage Double Room', 'Double room with period furnishings.', 2, 30.00, 4, 2)
ON DUPLICATE KEY UPDATE room_name = VALUES(room_name), price_per_night = VALUES(price_per_night);
-- -----------------------------------------------------------------------------
-- ROOM IMAGES  (room_id -> rooms)
-- -----------------------------------------------------------------------------
INSERT INTO room_images (room_id, image_url, is_cover, sort_order) VALUES
(1, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800', 1, 1),
(2, 'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=800', 1, 1),
(3, 'https://images.unsplash.com/photo-1599619351208-3e6c839d6828?w=800', 1, 1),
(4, 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800', 1, 1),
(5, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', 1, 1),
(6, 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800', 1, 1),
(7, 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800', 1, 1),
(8, 'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=800', 1, 1),
(9, 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800', 1, 1)
ON DUPLICATE KEY UPDATE image_url = VALUES(image_url);

-- -----------------------------------------------------------------------------
-- ROOM AVAILABILITY BLOCKS  (room_id -> rooms)
-- -----------------------------------------------------------------------------
INSERT INTO room_availability_blocks (room_id, owner_id, start_date, end_date, reason) VALUES
(1, 3, DATE_ADD(CURDATE(), INTERVAL 5 DAY), DATE_ADD(CURDATE(), INTERVAL 6 DAY), 'maintenance'),
(2, 3, DATE_ADD(CURDATE(), INTERVAL 10 DAY), DATE_ADD(CURDATE(), INTERVAL 12 DAY), 'booked-offline'),
(6, 4, DATE_ADD(CURDATE(), INTERVAL 3 DAY), DATE_ADD(CURDATE(), INTERVAL 4 DAY), 'maintenance')
ON DUPLICATE KEY UPDATE reason = VALUES(reason);

-- -----------------------------------------------------------------------------
-- RESERVATIONS  (customer_id -> users | room_id -> rooms | reservation_status: pending/confirmed/cancelled/completed)
-- -----------------------------------------------------------------------------
INSERT INTO reservations (id, customer_id, room_id, check_in_date, check_out_date, total_guests, total_nights, total_amount, reservation_status, special_request) VALUES
(1, 5, 1, DATE_ADD(CURDATE(), INTERVAL 7 DAY), DATE_ADD(CURDATE(), INTERVAL 10 DAY), 2, 3, 165.00, 'confirmed', 'Late check-in around 9pm please.'),
(2, 5, 4, DATE_ADD(CURDATE(), INTERVAL 14 DAY), DATE_ADD(CURDATE(), INTERVAL 16 DAY), 2, 2, 260.00, 'pending', 'Champagne on arrival if possible.'),
(3, 6, 6, DATE_ADD(CURDATE(), INTERVAL -10 DAY), DATE_ADD(CURDATE(), INTERVAL -7 DAY), 2, 3, 240.00, 'completed', NULL),
(4, 6, 8, DATE_ADD(CURDATE(), INTERVAL 3 DAY), DATE_ADD(CURDATE(), INTERVAL 5 DAY), 1, 2, 36.00, 'confirmed', 'Vegetarian breakfast please.'),
(5, 5, 3, DATE_ADD(CURDATE(), INTERVAL -20 DAY), DATE_ADD(CURDATE(), INTERVAL -18 DAY), 2, 2, 70.00, 'cancelled', NULL),
(6, 6, 2, DATE_ADD(CURDATE(), INTERVAL 21 DAY), DATE_ADD(CURDATE(), INTERVAL 24 DAY), 3, 3, 297.00, 'pending', 'Need a baby cot.')
ON DUPLICATE KEY UPDATE reservation_status = VALUES(reservation_status), total_amount = VALUES(total_amount);

-- -----------------------------------------------------------------------------
-- PAYMENTS  (payment_method_id -> payment_methods | payment_status_id: 1=pending 2=submitted 3=paid 4=failed 5=refunded)
-- -----------------------------------------------------------------------------
INSERT INTO payments (id, reservation_id, customer_id, owner_id, payment_method_id, payment_status_id, amount, currency, transaction_reference, receipt_image_url, verified_by, verified_at, paid_at) VALUES
(1, 1, 5, 3, 1, 3, 165.00, 'USD', 'ABA-20250901-7732', 'https://example.com/proofs/pay1.jpg', 2, NOW(), NOW()),
(2, 2, 5, 3, 2, 1, 260.00, 'USD', NULL, NULL, NULL, NULL, NULL),
(3, 3, 6, 4, 3, 3, 240.00, 'USD', 'WING-20250820-1145', 'https://example.com/proofs/pay3.jpg', 2, NOW(), NOW()),
(4, 4, 6, 4, 1, 2, 36.00, 'USD', 'ABA-20250903-9981', 'https://example.com/proofs/pay4.jpg', NULL, NULL, NOW()),
(5, 5, 5, 3, 4, 4, 70.00, 'USD', 'VATT-20250815-3300', 'https://example.com/proofs/pay5.jpg', NULL, NULL, NULL),
(6, 6, 6, 4, 2, 1, 297.00, 'USD', NULL, NULL, NULL, NULL, NULL)
ON DUPLICATE KEY UPDATE payment_status_id = VALUES(payment_status_id), amount = VALUES(amount);
-- -----------------------------------------------------------------------------
-- REFUND REQUESTS  (payment_id -> payments | requested_by/handled_by -> users | refund_status: requested/approved/rejected)
-- -----------------------------------------------------------------------------
INSERT INTO refund_requests (id, payment_id, requested_by, handled_by, refund_status, amount, reason, decision_note, requested_at, handled_at) VALUES
(1, 5, 5, 2, 'approved', 70.00, 'Cancelled due to travel disruption.', 'Full refund approved.', NOW(), NOW()),
(2, 3, 6, NULL, 'requested', 120.00, 'Room was not as described.', NULL, NOW(), NULL)
ON DUPLICATE KEY UPDATE refund_status = VALUES(refund_status), handled_by = VALUES(handled_by);

-- -----------------------------------------------------------------------------
-- REVIEWS  (reservation_id -> reservations | property_id -> properties | customer_id -> users | replied_by -> users)
-- -----------------------------------------------------------------------------
INSERT INTO reviews (id, reservation_id, property_id, customer_id, rating, comment, owner_reply, replied_by, replied_at) VALUES
(1, 3, 3, 6, 5, 'Absolutely stunning beachfront location! The ocean view room was spotless and the staff were incredibly welcoming.', 'Thank you Sreymom! You are always welcome here.', 4, NOW()),
(2, 4, 4, 6, 4, 'Charming homestay with lots of character. The only issue was the shared bathroom but everything else was wonderful.', NULL, NULL, NULL),
(3, 1, 1, 5, 5, 'Perfect location for visiting Angkor Wat, and the pool was great after a day of exploring.', NULL, NULL, NULL),
(4, 5, 1, 5, 3, 'Decent standard room but a bit noisy from the street. Good value for the price.', NULL, NULL, NULL)
ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment);

-- -----------------------------------------------------------------------------
-- NOTIFICATIONS  (user_id -> users | notification_type values match backend constants)
-- -----------------------------------------------------------------------------
INSERT INTO notifications (id, user_id, notification_type, channel, title, message, metadata, delivery_status, is_read, read_at, sent_at) VALUES
(1, 5, 'reservation_confirmed', 'in_app', 'Reservation Confirmed', 'Your reservation at Angkor Paradise Hotel has been confirmed.', '{"reference_type":"reservation","reference_id":1}', 'delivered', 1, NOW(), NOW()),
(2, 5, 'payment_reminder', 'in_app', 'Payment Reminder', 'Please submit your payment proof for reservation #2 within 24 hours.', '{"reference_type":"reservation","reference_id":2}', 'pending', 0, NULL, NULL),
(3, 6, 'review_received', 'in_app', 'New Review', 'A guest left a 5-star review on Sihanoukville Beach Resort.', '{"reference_type":"review","reference_id":1}', 'delivered', 1, NOW(), NOW()),
(4, 3, 'reservation_pending', 'in_app', 'New Booking', 'Visal Ei booked the Deluxe King Room at Angkor Paradise Hotel.', '{"reference_type":"reservation","reference_id":1}', 'pending', 0, NULL, NULL),
(5, 4, 'review_approved', 'in_app', 'Review Published', 'Your review of Sihanoukville Beach Resort has been published.', '{"reference_type":"review","reference_id":1}', 'pending', 0, NULL, NULL),
(6, 5, 'refund_processed', 'in_app', 'Refund Processed', 'Your refund of $70.00 for reservation #5 has been approved.', '{"reference_type":"refund","reference_id":1}', 'pending', 0, NULL, NULL),
(7, 7, 'account_suspended', 'in_app', 'Account Suspended', 'Your account has been suspended due to policy violations.', '{"reference_type":"user","reference_id":7}', 'pending', 0, NULL, NULL)
ON DUPLICATE KEY UPDATE is_read = VALUES(is_read);

-- -----------------------------------------------------------------------------
-- WISHLISTS  (customer_id -> users | property_id -> properties)
-- -----------------------------------------------------------------------------
INSERT INTO wishlists (customer_id, property_id, created_at) VALUES
(5, 1, NOW()), (5, 3, NOW()), (6, 2, NOW()), (6, 4, NOW()), (5, 4, NOW())
ON DUPLICATE KEY UPDATE customer_id = customer_id;
-- -----------------------------------------------------------------------------
-- CHAT CONVERSATIONS + MESSAGES  (customer_id/owner_id -> users)
-- -----------------------------------------------------------------------------
INSERT INTO chat_conversations (id, property_id, reservation_id, customer_id, owner_id, status, last_message_at, created_at) VALUES
(1, 1, 1, 5, 3, 'active', NOW(), NOW()),
(2, 3, 3, 6, 4, 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE last_message_at = VALUES(last_message_at);

INSERT INTO chat_messages (id, conversation_id, sender_id, message_body, attachment_url, is_read, read_at, created_at) VALUES
(1, 1, 5, 'Hi! Is the Deluxe King Room available next month?', NULL, 1, NOW(), NOW()),
(2, 1, 3, 'Yes it is! Would you like me to hold it for you?', NULL, 0, NULL, NOW()),
(3, 2, 6, 'Hi, do you offer airport pickup from the airport?', NULL, 1, NOW(), NOW()),
(4, 2, 4, 'We can arrange it for $15. Just send your flight details.', NULL, 0, NULL, NOW())
ON DUPLICATE KEY UPDATE message_body = VALUES(message_body);

-- -----------------------------------------------------------------------------
-- REPORTS  (reporter_id -> users | assigned_admin_id/resolved_by -> users)
-- -----------------------------------------------------------------------------
INSERT INTO reports (id, reporter_id, assigned_admin_id, property_id, reservation_id, report_type, subject, description, status, resolution_note, resolved_by, resolved_at, created_at, updated_at) VALUES
(1, 5, NULL, NULL, NULL, 'suspicious_account', 'Suspicious account - payment scam', 'This user sent me spam messages asking for bank details and to pay outside the platform.', 'under_review', NULL, NULL, NULL, NOW(), NOW()),
(2, 3, 2, 1, 1, 'no_show', 'Guest no-show', 'Guest confirmed a reservation but never arrived and is not responding.', 'resolved', 'Guest contacted - family emergency. Case closed.', 2, NOW(), NOW(), NOW())
ON DUPLICATE KEY UPDATE status = VALUES(status), resolved_by = VALUES(resolved_by);

-- -----------------------------------------------------------------------------
-- REPORT MESSAGES  (report_id -> reports | sender_id -> users)
-- -----------------------------------------------------------------------------
INSERT INTO report_messages (id, report_id, sender_id, message_body, created_at) VALUES
(1, 1, 5, 'He asked me to pay outside the platform. Seems like a scam.', NOW()),
(2, 1, 2, 'We have suspended the reported account pending investigation.', NOW()),
(3, 2, 3, 'The guest has not checked in and is not answering calls.', NOW())
ON DUPLICATE KEY UPDATE message_body = VALUES(message_body);

-- -----------------------------------------------------------------------------
-- REPORT ATTACHMENTS  (report_id -> reports | uploaded_by -> users)
-- -----------------------------------------------------------------------------
INSERT INTO report_attachments (id, report_id, uploaded_by, file_url, file_type, created_at) VALUES
(1, 1, 5, 'https://example.com/evidence/chat_screenshot.png', 'image', NOW()),
(2, 2, 3, 'https://example.com/evidence/reservation_proof.pdf', 'document', NOW())
ON DUPLICATE KEY UPDATE file_url = VALUES(file_url);
-- -----------------------------------------------------------------------------
-- OWNER PAYMENT ACCOUNTS  (owner_id -> users | payment_method_id -> payment_methods)
-- -----------------------------------------------------------------------------
INSERT INTO owner_payment_accounts (id, owner_id, payment_method_id, account_name, account_number, qr_image_url, is_active) VALUES
(1, 3, 1, 'Sokha Pen', '0123456789', NULL, 1),
(2, 3, 3, 'Sokha Pen', '0123456789', NULL, 1),
(3, 4, 2, 'Dara Khouth', '9876543210', NULL, 1),
(4, 4, 5, 'Dara Khouth', '9876543210', NULL, 0)
ON DUPLICATE KEY UPDATE account_name = VALUES(account_name), is_active = VALUES(is_active);

-- -----------------------------------------------------------------------------
-- FEATURED PROPERTIES  (property_id -> properties | featured_by -> users)
-- -----------------------------------------------------------------------------
INSERT INTO featured_properties (id, property_id, featured_by, feature_label, sort_order, starts_at, ends_at, is_active) VALUES
(1, 1, 2, 'Top Pick - Siem Reap', 1, NOW(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), 1),
(2, 2, 2, 'Editor Choice - Phnom Penh', 2, NOW(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), 1)
ON DUPLICATE KEY UPDATE feature_label = VALUES(feature_label), is_active = VALUES(is_active);

-- -----------------------------------------------------------------------------
-- AUDIT LOGS  (actor_id -> users)
-- -----------------------------------------------------------------------------
INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata, ip_address, user_agent, created_at) VALUES
(1, 2, 'property.approve', 'property', 1, '{"name":"Angkor Paradise Hotel"}', '192.168.1.10', 'Mozilla/5.0', NOW()),
(2, 2, 'property.approve', 'property', 2, '{"name":"Mekong Riverside Villa"}', '192.168.1.10', 'Mozilla/5.0', NOW()),
(3, 2, 'user.suspend', 'user', 7, '{"reason":"Spam messages reported"}', '192.168.1.10', 'Mozilla/5.0', NOW()),
(4, 5, 'reservation.create', 'reservation', 1, '{"room_id":1,"total":165}', '203.144.68.12', 'Mozilla/5.0', NOW()),
(5, 3, 'reservation.confirm', 'reservation', 1, '{"customer_id":5}', '119.15.82.33', 'Mozilla/5.0', NOW()),
(6, 2, 'refund.approve', 'refund', 1, '{"amount":70}', '192.168.1.10', 'Mozilla/5.0', NOW())
ON DUPLICATE KEY UPDATE action = VALUES(action);

-- -----------------------------------------------------------------------------
-- PROPERTY UPDATE REQUESTS  (property_id -> properties | owner_id -> users | reviewed_by -> users)
-- -----------------------------------------------------------------------------
INSERT INTO property_update_requests (id, property_id, owner_id, update_data, status, rejection_reason, reviewed_by, reviewed_at) VALUES
(1, 1, 3, '{"property_name":"Angkor Paradise Hotel & Spa","description":"Now with a full-service spa and wellness center."}', 'pending', NULL, NULL, NULL),
(2, 3, 4, '{"price_per_night":85,"description":"Updated beachfront resort with new infinity pool."}', 'approved', NULL, 2, NOW()),
(3, 2, 3, '{"cancellation_policy":"No refund within 24 hours."}', 'rejected', 'Policy violates our guest-friendly terms.', 2, NOW())
ON DUPLICATE KEY UPDATE status = VALUES(status), reviewed_by = VALUES(reviewed_by);

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- END OF DEMO DATA
-- =============================================================================
