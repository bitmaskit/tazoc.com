# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `pnpm install` - Install dependencies
- `pnpm dev` - Start Vite frontend development server with hot-reload (port 5174)
- `pnpm run dev:worker` - Start Cloudflare Worker development server (port 8787)
- `pnpm run dev:full` - Start both Vite and Worker servers simultaneously
- `pnpm build` - Type-check, compile and minify for production 
- `pnpm preview` - Build and preview production version locally via Wrangler
- `pnpm deploy` - Build and deploy to Cloudflare Workers

### Quality Assurance
- `pnpm run type-check` - Run TypeScript type checking only
- `pnpm run build-only` - Build without type checking

### Cloudflare Workers
- `pnpm run cf-typegen` - Generate Wrangler types

## Development Setup

### For Full Stack Development (Recommended)
```bash
pnpm run dev:full
```
This runs both:
- Vite dev server on `http://localhost:5174` (frontend with hot reload)
- Cloudflare Worker on `http://localhost:8787` (backend API)
- Vite automatically proxies `/api/*` requests to the Worker

### For Frontend Only
```bash
pnpm dev
```
Frontend only with mock API responses.

### For Worker/API Only
```bash
pnpm run dev:worker
```
Test API endpoints directly at `http://localhost:8787/api/*`

## Architecture

This is a **Vue 3 + TypeScript SPA deployed as a Cloudflare Worker** with the following key architectural patterns:

### Frontend Architecture
- **Vue 3** with Composition API
- **Vue Router** with lazy-loaded routes (see `src/router/index.ts`)
- **TypeScript** with multiple tsconfig files for different contexts:
  - `tsconfig.app.json` - Main application code
  - `tsconfig.node.json` - Node.js tooling
  - `tsconfig.worker.json` - Cloudflare Worker code
- **Vite** as build tool with `@` alias pointing to `src/`

### Deployment Architecture  
- **Cloudflare Workers** as the runtime environment
- **Single Page Application (SPA)** routing handled by Cloudflare Workers
- Server-side API routes prefixed with `/api/` handled by `server/index.ts`
- Static assets served with SPA fallback behavior
- Smart Placement enabled for optimal edge performance

### File Structure Context
- `src/` - Vue.js frontend application code
- `server/index.ts` - Cloudflare Worker that serves the SPA and handles `/api/*` routes
- `dist/client/` - Built frontend assets  
- `dist/frontend/` - Built Worker bundle
- `wrangler.jsonc` - Cloudflare Workers configuration

### Key Integration Points
- Vite config integrates Cloudflare plugin for seamless Workers deployment
- The Worker serves static assets while also handling API routes
- TypeScript types are shared between frontend and Worker contexts via `worker-configuration.d.ts`
- Vite proxies `/api/*` requests to Worker during development
- in dev folder there will be files which you can lookup to see if you can find something to help you with development, like pictures, html layouts, styles or code pieces
- never change files in dev folder

## Current State

### Backend (server/index.ts)
- **Simplified API**: Basic endpoint that responds to any `/api/*` request
- **No Authentication**: OAuth and auth logic has been removed for simplicity
- **Clean Response**: Returns JSON with basic info including request path

### Frontend
- **Working State**: Basic Vue 3 SPA with TailwindUI components
- **API Integration**: "Get Name from API" button demonstrates frontend-backend communication
- **No Auth Flow**: Authentication modal shows placeholder alerts instead of OAuth

### Development Flow
1. Run `pnpm run dev:full` to start both servers
2. Visit `http://localhost:5174` for the frontend
3. API requests automatically proxy to `http://localhost:8787`
4. Test API directly at `http://localhost:8787/api/test`
- Asset Routing
If you're using Vue as a SPA, you will want to set not_found_handling = "single_page_application" in your Wrangler configuration file.
By default, Cloudflare first tries to match a request path against a static asset path, which is based on the file structure of the uploaded asset directory. This is either the directory specified by assets.directory in your Wrangler config or, in the case of the Cloudflare Vite plugin, the output directory of the client build. Failing that, we invoke a Worker if one is present. If there is no Worker, or the Worker then uses the asset binding, Cloudflare will fallback to the behaviour set by not_found_handling.
Refer to the routing documentation for more information about how routing works with static assets, and how to customize this behavior.
Use bindings with Vue
Your new project also contains a Worker at ./server/index.ts, which you can use as a backend API for your Vue application. While your Vue application cannot directly access Workers bindings, it can interact with them through this Worker. You can make fetch() requests from your Vue application to the Worker, which can then handle the request and use bindings.
With bindings, your application can be fully integrated with the Cloudflare Developer Platform, giving you access to compute, storage, AI and more.