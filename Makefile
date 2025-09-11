.PHONY: dev dev-all install clean test deploy help

# Default target
all: help

# Install dependencies for all projects
install:
	@echo "📦 Installing dependencies for all projects..."
	pnpm install
	cd resolver && pnpm install
	cd shortener && pnpm install  
	cd queue-processor && pnpm install
	cd frontend && pnpm install
	@echo "✅ All dependencies installed"

# Run all services for development (main command for testing everything together)
dev: dev-all

dev-all:
	@echo "🚀 Starting all services for development..."
	@echo "🌐 Frontend will be available at: http://localhost:5174"
	@echo "🔗 Resolver worker at: http://localhost:8780"
	@echo "✂️  Shortener worker at: http://localhost:8781"  
	@echo "🔄 Queue processor at: http://localhost:8782"
	@echo "📊 Frontend API worker at: http://localhost:8783"
	@echo ""
	@echo "Press Ctrl+C to stop all services"
	@echo ""
	@trap 'echo "🛑 Stopping all services..."; kill 0' INT; \
	cd resolver && pnpm dev --port 8780 & \
	cd shortener && pnpm dev --port 8781 & \
	cd queue-processor && pnpm dev --port 8782 & \
	cd frontend && pnpm run dev:full --port 8783 & \
	wait

# Run individual services
dev-resolver:
	@echo "🔗 Starting resolver worker..."
	cd resolver && pnpm dev

dev-shortener:
	@echo "✂️  Starting shortener worker..."
	cd shortener && pnpm dev

dev-queue:
	@echo "🔄 Starting queue processor..."
	cd queue-processor && pnpm dev

dev-frontend:
	@echo "🌐 Starting frontend..."
	cd frontend && pnpm run dev:full

# Test all projects
test:
	@echo "🧪 Running tests for all projects..."
	cd resolver && pnpm test || true
	cd shortener && pnpm test || true
	cd queue-processor && pnpm test || true
	@echo "✅ All tests completed"

# Generate Cloudflare types for all projects
cf-typegen:
	@echo "🔧 Generating Cloudflare types..."
	cd resolver && pnpm run cf-typegen
	cd shortener && pnpm run cf-typegen
	cd queue-processor && pnpm run cf-typegen
	cd frontend && pnpm run cf-typegen
	@echo "✅ Types generated"

# Deploy all services to production
deploy:
	@echo "🚀 Deploying all services..."
	cd resolver && pnpm deploy
	cd shortener && pnpm deploy
	cd queue-processor && pnpm deploy
	cd frontend && pnpm deploy
	@echo "✅ All services deployed"

# Clean node_modules and build artifacts
clean:
	@echo "🧹 Cleaning up..."
	rm -rf node_modules
	rm -rf resolver/node_modules
	rm -rf shortener/node_modules
	rm -rf queue-processor/node_modules
	rm -rf frontend/node_modules
	rm -rf frontend/dist
	@echo "✅ Cleanup completed"

# Database operations
migrate:
	@echo "🗄️  Running database migrations..."
	./scripts/migrate.sh
	@echo "✅ Database migrations completed"

# Help target
help:
	@echo "🌐 Tazoc URL Shortener - Development Commands"
	@echo ""
	@echo "Main Commands:"
	@echo "  make dev         🚀 Start all services for development (default)"
	@echo "  make install     📦 Install dependencies for all projects"
	@echo "  make test        🧪 Run tests for all projects"
	@echo "  make deploy      🚀 Deploy all services to production"
	@echo "  make migrate     🗄️  Run database migrations"
	@echo ""
	@echo "Individual Services:"
	@echo "  make dev-resolver    🔗 Start resolver worker only"
	@echo "  make dev-shortener   ✂️  Start shortener worker only"
	@echo "  make dev-queue       🔄 Start queue processor only"
	@echo "  make dev-frontend    🌐 Start frontend only"
	@echo ""
	@echo "Utilities:"
	@echo "  make cf-typegen  🔧 Generate Cloudflare types"
	@echo "  make clean       🧹 Clean node_modules and build artifacts"
	@echo "  make help        ❓ Show this help message"
	@echo ""
	@echo "🔗 Services will run on different ports:"
	@echo "   Frontend:        http://localhost:5174"
	@echo "   Resolver:        http://localhost:8780"
	@echo "   Shortener:       http://localhost:8781"
	@echo "   Queue Processor: http://localhost:8782"
	@echo "   Frontend API:    http://localhost:8783"