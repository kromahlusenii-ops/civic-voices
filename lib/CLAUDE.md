# lib — Core Library

## Purpose
Shared utilities, services, hooks, types, and data used across the app.

## Conventions
- TypeScript strict mode — avoid `any`
- Subdirectories: auth/, cache/, credibility/, data/, hooks/, providers/, services/, types/, utils/
- `config.ts` is the single gateway for all env vars
- `prisma.ts` exports the singleton PrismaClient
- Key files: data/taxonomy.ts (category tree), data/cities.ts (geo data)
