-- This is an empty migration.
CREATE UNIQUE INDEX "Endpoint_userId_url_active_key"
ON "Endpoint" ("userId", "url")
WHERE "deletedAt" IS NULL;