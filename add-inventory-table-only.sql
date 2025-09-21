-- Quick script to add just the inventory table
-- Run this if you already have the main database set up

CREATE TABLE IF NOT EXISTS inventory (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    credits INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory(name);
CREATE INDEX IF NOT EXISTS idx_inventory_credits ON inventory(credits);
CREATE INDEX IF NOT EXISTS idx_inventory_created_at ON inventory(created_at);

-- Test insert (optional)
-- INSERT INTO inventory (id, name, image_url, credits) VALUES 
-- ('test-card-1', 'Test Card', 'https://example.com/test.jpg', 10);

