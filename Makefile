.PHONY: help install dev build preview typecheck lint test verify mcp clean

.DEFAULT_GOAL := help

help:
	@printf "Available targets:\\n"
	@printf "  install    Install dependencies with pnpm\\n"
	@printf "  dev        Start the app on http://localhost:5180\\n"
	@printf "  mcp        Start the MCP server on stdio (bridge on ws://127.0.0.1:7331)\\n"
	@printf "  build      Typecheck and build for production\\n"
	@printf "  preview    Serve the production build on http://localhost:4180\\n"
	@printf "  typecheck  Typecheck the app, the server and the tooling config\\n"
	@printf "  lint       Run oxlint\\n"
	@printf "  test       Run the test suite\\n"
	@printf "  verify     Run typecheck, lint, tests and build, as CI does\\n"
	@printf "  clean      Remove dist and build caches\\n"

node_modules: package.json pnpm-lock.yaml
	pnpm install --frozen-lockfile
	@touch node_modules

install: node_modules

dev: node_modules
	pnpm dev

mcp: node_modules
	pnpm mcp

build: node_modules
	pnpm build

preview: build
	pnpm preview

typecheck: node_modules
	pnpm typecheck

lint: node_modules
	pnpm lint

test: node_modules
	pnpm test

verify: node_modules
	pnpm verify

clean:
	rm -rf dist node_modules/.tmp node_modules/.vite
