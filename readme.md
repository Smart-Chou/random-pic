# Random Pic API

Image Service API

## Tech Stack

- **Next.js 15** - App Router, Route Handlers
- **TypeScript** - Full type safety
- **Cloudflare R2** - Image storage (hidden behind proxy)

## Quick Start

### 1. Setup Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

| Variable            | Description      | Required |
| ------------------- | ---------------- | -------- |
| `IMAGE_BASE_URL`    | R2 custom domain | Yes      |
| `REFERER_WHITELIST` | Allowed referers | No       |

### 2. Start

```bash
pnpm install
pnpm dev
```

Visit http://localhost:3000

## API Endpoints

| Endpoint                   | Description     |
| -------------------------- | --------------- |
| `/api/random`              | Random image    |
| `/api/random?format=json`  | JSON response   |
| `/api/random?category=xxx` | By category     |
| `/api/categories`          | List categories |
| `/api/pic/[path]`          | Proxy image     |

## Usage Examples

### Random Image

```bash
# HTML (recommended)
<img src="https://your-domain.com/api/random" />

# JSON response
curl "https://your-domain.com/api/random?format=json"

# With category
curl "https://your-domain.com/api/random?category=landscape"
```

## Features

- [x] Category Management
- [x] Referer Hotlink Protection
- [x] CORS Support
- [x] Hidden Storage Domain (all traffic through proxy)

## Deployment

### Vercel

```bash
pnpm build
vercel deploy
```

### Local

```bash
pnpm dev
```

## Environment Variables

```bash
# R2 Configuration
R2_ACCOUNT_ID=your_account_id
R2_BUCKET=blog-all
R2_ACCESS_KEY=your_access_key

# R2 Custom Domain (used internally, not exposed)
IMAGE_BASE_URL=your-bucket.example.com

# Referer Whitelist
REFERER_WHITELIST=example.com,localhost
```

## Security

All image URLs are proxied through the application domain. The storage bucket domain is never exposed to end users.

- `/api/random` → streams image (no URL visible)
- `/api/random?format=json` → returns `/api/pic/...` path
- `/api/pic/[path]` → streams from storage

## License

MIT
