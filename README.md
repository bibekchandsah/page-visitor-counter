# Page Views Counter

A production-ready web service that tracks GitHub profile/repository/web page views and generates highly customizable badges (SVG/PNG/HTML-CSS) embeddable in GitHub READMEs and external websites.

![Profile Views](https://page-visit-counter.onrender.com/badge?username=your-username&style=rounded&icon=eye&bg=007acc)

## Features

- **Customizable Badges** - Multiple styles (flat, rounded, pill, neon, glass), icons, colors, and gradients
- **Fast Performance** - Badge response under 100ms with Redis caching
- **Privacy Focused** - IP hashing, no cookies, no raw IP storage
- **Bot Filtering** - Smart filtering of known bots and crawlers
- **Analytics Dashboard** - Daily, weekly, and total view statistics
- **GitHub OAuth** - Secure authentication and user management
- **Multiple Formats** - SVG (default), PNG, and JSON output

## Use Cases

### GitHub Profile README
Add a visitor counter to your GitHub profile to track how many people view your profile:

```markdown
![Profile Views](https://page-visit-counter.onrender.com/badge?username=your-username&style=rounded&icon=eye&bg=007acc)
```
![Profile Views](https://page-visit-counter.onrender.com/badge?username=your-username&style=rounded&icon=eye&bg=007acc)

### Repository README
Track views on specific repositories to measure project reach and popularity:

```markdown
![Repo Views](https://page-visit-counter.onrender.com/badge?username=your-username&repo=my-project&style=pill&icon=github)
```
![Repo Views](https://page-visit-counter.onrender.com/badge?username=your-username&repo=my-project&style=pill&icon=github)

### Portfolio Websites
Embed the badge in your personal portfolio or blog to show visitor counts:

```html
<img src="https://page-visit-counter.onrender.com/badge?username=your-username&style=neon&icon=chart&bg=ff6b6b" alt="Visitors">
```
<img src="https://page-visit-counter.onrender.com/badge?username=your-username&style=neon&icon=chart&bg=ff6b6b" alt="Visitors">

### Documentation Sites
Track engagement on documentation pages for open source projects:

```markdown
![Docs Views](https://page-visit-counter.onrender.com/badge?username=your-username&repo=docs&style=glass&icon=eye&label=Visitors)
```
![Docs Views](https://page-visit-counter.onrender.com/badge?username=your-username&repo=docs&style=glass&icon=eye&label=Visitors)

### Project Showcases
Display view counts on project landing pages to indicate popularity:

```html
<a href="https://your-domain.com/dashboard">
  <img src="https://page-visit-counter.onrender.com/badge?username=your-username&repo=project&style=rounded&bg=4c1,007acc" alt="Project Views">
</a>
```
<a href="https://your-domain.com/dashboard">
  <img src="https://page-visit-counter.onrender.com/badge?username=your-username&repo=project&style=rounded&bg=4c1,007acc" alt="Project Views">
</a>

### Social Proof for Open Source
Show community interest in your open source contributions:

```markdown
[![Total Views](https://page-visit-counter.onrender.com/badge?username=your-username&style=flat&icon=star&countFormat=comma)](https://github.com/your-username)
```
[![Total Views](https://page-visit-counter.onrender.com/badge?username=your-username&style=flat&icon=star&countFormat=comma)](https://github.com/your-username)

### Blog Articles
Track readership on individual blog posts or tutorials:

```html
<img src="https://page-visit-counter.onrender.com/badge?username=your-username&repo=blog-post-slug&label=Readers&icon=eye&style=pill" alt="Readers">
```
<img src="https://page-visit-counter.onrender.com/badge?username=your-username&repo=blog-post-slug&label=Readers&icon=eye&style=pill" alt="Readers">

### Custom HTML/CSS Badges
Create fully customized badge designs for unique branding:

```
GET /badge?username=your-username&style=html&template=<your-custom-html-template>
```

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
| `icon` | eye, github, fire, star, chart, heart, rocket, user, code, globe | eye |
| `label` | Custom label text | Profile Views |
| `bg` | Background color (hex or gradient) | 4c1 |
| `textColor` | Text color (hex) | fff |
| `border` | true/false | false |
| `borderColor` | Border color (hex) | 333 |
| `format` | svg, png, json | svg |
| `countFormat` | normal, short, comma | normal |
| `cooldown` | Seconds before recount | 300 |

#### Examples

<!-- Basic -->
```markdown
![Views](https://page-visit-counter.onrender.com/badge?username=octocat)
```
![Views](https://page-visit-counter.onrender.com/badge?username=octocat)

<!-- Styled -->
```markdown
![Views](https://page-visit-counter.onrender.com/badge?username=octocat&style=rounded&icon=github&bg=007acc)
```
![Views](https://page-visit-counter.onrender.com/badge?username=octocat&style=rounded&icon=github&bg=007acc)

<!-- Gradient -->
```markdown
![Views](https://page-visit-counter.onrender.com/badge?username=octocat&style=glass&bg=0f2027,203a43,2c5364)
```
![Views](https://page-visit-counter.onrender.com/badge?username=octocat&style=glass&bg=0f2027,203a43,2c5364)

<!-- Repository -->
```markdown
![Views](https://page-visit-counter.onrender.com/badge?username=octocat&repo=hello-world)
```
![Views](https://page-visit-counter.onrender.com/badge?username=octocat&repo=hello-world)


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
- **Database**: MongoDB Atlas
- **Cache**: Redis (ioredis) with in-memory fallback
- **Auth**: GitHub OAuth, JWT
- **Rendering**: SVG templates, Sharp for PNG

## License

MIT
