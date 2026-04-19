# Repository Guidelines

Guidelines for AI coding agents operating in the Sink codebase.

## Project Overview

Sink is a link shortener with analytics, running 100% on Cloudflare. Uses Next.js 4 frontend and Cloudflare Workers backend.

## Project Structure

```
src/app/api/           # API endpoints (method suffix: create.post.ts)
                    # API routes use method suffix: create.post.ts
```

## Commands

```bash
# Development
pnpm dev              # Start dev server (port 3000)
pnpm build            # Production build
pnpm lint:fix         # ESLint with auto-fix
pnpm type:check       # TypeScript type check
```