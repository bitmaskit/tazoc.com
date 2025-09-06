# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a URL shortener service built on Cloudflare's edge infrastructure with two main components:
- **Shortener Worker**: Handles URL redirects with KV caching and queues analytics events
- **Queue Processor Worker**: Processes analytics data asynchronously from queue messages

The system uses Cloudflare Workers, KV storage, D1 database, and Queues to create a fast, scalable URL shortening service with comprehensive analytics.

## Architecture

### Monorepo Structure
- `shortener/` - Edge worker that handles redirects and sends analytics to queue
- `queue-processor/` - Consumer worker that processes analytics events from queue
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
# Run shortener worker locally
cd shortener && pnpm dev

# Run queue processor worker locally  
cd queue-processor && pnpm dev
```

### Deploy Workers
```bash
# Deploy shortener worker
cd shortener && pnpm deploy

# Deploy queue processor worker
cd queue-processor && pnpm deploy
```

### Generate Types
```bash
# Generate Cloudflare types for shortener
cd shortener && pnpm cf-typegen

# Generate Cloudflare types for queue processor
cd queue-processor && pnpm cf-typegen
```

### Testing
```bash
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

### Database Schema (from README)
- **URLs table**: stores shortened URLs with metadata
- **Analytics table**: stores click analytics with user agent, geo data, etc.
- KV structure: `{shortCode: {url, cached_at, ttl}}`

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
2. Set up D1 database with URLs and analytics tables
3. Create KV namespace for URL caching
4. Configure wrangler.jsonc with proper bindings for KV, D1, and queue