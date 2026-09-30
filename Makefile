.PHONY: help install dev build preview typecheck lint clean

.DEFAULT_GOAL := help

help:
	@printf "Available targets:\n"
	@printf "  install    Install dependencies with pnpm\n"
	@printf "  dev        Start the Vite dev server on http://localhost:5173\n"
	@printf "  build      Typecheck and build for production\n"
	@printf "  preview    Serve the production build locally\n"
	@printf "  typecheck  Run the TypeScript compiler without emitting\n"
	@printf "  lint       Run oxlint\n"
	@printf "  clean      Remove dist and build caches\n"

install:
	pnpm install

dev: install
	pnpm dev

build: install
	pnpm build

preview: build
	pnpm preview

typecheck: install
	pnpm exec tsc --noEmit -p tsconfig.app.json

lint: install
	pnpm lint

clean:
	rm -rf dist node_modules/.tmp node_modules/.vite
