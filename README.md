# Page Views Counter

A production-ready web service that tracks GitHub profile/repository views and generates highly customizable badges (SVG/PNG) embeddable in GitHub READMEs and external websites.

![Profile Views](https://your-domain.com/badge?username=your-username&style=rounded&icon=eye&bg=007acc)

## Features

- **Customizable Badges** - Multiple styles (flat, rounded, pill, neon, glass), icons, colors, and gradients
- **Fast Performance** - Badge response under 100ms with Redis caching
- **Privacy Focused** - IP hashing, no cookies, no raw IP storage
- **Bot Filtering** - Smart filtering of known bots and crawlers
- **Analytics Dashboard** - Daily, weekly, and total view statistics
- **GitHub OAuth** - Secure authentication and user management
- **Multiple Formats** - SVG (default), PNG, and JSON output

## Quick Start

### 1. Installation

```bash
npm install
```

### 2. Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your settings:
- `JWT_SECRET` - A secure random string for JWT signing
- `GITHUB_CLIENT_ID` - Your GitHub OAuth App client ID
- `GITHUB_CLIENT_SECRET` - Your GitHub OAuth App client secret
- `REDIS_URL` - Redis connection URL (optional, falls back to in-memory)

### 3. GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set Authorization callback URL to: `http://localhost:3000/auth/github/callback`
4. Copy Client ID and Client Secret to `.env`

### 4. Run

```bash
# Development
npm run dev

# Production
npm start
```

## API Usage

### Badge Endpoint

```
GET /badge?username=YOUR_USERNAME
```

#### Parameters

| Param | Description | Default |
|-------|-------------|---------|
| `username` | GitHub username (required) | - |
| `repo` | Repository name | - |
| `style` | flat, rounded, pill, neon, glass | flat |
| `icon` | eye, github, fire, star, chart | eye |
| `label` | Custom label text | Profile Views |
| `bg` | Background color (hex or gradient) | 4c1 |
| `textColor` | Text color (hex) | fff |
| `border` | true/false | false |
| `borderColor` | Border color (hex) | 333 |
| `format` | svg, png, json | svg |
| `countFormat` | normal, short, comma | normal |
| `cooldown` | Seconds before recount | 300 |

#### Examples

```markdown
<!-- Basic -->
![Views](https://your-domain.com/badge?username=octocat)

<!-- Styled -->
![Views](https://your-domain.com/badge?username=octocat&style=rounded&icon=github&bg=007acc)

<!-- Gradient -->
![Views](https://your-domain.com/badge?username=octocat&style=glass&bg=0f2027,203a43,2c5364)

<!-- Repository -->
![Views](https://your-domain.com/badge?username=octocat&repo=hello-world)
```

### Stats API

```
GET /api/stats/:username
```

Returns:
```json
{
  "total": 12453,
  "today": 32,
  "weekly": [5, 12, 8, 20, 30, 40, 15]
}
```

### Reset Counter

```
POST /api/reset
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "your-username",
  "repo": null
}
```

## Deployment

### Fly.io

```bash
fly launch
fly secrets set JWT_SECRET=your-secret
fly secrets set GITHUB_CLIENT_ID=xxx
fly secrets set GITHUB_CLIENT_SECRET=xxx
fly secrets set REDIS_URL=redis://...
fly deploy
```

### Railway

1. Create new project
2. Add PostgreSQL/Redis plugins
3. Set environment variables
4. Deploy from GitHub

### Cloudflare Workers

The codebase can be adapted for Cloudflare Workers with minimal modifications.

## Tech Stack

- **Backend**: Node.js 18+, Fastify
- **Database**: SQLite (better-sqlite3)
- **Cache**: Redis (ioredis) with in-memory fallback
- **Auth**: GitHub OAuth, JWT
- **Rendering**: SVG templates, Sharp for PNG

## License

MIT
