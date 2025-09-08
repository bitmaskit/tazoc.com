-- Migration number: 0003 	 2025-09-08T00:00:00.000Z
-- Migration: Create dead letter queue table for failed analytics messages
-- Created: 2025-09-08

CREATE TABLE IF NOT EXISTS dead_letter_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id TEXT UNIQUE NOT NULL,
    short_code TEXT,
    timestamp TEXT,
    failure_reason TEXT NOT NULL,
    message_body TEXT NOT NULL, -- JSON string of the original message
    attempts INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME, -- When/if the message was eventually processed
    is_resolved BOOLEAN DEFAULT 0 -- Whether the issue has been resolved
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dead_letter_message_id ON dead_letter_queue(message_id);
CREATE INDEX IF NOT EXISTS idx_dead_letter_short_code ON dead_letter_queue(short_code);
CREATE INDEX IF NOT EXISTS idx_dead_letter_created_at ON dead_letter_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_dead_letter_is_resolved ON dead_letter_queue(is_resolved);
CREATE INDEX IF NOT EXISTS idx_dead_letter_failure_reason ON dead_letter_queue(failure_reason);