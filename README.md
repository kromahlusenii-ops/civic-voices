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
```bash
npx prisma generate
npx prisma db push
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
│   └── config.ts          # Environment configuration
├── prisma/                # Database schema
└── .env.local             # Local environment variables (not committed)
```

## License

Proprietary
