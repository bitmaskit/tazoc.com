# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a URL shortener service built on Cloudflare's edge infrastructure with two main components:
- **Shortener Worker**: Handles URL redirects with KV caching and queues analytics events
- **Queue Processor Worker**: Processes analytics data asynchronously from queue messages

The system uses Cloudflare Workers, KV storage, D1 database, and Queues to create a fast, scalable URL shortening service with comprehensive analytics.

## Architecture

### Monorepo Structure
- `resolver/` - Main worker that handles URL redirects with KV caching and D1 fallback
- `shortener/` - Edge worker that handles redirects and sends analytics to queue (legacy)
- `queue-processor/` - Consumer worker that processes analytics events from queue
- `migrations/` - D1 database migration files
- `scripts/` - Utility scripts for database migrations and deployment
- Root workspace managed with pnpm workspaces

### Data Flow
1. User requests shortened URL → Shortener worker
2. Worker checks KV cache → D1 database fallback → Returns redirect
3. Analytics event sent to `shortener-analytics` queue (fire-and-forget)
4. Queue processor worker processes analytics events and stores in D1

### Storage Systems
- **KV Store**: High-speed cache for URL lookups (sub-millisecond)
- **D1 Database**: Persistent storage for URLs and analytics data
- **Queue**: Decouples redirect performance from analytics processing

## Development Commands

### Install Dependencies
```bash
pnpm install
```

### Development (Local)
```bash
# Run resolver worker locally (main worker)
cd resolver && pnpm dev

# Run shortener worker locally
cd shortener && pnpm dev

# Run queue processor worker locally  
cd queue-processor && pnpm dev
```

### Deploy Workers
```bash
# Deploy resolver worker (main worker)
cd resolver && pnpm deploy

# Deploy shortener worker
cd shortener && pnpm deploy

# Deploy queue processor worker
cd queue-processor && pnpm deploy
```

### Database Migrations
```bash
# Run all migrations
./scripts/migrate.sh

# Run migrations with custom database ID
./scripts/migrate.sh your-database-id

# Verify tables were created
wrangler d1 execute --remote --command=".tables" --database="1c57b49e-f457-458d-806c-913315f3c20c"
```

### Generate Types
```bash
# Generate Cloudflare types for resolver
cd resolver && pnpm cf-typegen

# Generate Cloudflare types for shortener
cd shortener && pnpm cf-typegen

# Generate Cloudflare types for queue processor
cd queue-processor && pnpm cf-typegen
```

### Testing
```bash
# Run tests for resolver (when implemented)
cd resolver && pnpm test

# Run tests for shortener (when implemented)
cd shortener && pnpm test
```

## Key Configuration

### Wrangler Configuration
- Both workers use `wrangler.jsonc` for configuration
- Shortener worker is a queue producer (`shortener_analytics` binding)
- Queue processor worker is a queue consumer for `shortener-analytics`
- Observability enabled for both workers
- Smart placement mode configured

### Queue Setup
- Queue name: `shortener-analytics`
- Producer: shortener worker (binding: `shortener_analytics`)
- Consumer: queue-processor worker
- Queue must be created in Cloudflare dashboard before deployment

### Database Schema 
- **Links table**: Primary table storing short codes and destination URLs
  - `short_code` (TEXT, UNIQUE): The short identifier for the URL
  - `destination` (TEXT): The original long URL to redirect to
  - Common helper fields: `id`, `created_at`, `updated_at`, `expires_at`, `created_by`, `is_active`, `click_count`, `metadata`
- **Analytics table**: stores click analytics with user agent, geo data, etc. (to be added)
- KV structure: `{shortCode: destination_url}` with TTL caching

## Performance Considerations

- **Cache Strategy**: KV first, D1 fallback for URL resolution
- **Analytics Processing**: Asynchronous via queue to not impact redirect performance
- **Batching**: Queue processor should handle multiple events efficiently
- **Error Handling**: Graceful degradation when services unavailable

## Development Notes

- Current implementation is basic starter code
- Shortener worker needs full redirect logic with KV/D1 integration
- Queue processor needs analytics parsing and D1 storage logic
- Both workers use TypeScript with strict mode enabled
- No Go code in this project (contrary to global instructions)

## Infrastructure Requirements

Before deployment:
1. Create `shortener-analytics` queue in Cloudflare dashboard
2. Create D1 database and run migrations: `./scripts/migrate.sh`
3. Create KV namespace for URL caching
4. Configure wrangler.jsonc with proper bindings for KV, D1, and queue

## Database Migrations

Database migrations are located in `migrations/` directory:
- `0001_create_links_table.sql` - Creates the main links table with proper indexes

### Migration Files Structure
- Follow naming convention: `NNNN_description.sql`
- Include `IF NOT EXISTS` for safe re-running
- Add performance indexes for frequently queried columns
- Include both up and down migration logic where applicable