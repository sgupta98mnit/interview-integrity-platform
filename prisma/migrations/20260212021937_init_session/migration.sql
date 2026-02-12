-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateName" TEXT,
    "candidateEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "tokenNonce" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" DATETIME,
    "lastActivityAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "clientEventId" TEXT NOT NULL,
    "tsISO" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Event_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Event_sessionId_tsISO_idx" ON "Event"("sessionId", "tsISO");

-- CreateIndex
CREATE UNIQUE INDEX "Event_sessionId_clientEventId_key" ON "Event"("sessionId", "clientEventId");
