# ICD-10 Search Engine - Database Migration Guide

## Overview

This guide explains how to migrate data from JSON files to PostgreSQL database while maintaining the existing website functionality. The migration follows a **hybrid approach** where the website continues to read from JSON files, while the Admin Panel manages data through the database.

## Architecture

### Current Setup (JSON-based)
- Website reads from JSON files: `medications_data.json`, `tree_data.json`, `non_covered_codes_full.json`
- All 46,847 medications, 540 conditions, and 40,316 codes are loaded into memory
- Search and browse functionality work with in-memory data

### New Setup (Hybrid)
- **Frontend**: Continues to read from JSON files (no changes needed)
- **Admin Panel**: Reads/writes to PostgreSQL database
- **Database**: Stores all medical data for future use
- **Migration**: One-time script to populate database from JSON

## Database Schema

### Tables Created

#### `medications`
```sql
CREATE TABLE medications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  scientificName VARCHAR(255) NOT NULL,
  tradeNames JSON,
  indication VARCHAR(255),
  icdCodes JSON,
  coverageStatus VARCHAR(50),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### `conditions`
```sql
CREATE TABLE conditions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL UNIQUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### `codes`
```sql
CREATE TABLE codes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL UNIQUE,
  name TEXT,
  branches JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### `non_covered_codes`
```sql
CREATE TABLE non_covered_codes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL UNIQUE,
  name TEXT,
  branches JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Migration Process

### Step 1: Prepare Database

Ensure PostgreSQL is running and the database schema is created:

```bash
# Push database schema
pnpm db:push
```

### Step 2: Run Migration Script

The migration script (`server/scripts/migrate-data.mjs`) loads JSON files and inserts data into the database:

```bash
# Run the migration
node server/scripts/migrate-data.mjs
```

**What the script does:**
1. Connects to PostgreSQL database
2. Loads `medications_data.json` (46,847 records)
3. Loads `tree_data.json` (40,316 records)
4. Loads `non_covered_codes_full.json` (202 records)
5. Extracts unique conditions from medications
6. Inserts all data into respective tables
7. Reports statistics

**Expected output:**
```
✅ Migration completed successfully!
Summary:
  - Medications: 46,847
  - Conditions: 540
  - Codes: 40,316
  - Non-Covered Codes: 202
```

### Step 3: Verify Migration

Check that data was inserted correctly:

```bash
# Access the Admin Panel at /admin
# Login with your account
# View statistics on the Overview tab
```

## Admin Panel

Access the Admin Panel at `/admin` to manage your data.

### Features

- **Overview Tab**: View database statistics
- **Medications Tab**: Manage medications (coming soon)
- **Codes Tab**: Manage ICD-10 codes (coming soon)
- **Settings Tab**: 
  - Run Data Migration
  - Export Database to JSON
  - Clear Database

### Admin Access

Only users with `role = "admin"` can access the Admin Panel. To make a user admin:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

## API Endpoints (tRPC)

### Public Procedures

```typescript
// Get all medications
trpc.data.medications.getAll.useQuery()

// Search medications
trpc.data.medications.search.useQuery({ query: "aspirin" })

// Get all conditions
trpc.data.conditions.getAll.useQuery()

// Get all codes
trpc.data.codes.getAll.useQuery()

// Get all non-covered codes
trpc.data.nonCoveredCodes.getAll.useQuery()
```

### Admin Procedures

```typescript
// Get database statistics (requires authentication)
trpc.data.admin.getStats.useQuery()
```

## File Locations

- **JSON Files**: `/public/data/`
  - `main_data.json` - Medications data
  - `tree_data.json` - ICD-10 codes hierarchy
  - `non_covered_codes_full.json` - Non-covered codes

- **Migration Script**: `server/scripts/migrate-data.mjs`

- **Database Queries**: `server/db.ts`

- **tRPC Router**: `server/routers/data.ts`

- **Admin Panel UI**: `client/src/pages/AdminPanel.tsx`

## Troubleshooting

### Migration fails with "Cannot find JSON files"
- Ensure JSON files are in `/public/data/` directory
- Check file names match exactly

### Database connection error
- Verify `DATABASE_URL` environment variable is set
- Check PostgreSQL is running
- Verify database credentials

### Admin Panel shows "Access Denied"
- Ensure you're logged in
- Check your user role is set to "admin" in the database

### Statistics show 0 records
- Run the migration script again
- Check database connection
- Verify data was inserted: `SELECT COUNT(*) FROM medications;`

## Next Steps

### Phase 1: Current (Hybrid Mode)
- Website reads from JSON
- Admin Panel manages database
- Data is synced via migration script

### Phase 2: Future (Database-first)
- Website reads from database
- Admin Panel manages database
- JSON files become optional backup

### Phase 3: Advanced Features
- Real-time data updates
- User roles and permissions
- Audit logging
- Data export/import tools

## Backup Strategy

### Before Migration
```bash
# Backup JSON files
cp -r public/data public/data.backup
```

### After Migration
```bash
# Export database to JSON (when feature is implemented)
# This will create a backup of database as JSON
```

## Performance Notes

- **Initial Load**: First migration takes ~5-10 minutes for 87,000+ records
- **Database Queries**: Indexed by code/name for fast searches
- **In-Memory Cache**: Frontend continues using JSON (no performance impact)
- **Admin Panel**: Database queries are optimized with pagination

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review database schema in `drizzle/schema.ts`
3. Check tRPC procedures in `server/routers/data.ts`
4. Review migration script in `server/scripts/migrate-data.mjs`
