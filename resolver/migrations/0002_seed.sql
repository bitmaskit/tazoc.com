-- Migration number: 0002 	 2025-09-06T10:42:56.202Z
INSERT OR REPLACE INTO links (short_code, destination, created_by, is_active, metadata) VALUES
    ('github', 'https://github.com', 'system', 1, '{"category": "development", "description": "GitHub homepage"}'),
    ('google', 'https://www.google.com', 'system', 1, '{"category": "search", "description": "Google search engine"}'),
    ('stripe', 'https://stripe.com/docs', 'system', 1, '{"category": "documentation", "description": "Stripe API documentation"}');
