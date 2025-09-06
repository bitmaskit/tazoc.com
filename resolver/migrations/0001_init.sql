-- Migration number: 0001 	 2025-09-06T10:40:58.153Z
-- Migration: Create links table
-- Created: 2025-09-06

CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    short_code TEXT UNIQUE NOT NULL,
    destination TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    created_by TEXT,
    is_active BOOLEAN DEFAULT 1,
    click_count INTEGER DEFAULT 0,
    metadata TEXT -- JSON string for additional data
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_links_short_code ON links(short_code);
CREATE INDEX IF NOT EXISTS idx_links_created_at ON links(created_at);
CREATE INDEX IF NOT EXISTS idx_links_is_active ON links(is_active);
CREATE INDEX IF NOT EXISTS idx_links_expires_at ON links(expires_at);
