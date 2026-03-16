-- Drop existing tables to ensure a clean slate (optional, commented out for safety)
-- DROP TABLE IF EXISTS order_items, orders, products, delivery_tiers, businesses, user_addresses, users CASCADE;

-- Create Enums if they don't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('customer', 'retailer', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE address_label AS ENUM ('home', 'work', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'accepted', 'out_for_delivery', 'delivered', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    role VARCHAR(50) DEFAULT 'customer',
    lat DECIMAL(10,7),
    lng DECIMAL(10,7),
    city VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. User Addresses Table
CREATE TABLE IF NOT EXISTS user_addresses (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(20) DEFAULT 'home',
    custom_label VARCHAR(100),
    address_text TEXT NOT NULL,
    lat DECIMAL(10,7) NOT NULL,
    lng DECIMAL(10,7) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Businesses Table
CREATE TABLE IF NOT EXISTS businesses (
    id SERIAL PRIMARY KEY,
    retailer_id INT REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    home_phone VARCHAR(20),
    business_phone VARCHAR(20),
    home_address TEXT,
    business_address TEXT NOT NULL,
    aadhar_number VARCHAR(50),
    tags TEXT[],
    is_active BOOLEAN DEFAULT true,
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    city VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Delivery Tiers Table
CREATE TABLE IF NOT EXISTS delivery_tiers (
    id SERIAL PRIMARY KEY,
    business_id INT REFERENCES businesses(id) ON DELETE CASCADE,
    max_distance_meters INT NOT NULL,
    fee_rupees INT NOT NULL
);

-- 5. Products Table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    business_id INT REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    stock_qty INT DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    image1_url VARCHAR(255),
    image2_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES users(id) ON DELETE SET NULL,
    business_id INT REFERENCES businesses(id) ON DELETE RESTRICT,
    items_snapshot JSONB NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    delivery_address TEXT NOT NULL,
    delivery_lat DECIMAL(10,7),
    delivery_lng DECIMAL(10,7),
    payment_method VARCHAR(50) DEFAULT 'cod',
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 7. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE RESTRICT,
    product_name VARCHAR(255),
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(10,2)
);

-- 8. Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS reviews_one_per_customer ON reviews(product_id, customer_id);
