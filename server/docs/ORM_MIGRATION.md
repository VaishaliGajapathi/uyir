# ORM Migration Path: Prisma vs Drizzle

## Current State
- Direct SQL queries using `pg` library
- Manual parameterized queries
- No type safety at database layer
- Schema changes via runtime `ALTER TABLE` in `ensureRuntimeSchema()`

## Recommended Option: Prisma

### Why Prisma?
- **Type safety**: Auto-generated TypeScript types from schema
- **Migration system**: Built-in migration management with versioning
- **Developer experience**: Excellent IDE support with autocomplete
- **Ecosystem**: Large community, extensive documentation
- **Query builder**: Intuitive API for complex queries

### Migration Steps

#### Phase 1: Setup (1-2 days)
1. Install Prisma:
   ```bash
   npm install prisma @prisma/client
   npx prisma init
   ```

2. Convert existing schema to Prisma schema:
   - Copy table definitions from `schema.sql` to `prisma/schema.prisma`
   - Map relationships with proper foreign keys
   - Add indexes and constraints

3. Generate Prisma Client:
   ```bash
   npx prisma generate
   ```

#### Phase 2: Migration (2-3 days)
1. Create initial migration:
   ```bash
   npx prisma migrate dev --name init
   ```

2. Replace direct SQL queries with Prisma queries:
   - Start with simple queries (SELECT by ID)
   - Move to complex queries (JOINs, aggregations)
   - Update `db.ts` to use Prisma Client

3. Remove runtime schema migrations:
   - Delete `ensureRuntimeSchema()` function
   - Use Prisma migrations for all schema changes

#### Phase 3: Testing (1-2 days)
1. Run integration tests with Prisma
2. Verify query performance
3. Test migration rollback

### Example Prisma Schema Conversion

#### Current SQL
```sql
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "mobile" TEXT NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
```

#### Prisma Schema
```prisma
model User {
  id        String   @id @default(uuid())
  name      String
  mobile    String   @unique
  responses DonorResponse[]
  requests  BloodRequest[]
}
```

#### Query Conversion
```typescript
// Before
const user = await queryOne<any>('SELECT * FROM "User" WHERE "id" = $1', [userId]);

// After
const user = await prisma.user.findUnique({ where: { id: userId } });
```

## Alternative: Drizzle ORM

### Why Drizzle?
- **Smaller bundle**: More lightweight than Prisma
- **SQL-like API**: Closer to raw SQL queries
- **Type safety**: Strong TypeScript support
- **Performance**: Generally faster than Prisma

### Migration Steps
1. Install Drizzle:
   ```bash
   npm install drizzle-orm postgres
   npm install -D drizzle-kit
   ```

2. Create schema definitions
3. Generate migrations
4. Replace queries with Drizzle API

## Recommendation
**Use Prisma** for this project because:
- Better developer experience for team
- Easier migration from current SQL
- Built-in migration system addresses current fragility
- Larger ecosystem for future needs

## Timeline Estimate
- **Total migration time**: 5-7 days
- **Risk level**: Medium (requires careful testing)
- **Rollback plan**: Keep `db.ts` as backup during migration
