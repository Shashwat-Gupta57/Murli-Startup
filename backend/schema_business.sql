-- Add lat/lng and businesses + delivery_tiers tables

CREATE TABLE IF NOT EXISTS businesses (
    id SERIAL PRIMARY KEY,
    retailer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    home_phone VARCHAR(50),
    business_phone VARCHAR(50),
    home_address TEXT,
    business_address TEXT,
    aadhar_number VARCHAR(20),
    tags TEXT[],
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS delivery_tiers (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    max_distance_meters INTEGER NOT NULL,
    fee_rupees INTEGER NOT NULL
);
