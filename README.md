# Civic Voices

Reddit-first audience research tool that collects Reddit discussions and summarizes real public sentiment, pain points, and themes into an actionable dashboard with verified verbatim quotes.

## Local Setup

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Reddit API credentials

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd civic-voices
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your credentials:
- Database connection string
- NextAuth secret
- Reddit API credentials
- Other API keys as needed

4. Set up the database:

First, ensure PostgreSQL is running and create a database:
```bash
# Using psql
createdb civic_voices

# Or using PostgreSQL client
psql -U postgres
CREATE DATABASE civic_voices;
\q
```

Then run migrations:
```bash
npx prisma generate
npx prisma migrate deploy
```

For development, you can also use:
```bash
npx prisma migrate dev
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Data Source**: Reddit API (OAuth)

## Project Structure

```
civic-voices/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Landing page
│   ├── login/             # Login page
│   ├── signup/            # Signup page
│   └── research/          # Research pages
│       ├── new/           # Create new research
│       └── [jobId]/       # View research results
├── lib/                   # Shared utilities
│   ├── config.ts          # Environment configuration
│   └── prisma.ts          # Prisma client instance
├── prisma/                # Database schema and migrations
│   ├── schema.prisma      # Database schema
│   └── migrations/        # Database migrations
└── .env.local             # Local environment variables (not committed)
```

## Database Schema

The application uses the following database models:

- **User**: User accounts with email authentication
- **ResearchJob**: Research query jobs with status tracking
- **SourceResult**: Individual content items from various sources (Reddit, X, TikTok, etc.)
- **Insight**: LLM-generated insights and analysis for each research job

See [prisma/schema.prisma](prisma/schema.prisma) for the complete schema definition.

## License

Proprietary
