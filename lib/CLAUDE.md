# lib — Core Library

## Purpose
Shared utilities, services, hooks, types, and data used across the app.

## Conventions
- TypeScript strict mode — avoid `any`
- Subdirectories: auth/, cache/, credibility/, data/, hooks/, providers/, services/, types/, utils/
- `config.ts` is the single gateway for all env vars
- `prisma.ts` exports the singleton PrismaClient
- Key files: data/taxonomy.ts (category tree), data/cities.ts (geo data)


<!-- ham:section:conventions -->
## Conventions
- Application source code lives here
- Use TypeScript strict mode — avoid `any`
- Follow App Router conventions — `"use client"` only when components need browser APIs or hooks
- Shared utilities belong in a dedicated utils/ or lib/ subdirectory
- Feature code should be co-located with its tests when possible
- Avoid circular imports between subdirectories
<!-- /ham:section:conventions -->