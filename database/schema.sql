-- =====================================================
-- BAKERY POS SYSTEM - MODERN DATABASE SCHEMA
-- Version: 2.0
-- Created: 2024
--
-- This schema is an improved version of the original
-- posdb database with:
-- - Proper data types and constraints
-- - Foreign key relationships
-- - Indexes for performance
-- - Secure password hashing support (bcrypt compatible)
-- =====================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+05:30";

-- Create database
CREATE DATABASE IF NOT EXISTS `bakerypos_modern`
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE `bakerypos_modern`;

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Positions/Roles Table
CREATE TABLE `positions` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `permissions` JSON DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Users Table (Combined login + user)
CREATE TABLE `users` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL, -- bcrypt hash (60+ chars)
    `email` VARCHAR(100) DEFAULT NULL,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `title` VARCHAR(20) DEFAULT NULL, -- Mr./Mrs./Ms.
    `phone` VARCHAR(20) DEFAULT NULL,
    `position_id` INT UNSIGNED DEFAULT NULL,
    `image` VARCHAR(255) DEFAULT NULL,
    `status` ENUM('active', 'inactive') DEFAULT 'active',
    `last_login` TIMESTAMP NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`position_id`) REFERENCES `positions`(`id`) ON DELETE SET NULL,
    INDEX `idx_username` (`username`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB;

-- Company Settings Table
CREATE TABLE `company` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(200) NOT NULL,
    `address` TEXT,
    `phone` VARCHAR(50),
    `email` VARCHAR(100),
    `logo` VARCHAR(255),
    `currency` VARCHAR(10) DEFAULT 'Rs.',
    `tax_rate` DECIMAL(5,2) DEFAULT 0.00,
    `receipt_footer` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- PRODUCT MANAGEMENT
-- =====================================================

-- Brands/Categories Table
CREATE TABLE `brands` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `image` VARCHAR(255) DEFAULT NULL,
    `description` TEXT,
    `status` ENUM('active', 'inactive') DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_name` (`name`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB;

-- Products Table
CREATE TABLE `products` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(200) NOT NULL,
    `brand_id` INT UNSIGNED DEFAULT NULL,
    `price` DECIMAL(10,2) NOT NULL,
    `special_price` DECIMAL(10,2) DEFAULT NULL, -- After 7 PM price
    `size` VARCHAR(50) DEFAULT NULL,
    `description` TEXT,
    `image` VARCHAR(255) DEFAULT NULL,
    `is_special_pricing` TINYINT(1) DEFAULT 0, -- 0 = normal, 1 = special after 7pm
    `status` ENUM('active', 'inactive') DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON DELETE SET NULL,
    INDEX `idx_name` (`name`),
    INDEX `idx_brand` (`brand_id`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB;

-- =====================================================
-- INVENTORY MANAGEMENT
-- =====================================================

-- Daily Stock (Primary Products)
CREATE TABLE `stock` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `product_id` INT UNSIGNED NOT NULL,
    `quantity` DECIMAL(10,2) NOT NULL DEFAULT 0,
    `quantity_balance` DECIMAL(10,2) NOT NULL DEFAULT 0,
    `stock_date` DATE NOT NULL,
    `added_by` INT UNSIGNED DEFAULT NULL,
    `notes` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    UNIQUE KEY `unique_product_date` (`product_id`, `stock_date`),
    INDEX `idx_date` (`stock_date`),
    INDEX `idx_product` (`product_id`)
) ENGINE=InnoDB;

-- Secondary Stock Items (Other items like packaging, supplies)
CREATE TABLE `stock_items` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(200) NOT NULL,
    `unit_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
    `quantity` DECIMAL(10,2) NOT NULL DEFAULT 0,
    `unit` VARCHAR(50) DEFAULT 'pcs', -- pcs, kg, liters, etc
    `is_sellable` TINYINT(1) DEFAULT 1,
    `status` ENUM('active', 'inactive') DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_name` (`name`),
    INDEX `idx_sellable` (`is_sellable`)
) ENGINE=InnoDB;

-- =====================================================
-- SALES & BILLING
-- =====================================================

-- Bills Table
CREATE TABLE `bills` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `bill_number` VARCHAR(20) NOT NULL UNIQUE,
    `subtotal` DECIMAL(12,2) NOT NULL,
    `discount_percent` DECIMAL(5,2) DEFAULT 0,
    `discount_amount` DECIMAL(12,2) DEFAULT 0,
    `tax_amount` DECIMAL(12,2) DEFAULT 0,
    `total` DECIMAL(12,2) NOT NULL,
    `payment_method` ENUM('cash', 'card', 'mobile') DEFAULT 'cash',
    `amount_paid` DECIMAL(12,2) DEFAULT 0,
    `change_amount` DECIMAL(12,2) DEFAULT 0,
    `cashier_id` INT UNSIGNED DEFAULT NULL,
    `notes` TEXT,
    `status` ENUM('completed', 'cancelled', 'refunded') DEFAULT 'completed',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`cashier_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_bill_number` (`bill_number`),
    INDEX `idx_date` (`created_at`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB;

-- Bill Items Table
CREATE TABLE `bill_items` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `bill_id` INT UNSIGNED NOT NULL,
    `item_type` ENUM('product', 'stock_item') NOT NULL, -- P or S in original
    `item_id` INT UNSIGNED NOT NULL,
    `item_name` VARCHAR(200) NOT NULL, -- Denormalized for receipt printing
    `quantity` DECIMAL(10,2) NOT NULL,
    `unit_price` DECIMAL(10,2) NOT NULL,
    `total_price` DECIMAL(12,2) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`bill_id`) REFERENCES `bills`(`id`) ON DELETE CASCADE,
    INDEX `idx_bill` (`bill_id`),
    INDEX `idx_item` (`item_type`, `item_id`)
) ENGINE=InnoDB;

-- =====================================================
-- ORDER MANAGEMENT (Pre-orders/Custom Orders)
-- =====================================================

-- Orders Table
CREATE TABLE `orders` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `order_number` VARCHAR(20) NOT NULL UNIQUE,
    `customer_name` VARCHAR(200) NOT NULL,
    `customer_phone` VARCHAR(20) DEFAULT NULL,
    `order_date` DATE NOT NULL,
    `delivery_date` DATE DEFAULT NULL,
    `total_amount` DECIMAL(12,2) NOT NULL,
    `advance_amount` DECIMAL(12,2) DEFAULT 0,
    `balance_amount` DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - advance_amount) STORED,
    `status` ENUM('pending', 'in_progress', 'ready', 'completed', 'cancelled') DEFAULT 'pending',
    `payment_status` ENUM('pending', 'partial', 'paid') DEFAULT 'pending',
    `notes` TEXT,
    `created_by` INT UNSIGNED DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_order_number` (`order_number`),
    INDEX `idx_customer` (`customer_name`),
    INDEX `idx_status` (`status`),
    INDEX `idx_date` (`order_date`)
) ENGINE=InnoDB;

