# Task Manager Backend

![Dhyrium API](/404_page/img/dhyrium_logo.png)

This is a backend API for a system that manages courses and students. It provides endpoints for creating, retrieving, updating, and deleting courses.

## Documentation

Detailed documentation on API endpoints is found [here](https://google.com) or [/api-docs](http://localhost:8081/api-docs).

## Configuration

Before running the backend, ensure that you have the following dependencies installed:

- Node.js (v14 or higher)
- npm (v6 or higher)
- PostgreSQL (make sure you have a running PostgreSQL instance)

## Tools Dev

Backend made with TS, Express and Prisma

- [Express](https://expressjs.com/en/guide/routing.html)
- [Prisma](https://www.prisma.io/)

## Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/juancotrado/quisvar_proyect_bk.git
   ```

2. Install dependences:

   ```bash
   npm install
   ```

## Running

### Run Development

- Command to run in development mode

  ```bash
  npm run dev
  ```

### Run Production

- Command to run in production mode

  ```bash
  npm run start
  ```

  ### Run Production

- Initialize with seed with next command

  ```sh
  npm run seed
  ```

## Sync database with Prisma

This project uses `prisma db push`, not Prisma Migrate. Do not run
`prisma migrate dev` or create files under `prisma/migrations` unless the team
explicitly decides to adopt migrations later.

1. Initialize schema on database and project:

   ```bash
   npx prisma generate
   ```

2. Push `prisma/schema.prisma` changes to the database:

   ```bash
   npx prisma db push
   ```

3. If you need to sync `schema.prisma` from an existing database:

   ```bash
   npx prisma db pull
   ```

### Manual database operations

`prisma db push` synchronizes objects represented by `prisma/schema.prisma`, but
it does not execute data backfills, permission grants, or PostgreSQL constraints
that Prisma cannot model. This repository keeps those operations as explicit,
idempotent `prisma/manual-*.sql` scripts instead of Prisma migrations.

After taking a database backup, apply the relevant scripts with a PostgreSQL
client and stop on the first error. The retained db-push companion scripts are:

- `prisma/manual-db-push-constraints.sql`: required `CHECK` constraints and the
  partial unique index not represented by Prisma. Apply after `db push` in every
  environment.
- `prisma/manual-db-push-backfills.sql`: existing-data normalization for
  meetings, commitments, and stage versions. Apply when upgrading a populated
  database; it is safe but unnecessary on a new empty database.
- `prisma/manual-module-navigation-permissions.sql`: duty-rotation and
  gate-control submenu grants. Apply after the relevant menu and role seed data
  exists.

Example:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f prisma/manual-db-push-constraints.sql
```

For a new database, use this order:

1. `npx prisma db push`
2. Apply `manual-db-push-constraints.sql`.
3. Load the reference data required by that environment.
4. Apply permission scripts after the required menu and role data exists.

For an existing database, back it up, run `db push`, apply the constraints and
backfill scripts, then apply any required permission scripts. Manual SQL is not
executed automatically by application startup.

## Deployment with Docker Compose

Production is orchestrated by the root `docker-compose.yml`, not by the
backend-local compose file. Run these commands from the project root:

```bash
docker compose config --quiet
docker compose up -d --build --force-recreate backend
```

The backend receives runtime variables from
`./quisvar_proyect_bk/.env`. That file must remain outside the image and must
not be committed. At minimum it must define `NODE_ENV`, `PORT`, `HOST`,
`ROUTE`, `DATABASE_URL`, `SECRET`, `JWT_RESET`, `IV`, and `SECRET_CODE`.

The current production configuration points `DATABASE_URL` to an external
PostgreSQL instance; the root compose `db` service is not used by this backend.
The container runs `npx prisma db push` before starting the application. This
project does not use Prisma migrations, so review and back up the database
before deploying schema changes.

### Container Configuration

- Enter a Docker container, use the following command

  ```bash
  docker exec -it "container_name_or_id" bash
  ```

### Backups with PostgreSQL Container

1. Enter a Docker container:

   ```bash
   docker exec -it "container_name_or_id" bash
   ```

2. Create backup with custom name:

   ```bash
   pg_dump -U "database_user" -d "database_name" > backup.sql
   ```

3. Copy backup on custom directory:

   ```bash
   docker cp "container_name_or_id":/backup.sql "root_directory"/backup_$(date +"%Y%m%d_%H%M%S").sql
   ```

4. Restore backup on custom directory:

   - Insert database password after use command

   ```bash
   psql -U "user_db" -d "name_db" -f "root_backup"/backup.sql -W
   ```

### Other Commands

```bash
docker-compose down
```

```bash
docker-compose restart
```
