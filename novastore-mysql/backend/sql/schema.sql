-- Run this script in MySQL Workbench (connected to your local MySQL SERVER).
-- MySQL 8.0+ / InnoDB. This is for a NEW NovaStore database.
CREATE DATABASE IF NOT EXISTS novastore CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE novastore;

CREATE TABLE IF NOT EXISTS users (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(100) NOT NULL,
 email VARCHAR(255) NOT NULL UNIQUE,
 password_hash TEXT NOT NULL,
 role ENUM('buyer','admin') NOT NULL DEFAULT 'buyer',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(150) NOT NULL,
 description TEXT NOT NULL,
 category VARCHAR(80) NOT NULL DEFAULT 'General',
 image_url TEXT NOT NULL,
 price DECIMAL(12,2) NOT NULL,
 stock INT NOT NULL,
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT products_price_nonnegative CHECK(price >= 0),
 CONSTRAINT products_stock_nonnegative CHECK(stock >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id BIGINT UNSIGNED NOT NULL,
 total DECIMAL(12,2) NOT NULL,
 status VARCHAR(30) NOT NULL DEFAULT 'placed',
 shipping_name VARCHAR(120) NOT NULL,
 shipping_address TEXT NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT orders_total_nonnegative CHECK(total >= 0),
 CONSTRAINT orders_user_fk FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 order_id BIGINT UNSIGNED NOT NULL,
 product_id BIGINT UNSIGNED NOT NULL,
 product_name VARCHAR(150) NOT NULL,
 quantity INT NOT NULL,
 unit_price DECIMAL(12,2) NOT NULL,
 CONSTRAINT items_quantity_positive CHECK(quantity > 0),
 CONSTRAINT items_price_nonnegative CHECK(unit_price >= 0),
 CONSTRAINT items_order_fk FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
 CONSTRAINT items_product_fk FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- Insert demo products only when table is empty.
INSERT INTO products (name, description, category, image_url, price, stock)
SELECT seed.name, seed.description, seed.category, seed.image_url, seed.price, seed.stock
FROM (
 SELECT 'Wireless Headphones' name, 'Comfortable everyday audio' description, 'Electronics' category, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700' image_url, 2499.00 price, 18 stock
 UNION ALL SELECT 'Everyday Backpack','Durable commuter backpack','Accessories','https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=700',1799.00,24
 UNION ALL SELECT 'Classic Sneakers','Versatile streetwear sneakers','Fashion','https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700',3299.00,12
 UNION ALL SELECT 'Minimal Watch','Timeless daily accessory','Accessories','https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700',2199.00,15
 UNION ALL SELECT 'Travel Bottle','Reusable insulated water bottle','Lifestyle','https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=700',799.00,35
 UNION ALL SELECT 'Desk Lamp','Soft adjustable desk lighting','Home','https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=700',1499.00,9
) seed
WHERE NOT EXISTS (SELECT 1 FROM products LIMIT 1);
