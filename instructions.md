
# Page Views Counter – Advanced Customizable Version
## AI Agent Implementation Instructions

### 1. Project Goal
Build a production-ready web service that tracks GitHub profile/repository views and generates highly customizable badges (SVG/PNG) embeddable in GitHub READMEs and external websites.

The system must:
- Count profile/repo/page views reliably
- Generate dynamic badges
- Allow deep user customization
- Provide analytics
- Respect privacy
- Be fast, cheap, and scalable

---

## 2. Core Requirements

### 2.1 Functional Requirements
- Track views for:
  - GitHub profiles
  - GitHub repositories
  - Custom pages (optional)
- Generate badges in:
  - SVG (default)
  - PNG
  - JSON (API output)
- Allow badge customization via URL parameters
- Prevent excessive spam counting
- Support GitHub OAuth login
- Provide a user dashboard
- Store analytics securely
- Be embeddable via Markdown

---

## 3. System Architecture

### 3.1 High-Level Architecture
- Edge API (Cloudflare Workers / Fastify)
- Redis for counters
- SQL DB for users and settings
- SVG rendering engine
- Auth via GitHub OAuth
- REST-based API

```

Client → CDN → API → Redis / DB → SVG Renderer → Response

````

---

## 4. Tech Stack (Recommended)

### Backend
- Node.js (18+)
- Fastify OR Cloudflare Workers

### Storage
- Redis (view counters)
- PostgreSQL or SQLite (users, configs)

### Rendering
- SVG templates
- resvg / sharp (for PNG)

### Auth
- GitHub OAuth
- JWT tokens

### Deployment
- Cloudflare Workers / Fly.io / Railway
- Redis via Upstash
- PostgreSQL via Neon / Supabase

---

## 5. API Design

### 5.1 Badge Generation Endpoint

```http
GET /badge
````

#### Query Parameters

| Param       | Description                       |
| ----------- | --------------------------------- |
| username    | GitHub username (required)        |
| repo        | Repository name (optional)        |
| style       | flat, rounded, neon, glass, pill  |
| label       | Custom label text                 |
| icon        | eye, github, fire, star           |
| bg          | hex or gradient (comma-separated) |
| textColor   | text color                        |
| border      | true/false                        |
| borderColor | hex                               |
| font        | Google Font name                  |
| format      | svg / png / json                  |
| countFormat | normal / short / comma            |
| cooldown    | seconds before recount            |

#### Example

```
/badge?username=bibeksha&style=glass&icon=eye&bg=0f2027,203a43,2c5364
```

---

### 5.2 View Counting Logic

* Increment counter on each badge request
* Apply cooldown using:

  * IP hash
  * User-Agent hash
* Ignore known bot user agents
* Store:

  * total_views
  * daily_views
  * last_viewed_at

---

### 5.3 Analytics API

```http
GET /api/stats/:username
```

Returns:

```json
{
  "total": 12453,
  "today": 32,
  "weekly": [5,12,8,20,30,40,15]
}
```

---

### 5.4 Reset Counter

```http
POST /api/reset
Authorization: Bearer <token>
```

---

## 6. SVG Badge Rendering

### 6.1 Rendering Rules

* SVG must:

  * Be GitHub-compatible
  * Use inline styles only
  * Avoid external assets
* Fonts must fallback gracefully
* Gradient backgrounds must be SVG-native

### 6.2 Badge Styles

Implement at least:

* flat
* rounded
* pill
* neon
* glass

Each style should be a separate SVG template.

---

## 7. User Dashboard

### 7.1 Authentication

* GitHub OAuth
* Fetch:

  * username
  * avatar
  * public repos

### 7.2 Dashboard Features

* View counters
* Create multiple badges
* Copy embed codes
* Reset counters
* Toggle bot filtering
* Set starting count
* Preview badges live

---

## 8. Database Schema

### Users

```sql
id
github_id
username
avatar_url
created_at
```

### Counters

```sql
id
username
repo
total_views
created_at
```

### BadgeConfigs

```sql
id
user_id
style
colors
font
icon
created_at
```

---

## 9. Security & Privacy

### Must Implement

* No cookies for tracking
* Hash IPs (SHA-256)
* Do not store raw IPs
* Rate limiting per IP
* HTTPS only
* CORS protection

---

## 10. Performance Requirements

* Badge response < 100ms
* Cache SVG output where possible
* Redis atomic increments
* CDN caching with cache-busting

---

## 11. Deployment Instructions

### Steps

1. Provision Redis
2. Setup database
3. Configure GitHub OAuth
4. Deploy API
5. Configure domain
6. Enable CDN caching
7. Monitor logs

---

## 12. Optional Advanced Features

* Animated counters
* Dark/light auto mode
* Seasonal themes
* Custom domains for Pro users
* GitHub Actions integration
* Repo traffic tracking

---

## 13. Success Criteria

The project is complete when:

* Badge renders correctly on GitHub README
* View count increments reliably
* Customization works via URL
* Dashboard is functional
* Analytics are accurate
* Service handles 10k+ daily requests

---

## 14. Final Notes for AI Agent

* Prioritize correctness over complexity
* Write clean, documented code
* Handle edge cases
* Optimize for GitHub compatibility
* Keep everything stateless where possible