-- Order Items Table
CREATE TABLE `order_items` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT UNSIGNED NOT NULL,
    `item_type` ENUM('product', 'stock_item') NOT NULL,
    `item_id` INT UNSIGNED NOT NULL,
    `item_name` VARCHAR(200) NOT NULL,
    `quantity` DECIMAL(10,2) NOT NULL,
    `unit_price` DECIMAL(10,2) NOT NULL,
    `total_price` DECIMAL(12,2) NOT NULL,
    `notes` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    INDEX `idx_order` (`order_id`)
) ENGINE=InnoDB;

-- =====================================================
-- SUPPLIER MANAGEMENT
-- =====================================================

-- Suppliers Table
CREATE TABLE `suppliers` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(200) NOT NULL,
    `contact_person` VARCHAR(100) DEFAULT NULL,
    `phone` VARCHAR(50) DEFAULT NULL,
    `email` VARCHAR(100) DEFAULT NULL,
    `address` TEXT,
    `status` ENUM('active', 'inactive') DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_name` (`name`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB;

-- Supplier Payments Table
CREATE TABLE `supplier_payments` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `supplier_id` INT UNSIGNED NOT NULL,
    `amount` DECIMAL(12,2) NOT NULL,
    `payment_date` DATE NOT NULL,
    `payment_method` ENUM('cash', 'bank', 'cheque') DEFAULT 'cash',
    `reference` VARCHAR(100) DEFAULT NULL,
    `notes` TEXT,
    `created_by` INT UNSIGNED DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_supplier` (`supplier_id`),
    INDEX `idx_date` (`payment_date`)
) ENGINE=InnoDB;

