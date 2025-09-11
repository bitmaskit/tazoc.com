#!/bin/bash

# Database Migration Script for Tazoc URL Shortener
# Usage: ./scripts/migrate.sh [database_name]

set -e

# Default database name (from wrangler.jsonc)
DEFAULT_DB_NAME="valio-shortener"

# Use provided database name or default
DB_NAME=${1:-$DEFAULT_DB_NAME}

echo "🗄️  Running database migrations for database: $DB_NAME"
echo ""

# Change to resolver directory where migrations are located
cd "$(dirname "$0")/../resolver"

# Check if migrations directory exists
if [ ! -d "migrations" ]; then
    echo "❌ Error: migrations directory not found in resolver/"
    exit 1
fi

# List current migration status
echo "📋 Current migration status:"
npx wrangler d1 migrations list "$DB_NAME" --remote

echo ""
echo "🚀 Applying pending migrations..."

# Apply all pending migrations
if npx wrangler d1 migrations apply "$DB_NAME" --remote; then
    echo "✅ All migrations applied successfully!"
else
    echo "❌ Migration failed"
    exit 1
fi

echo ""

# Verify the tables were created
echo "🔍 Verifying database schema..."
npx wrangler d1 execute "$DB_NAME" --remote --command="SELECT name FROM sqlite_master WHERE type='table';"

echo ""
echo "✅ Database migrations completed for: $DB_NAME"