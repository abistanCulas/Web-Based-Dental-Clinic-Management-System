-- Default Users:
-- password for all test users is 'password123' (BCrypt: $2a$10$w8f8sQ7s7rW6J0vP/XWwte7VbS.7lKqQoOeq7p4F6N7g01RjR87cW)
INSERT INTO users (username, email, password, role) 
SELECT 'manager', 'manager@dentalclinic.lk', '$2a$10$w8f8sQ7s7rW6J0vP/XWwte7VbS.7lKqQoOeq7p4F6N7g01RjR87cW', 'INVENTORY_MANAGER'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'manager');

INSERT INTO users (username, email, password, role) 
SELECT 'admin', 'admin@dentalclinic.lk', '$2a$10$w8f8sQ7s7rW6J0vP/XWwte7VbS.7lKqQoOeq7p4F6N7g01RjR87cW', 'ADMIN'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

INSERT INTO users (username, email, password, role) 
SELECT 'nurse', 'nurse@dentalclinic.lk', '$2a$10$w8f8sQ7s7rW6J0vP/XWwte7VbS.7lKqQoOeq7p4F6N7g01RjR87cW', 'NURSE'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'nurse');

INSERT INTO users (username, email, password, role) 
SELECT 'supplier', 'supplier@medidental.lk', '$2a$10$w8f8sQ7s7rW6J0vP/XWwte7VbS.7lKqQoOeq7p4F6N7g01RjR87cW', 'SUPPLIER'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'supplier');

INSERT INTO users (username, email, password, role) 
SELECT 'pharmacist', 'pharmacist@dentalclinic.lk', '$2a$10$w8f8sQ7s7rW6J0vP/XWwte7VbS.7lKqQoOeq7p4F6N7g01RjR87cW', 'PHARMACIST'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'pharmacist');

-- Initial Suppliers
INSERT INTO suppliers (id, supplier_name, contact_person, email, phone, address, registration_number, status)
SELECT 1, 'MediDental Supplies Ltd', 'Sunil Perera', 'sunil@medidental.lk', '0771234567', '45 Galle Road, Colombo 03', 'REG-2023-089', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE id = 1);

INSERT INTO suppliers (id, supplier_name, contact_person, email, phone, address, registration_number, status)
SELECT 2, 'Lanka Ortho Care', 'Kavinda Fernando', 'orders@lankaortho.lk', '0719876543', '12 Kandy Road, Kiribathgoda', 'REG-2024-112', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE id = 2);

-- Initial Inventory Items (with Manufacture Date & Expiry Date)
INSERT INTO inventory_items (id, item_name, category, description, unit, quantity, minimum_stock_level, unit_price, manufacture_date, expiry_date, status, supplier_id)
SELECT 1, 'Dental Composite Resin (A2)', 'MATERIAL', 'Universal light-cure restorative composite', 'Syringe', 25, 10, 4500.00, '2024-01-10', '2027-05-15', 'ACTIVE', 1
WHERE NOT EXISTS (SELECT 1 FROM inventory_items WHERE id = 1);

INSERT INTO inventory_items (id, item_name, category, description, unit, quantity, minimum_stock_level, unit_price, manufacture_date, expiry_date, status, supplier_id)
SELECT 2, 'Lidocaine 2% with Epinephrine', 'MATERIAL', 'Local dental anesthetic cartridges', 'Box (50)', 4, 15, 6800.00, '2023-06-01', '2026-12-31', 'LOW_STOCK', 1
WHERE NOT EXISTS (SELECT 1 FROM inventory_items WHERE id = 2);

-- An expired item for Nurse / Manager testing
INSERT INTO inventory_items (id, item_name, category, description, unit, quantity, minimum_stock_level, unit_price, manufacture_date, expiry_date, status, supplier_id)
SELECT 3, 'Expired Dental Impression Alginate', 'MATERIAL', 'Fast-setting chromatic alginate impression powder', 'Pack (450g)', 8, 5, 2100.00, '2023-01-15', '2024-02-01', 'EXPIRED', 1
WHERE NOT EXISTS (SELECT 1 FROM inventory_items WHERE id = 3);

INSERT INTO inventory_items (id, item_name, category, description, unit, quantity, minimum_stock_level, unit_price, manufacture_date, expiry_date, status, supplier_id)
SELECT 4, 'Dental Ultrasonic Scaler Tip G1', 'EQUIPMENT', 'Autoclavable supragingival scaling tip', 'Piece', 2, 5, 3500.00, '2024-03-20', NULL, 'LOW_STOCK', 2
WHERE NOT EXISTS (SELECT 1 FROM inventory_items WHERE id = 4);
