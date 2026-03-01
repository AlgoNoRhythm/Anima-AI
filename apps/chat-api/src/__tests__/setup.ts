// Chat-API tests use the same Postgres as local dev.
// Ensure Docker Postgres is running: docker compose -f docker/docker-compose.local.yml up -d

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://anima:anima@localhost:5432/anima';
}
