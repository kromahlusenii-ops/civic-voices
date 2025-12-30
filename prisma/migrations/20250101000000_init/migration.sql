-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "Source" AS ENUM ('REDDIT', 'X', 'TIKTOK', 'YOUTUBE', 'LINKEDIN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "queryJson" JSONB NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "totalResults" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "research_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_results" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "source" "Source" NOT NULL,
    "externalId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "text" TEXT NOT NULL,
    "rawJson" JSONB NOT NULL,
    "createdAtExternal" TIMESTAMP(3),
    "score" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insights" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "outputJson" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "tokensUsed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "research_jobs_userId_createdAt_idx" ON "research_jobs"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "research_jobs_status_idx" ON "research_jobs"("status");

-- CreateIndex
CREATE INDEX "source_results_jobId_source_idx" ON "source_results"("jobId", "source");

-- CreateIndex
CREATE INDEX "source_results_jobId_createdAt_idx" ON "source_results"("jobId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "source_results_jobId_source_externalId_key" ON "source_results"("jobId", "source", "externalId");

-- CreateIndex
CREATE INDEX "insights_jobId_createdAt_idx" ON "insights"("jobId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "research_jobs" ADD CONSTRAINT "research_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_results" ADD CONSTRAINT "source_results_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "research_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insights" ADD CONSTRAINT "insights_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "research_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
