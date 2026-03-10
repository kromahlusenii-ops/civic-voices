# app — Next.js App Router

## Purpose
All pages, API routes, and app-level components for the Civic Voices platform.

## Conventions
- Use TypeScript strict mode — avoid `any`
- Follow App Router conventions — `"use client"` only when components need browser APIs or hooks
- Shared utilities belong in lib/, not here
- Feature code should be co-located with its tests when possible
- Avoid circular imports between subdirectories


<!-- ham:section:conventions -->
## Conventions
- Application source code lives here
- Use TypeScript strict mode — avoid `any`
- Follow App Router conventions — `"use client"` only when components need browser APIs or hooks
- Shared utilities belong in a dedicated utils/ or lib/ subdirectory
- Feature code should be co-located with its tests when possible
- Avoid circular imports between subdirectories
<!-- /ham:section:conventions -->