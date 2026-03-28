# AI Essay Editor

Next.js + TypeScript + Tailwind + Prisma (SQLite) app for drafting and polishing essays paragraph by paragraph.

## Requirements

- Node.js 20+
- npm 10+

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Add your OpenAI key in `.env`:

```env
OPENAI_API_KEY=your_key_here
```

4. Run migrations (creates/updates `prisma/dev.db`):

```bash
npm run prisma:migrate:dev
```

5. Start dev server:

```bash
npm run dev
```

App runs at `http://localhost:3000`.

## Environment Variables

- `DATABASE_URL`: Prisma DB connection (default local dev: `file:./dev.db`)
- `OPENAI_API_KEY`: required for paragraph polishing

## Docker (Local Distribution)

This repo includes `Dockerfile` + `docker-compose.yml` for local usage by different users.

Each user gets their own local persistent SQLite database through a Docker volume.

1. Copy env file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

2. Set your OpenAI key in `.env`:

```env
OPENAI_API_KEY=your_key_here
```

3. Build and start:

```bash
docker compose up --build
```

4. Open:

`http://localhost:3000`

5. Stop:

```bash
docker compose down
```

Your essay data is still kept after `down` because it is stored in the named Docker volume `essay_editor_data`.

If you want to remove app data completely:

```bash
docker compose down -v
```

### Where SQLite Lives in Docker

- Inside container: `/app/data/dev.db`
- Persisted by volume: `essay_editor_data` mounted at `/app/data`

So container recreation does not delete essay data unless you remove volumes.

## Useful Scripts

- `npm run dev`: start development server
- `npm run build`: production build
- `npm run start`: run production server after build
- `npm run lint`: run ESLint
- `npm run typecheck`: run TypeScript checks
- `npm run check`: lint + typecheck + build
- `npm run prisma:generate`: generate Prisma client
- `npm run prisma:migrate:dev`: create/apply local migration
- `npm run prisma:migrate:deploy`: apply existing migrations (deployment)
- `npm run prisma:studio`: open Prisma Studio

## Prisma Workflow

- When schema changes locally:
  1. Update `prisma/schema.prisma`
  2. Run `npm run prisma:migrate:dev -- --name your_migration_name`
  3. Commit both schema and new migration files

- In deployment environments:
  - Run `npm run prisma:migrate:deploy`
  - Do not use `migrate dev` in production

## Pre-Deployment Checklist

Run this before deployment:

```bash
npm ci
npm run check
npm run prisma:migrate:deploy
```

Then start with:

```bash
npm run start
```

## Deployment Note (SQLite)

This app currently uses SQLite. For production, the filesystem path for `DATABASE_URL` must be writable and persistent. If your platform uses ephemeral or read-only filesystems, use a persistent volume or move to a managed database.
