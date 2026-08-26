CREATE TABLE IF NOT EXISTS "FrontendLogEvent" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER,
  "level" TEXT NOT NULL DEFAULT 'ERROR',
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "stack" TEXT,
  "componentStack" TEXT,
  "route" TEXT NOT NULL DEFAULT '',
  "previousRoute" TEXT NOT NULL DEFAULT '',
  "source" TEXT NOT NULL DEFAULT '',
  "line" INTEGER,
  "column" INTEGER,
  "apiMethod" TEXT NOT NULL DEFAULT '',
  "apiUrl" TEXT NOT NULL DEFAULT '',
  "statusCode" INTEGER,
  "requestId" TEXT NOT NULL DEFAULT '',
  "sessionId" TEXT NOT NULL DEFAULT '',
  "release" TEXT NOT NULL DEFAULT 'unknown',
  "environment" TEXT NOT NULL DEFAULT 'production',
  "breadcrumbs" JSONB NOT NULL DEFAULT '[]',
  "context" JSONB NOT NULL DEFAULT '{}',
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FrontendLogEvent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "Users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "FrontendLogEvent_userId_idx" ON "FrontendLogEvent"("userId");
CREATE INDEX IF NOT EXISTS "FrontendLogEvent_createdAt_idx" ON "FrontendLogEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "FrontendLogEvent_type_idx" ON "FrontendLogEvent"("type");
CREATE INDEX IF NOT EXISTS "FrontendLogEvent_level_idx" ON "FrontendLogEvent"("level");
CREATE INDEX IF NOT EXISTS "FrontendLogEvent_route_idx" ON "FrontendLogEvent"("route");
CREATE INDEX IF NOT EXISTS "FrontendLogEvent_statusCode_idx" ON "FrontendLogEvent"("statusCode");
CREATE INDEX IF NOT EXISTS "FrontendLogEvent_sessionId_idx" ON "FrontendLogEvent"("sessionId");
CREATE INDEX IF NOT EXISTS "FrontendLogEvent_environment_idx" ON "FrontendLogEvent"("environment");
CREATE INDEX IF NOT EXISTS "FrontendLogEvent_release_idx" ON "FrontendLogEvent"("release");
