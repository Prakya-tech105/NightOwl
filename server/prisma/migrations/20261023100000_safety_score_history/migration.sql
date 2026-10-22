CREATE TABLE "SafetyScoreHistory" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "previousScore" INTEGER,
    "score" INTEGER NOT NULL,
    "eligible" BOOLEAN NOT NULL,
    "weights" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyScoreHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SafetyScoreHistory_companyId_createdAt_idx" ON "SafetyScoreHistory"("companyId", "createdAt");
CREATE INDEX "SafetyScoreHistory_driverId_createdAt_idx" ON "SafetyScoreHistory"("driverId", "createdAt");

ALTER TABLE "SafetyScoreHistory"
ADD CONSTRAINT "SafetyScoreHistory_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SafetyScoreHistory"
ADD CONSTRAINT "SafetyScoreHistory_driverId_fkey"
FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