-- =====================================================
-- AUDIT LOG (For tracking changes)
-- =====================================================

CREATE TABLE `audit_log` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT UNSIGNED DEFAULT NULL,
    `action` VARCHAR(50) NOT NULL,
    `table_name` VARCHAR(50) NOT NULL,
    `record_id` INT UNSIGNED DEFAULT NULL,
    `old_values` JSON DEFAULT NULL,
    `new_values` JSON DEFAULT NULL,
    `ip_address` VARCHAR(45) DEFAULT NULL,
    `user_agent` VARCHAR(255) DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_user` (`user_id`),
    INDEX `idx_action` (`action`),
    INDEX `idx_table` (`table_name`),
    INDEX `idx_date` (`created_at`)
) ENGINE=InnoDB;

-- =====================================================
-- INSERT DEFAULT DATA
-- =====================================================

-- Default Positions
INSERT INTO `positions` (`name`, `permissions`) VALUES
('Administrator', '{"all": true}'),
('Manager', '{"products": true, "stock": true, "orders": true, "reports": true, "pos": true}'),
('Cashier', '{"pos": true, "orders": true}');

-- Default Admin User (password: password123)
-- Password hash generated with password_hash('password123', PASSWORD_BCRYPT, ['cost' => 10])
INSERT INTO `users` (`username`, `password`, `first_name`, `last_name`, `position_id`, `status`) VALUES
('admin', '$2y$10$aNSy/4uhY6PnomcCEaDuf.UqRDtdMZcTN2HqRRTqk5KD7BLDbWjHK', 'System', 'Administrator', 1, 'active');

-- Default Company Settings
INSERT INTO `company` (`name`, `address`, `phone`, `currency`) VALUES
('Bakery POS', '123 Main Street', '+94 11 234 5678', 'Rs.');

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- Daily Sales Summary View
CREATE OR REPLACE VIEW `v_daily_sales` AS
SELECT
    DATE(b.created_at) AS sale_date,
    COUNT(b.id) AS total_bills,
    SUM(b.subtotal) AS gross_sales,
    SUM(b.discount_amount) AS total_discount,
    SUM(b.total) AS net_sales,
    SUM(bi.quantity) AS items_sold
FROM bills b
LEFT JOIN bill_items bi ON b.id = bi.bill_id
WHERE b.status = 'completed'
GROUP BY DATE(b.created_at);

-- Monthly Sales Summary View
CREATE OR REPLACE VIEW `v_monthly_sales` AS
SELECT
    YEAR(b.created_at) AS sale_year,
    MONTH(b.created_at) AS sale_month,
    COUNT(b.id) AS total_bills,
    SUM(b.subtotal) AS gross_sales,
    SUM(b.discount_amount) AS total_discount,
    SUM(b.total) AS net_sales
FROM bills b
WHERE b.status = 'completed'
GROUP BY YEAR(b.created_at), MONTH(b.created_at);

-- Product Sales View
CREATE OR REPLACE VIEW `v_product_sales` AS
SELECT
    bi.item_id,
    bi.item_name,
    bi.item_type,
    SUM(bi.quantity) AS total_quantity,
    SUM(bi.total_price) AS total_revenue,
    COUNT(DISTINCT bi.bill_id) AS times_sold
FROM bill_items bi
JOIN bills b ON bi.bill_id = b.id
WHERE b.status = 'completed'
GROUP BY bi.item_id, bi.item_name, bi.item_type;

-- Current Stock View
CREATE OR REPLACE VIEW `v_current_stock` AS
SELECT
    p.id AS product_id,
    p.name AS product_name,
    br.name AS brand_name,
    p.price,
    COALESCE(s.quantity_balance, 0) AS current_stock,
    s.stock_date
FROM products p
LEFT JOIN brands br ON p.brand_id = br.id
LEFT JOIN stock s ON p.id = s.product_id AND s.stock_date = CURDATE()
WHERE p.status = 'active';
