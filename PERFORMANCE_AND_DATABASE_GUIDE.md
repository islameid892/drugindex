# Performance Optimization & Database Editing Guide

## Part 1: Performance Optimization

### Problem Analysis

**Current Issues:**
- `main_data.json`: 12 MB
- `code_map.json`: 13 MB
- Total data: ~25 MB loaded on page load
- Result: Slow initial page load (5-10 seconds on slow connections)

### Solution 1: Lazy Loading Implementation

#### What is Lazy Loading?
Instead of loading all 25 MB of data when the page opens, load data only when users need it:
- Search page: Load only when user searches
- Browse modal: Load only when user clicks "Browse"
- Admin panel: Load only when admin accesses it

#### How to Implement (Code Example)

```javascript
// OLD WAY (Bad - loads everything)
const [mainData, setMainData] = useState([]);

useEffect(() => {
  const data = await fetch('/data/main_data.json');
  setMainData(await data.json()); // Loads 12MB immediately
}, []);

// NEW WAY (Good - lazy loading)
const [mainData, setMainData] = useState(null);
const [loading, setLoading] = useState(false);

const loadMainData = async () => {
  if (mainData) return; // Already loaded
  setLoading(true);
  const data = await fetch('/data/main_data.json');
  setMainData(await data.json());
  setLoading(false);
};

// Call only when needed:
onClick={() => loadMainData()} // Load on button click
```

### Solution 2: IndexedDB Caching

Store downloaded data in browser's local storage so users don't re-download on next visit.

#### How It Works:
1. First visit: Download 25 MB (slow)
2. Browser saves to IndexedDB
3. Next visit: Load from IndexedDB (instant)

#### Implementation:

```javascript
// Save to IndexedDB
const saveToIndexedDB = async (key, data) => {
  const db = await openDB('icd10-db', 1);
  await db.put('data', { key, data, timestamp: Date.now() });
};

// Load from IndexedDB
const loadFromIndexedDB = async (key) => {
  const db = await openDB('icd10-db', 1);
  const item = await db.get('data', key);
  if (item && Date.now() - item.timestamp < 7 * 24 * 60 * 60 * 1000) {
    return item.data; // Return cached data if less than 7 days old
  }
  return null;
};

// Usage:
const loadMainData = async () => {
  // Try cache first
  let data = await loadFromIndexedDB('mainData');
  
  if (!data) {
    // Download if not in cache
    const response = await fetch('/data/main_data.json');
    data = await response.json();
    await saveToIndexedDB('mainData', data);
  }
  
  setMainData(data);
};
```

### Solution 3: Data Pagination

Instead of loading all 46,847 medications at once, load in batches of 100.

#### Implementation:

```javascript
const ITEMS_PER_PAGE = 100;
const [currentPage, setCurrentPage] = useState(1);

const paginatedData = useMemo(() => {
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  return mainData.slice(startIndex, endIndex);
}, [mainData, currentPage]);

// Only render 100 items instead of 46,847
return paginatedData.map(item => <ResultCard key={item.id} item={item} />);
```

### Solution 4: Virtual Scrolling

For long lists, only render visible items (not all 46,847).

#### Library: `react-window`

```bash
npm install react-window
```

```javascript
import { FixedSizeList as List } from 'react-window';

<List
  height={600}
  itemCount={mainData.length}
  itemSize={80}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <ResultCard item={mainData[index]} />
    </div>
  )}
</List>
```

### Solution 5: Compression

Use gzip compression on JSON files (already partially implemented with `.gz` files).

#### Server Configuration:
```nginx
# nginx.conf
gzip on;
gzip_types application/json text/plain;
gzip_min_length 1000;
```

### Performance Improvement Timeline

| Solution | Load Time | Benefit |
|----------|-----------|---------|
| Current | 5-10s | Baseline |
| + Lazy Loading | 1-2s | Load only needed data |
| + IndexedDB Cache | 0.5s | Instant on repeat visits |
| + Pagination | 0.2s | Only render visible items |
| + Virtual Scrolling | 0.1s | Only render visible rows |
| All Combined | <0.5s | 10-20x faster |

---

## Part 2: Manual Database Editing Guide

### Overview

Your data is now in the database (PostgreSQL). You can edit it three ways:

1. **Admin Panel UI** (Easiest)
2. **Direct SQL Queries** (Fastest)
3. **Database Management Tool** (Visual)

---

### Method 1: Admin Panel UI (Easiest)

#### Access the Admin Panel

1. Go to: `https://your-domain.com/admin`
2. Login with your account
3. You'll see tabs for:
   - Medications
   - Conditions
   - Codes
   - Settings

#### Edit a Medication

1. Click "Medications" tab
2. Search for the medication you want to edit
3. Click the medication row
4. Click "Edit" button
5. Modify fields:
   - Trade Names
   - Scientific Name
   - Indication (condition)
   - ICD-10 Codes
   - Coverage Status
6. Click "Save"

#### Add New Medication

1. Click "Add Medication" button
2. Fill in the form:
   ```
   Trade Names: Panadol, Paracetamol
   Scientific Name: Acetaminophen
   Indication: Pain, Fever
   ICD-10 Codes: R50.9, M79.3
   Coverage: Covered
   ```
3. Click "Save"

#### Delete Medication

1. Find the medication
2. Click "Delete" button
3. Confirm deletion

---

### Method 2: Direct SQL Queries (Fastest)

#### Access Database

1. Go to Management UI → Database panel
2. Click "Query Editor"
3. Write SQL queries

#### View All Medications

```sql
SELECT * FROM medications LIMIT 10;
```

#### Search for Specific Medication

```sql
SELECT * FROM medications 
WHERE scientific_name LIKE '%Paracetamol%' 
OR trade_names LIKE '%Panadol%';
```

#### Update Medication

```sql
UPDATE medications 
SET coverage_status = 'Covered'
WHERE scientific_name = 'Acetaminophen';
```

#### Add New Medication

```sql
INSERT INTO medications (trade_names, scientific_name, indication, icd_codes, coverage_status)
VALUES ('Panadol', 'Acetaminophen', 'Pain', 'R50.9,M79.3', 'Covered');
```

#### Delete Medication

```sql
DELETE FROM medications 
WHERE scientific_name = 'Acetaminophen';
```

#### Bulk Update

```sql
UPDATE medications 
SET coverage_status = 'Not Covered'
WHERE scientific_name LIKE '%Aspirin%';
```

#### Add Multiple Medications

```sql
INSERT INTO medications (trade_names, scientific_name, indication, icd_codes, coverage_status)
VALUES 
('Panadol', 'Acetaminophen', 'Pain', 'R50.9', 'Covered'),
('Aspirin', 'Acetylsalicylic Acid', 'Pain', 'M79.3', 'Not Covered'),
('Ibuprofen', 'Ibuprofen', 'Inflammation', 'M19.90', 'Covered');
```

---

### Method 3: Database Management Tool (Visual)

#### Access via Management UI

1. Click "Database" in Management UI
2. You'll see:
   - Table browser
   - Record list
   - Edit/Delete buttons
   - Add new record button

#### Edit Records Visually

1. Click on a table (e.g., "medications")
2. Find the record you want to edit
3. Click the row to expand
4. Click "Edit" button
5. Modify fields in the form
6. Click "Save"

#### Add Record

1. Click "Add Record" button
2. Fill in the form
3. Click "Save"

#### Delete Record

1. Find the record
2. Click "Delete" button
3. Confirm

---

## Part 3: Database Schema Reference

### Medications Table

```sql
CREATE TABLE medications (
  id SERIAL PRIMARY KEY,
  trade_names TEXT,              -- e.g., "Panadol, Acetaminophen"
  scientific_name TEXT,          -- e.g., "Acetaminophen"
  indication TEXT,               -- e.g., "Pain, Fever"
  icd_codes TEXT,                -- e.g., "R50.9, M79.3"
  coverage_status VARCHAR(50),   -- "Covered" or "Not Covered"
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Conditions Table

```sql
CREATE TABLE conditions (
  id SERIAL PRIMARY KEY,
  name TEXT,                     -- e.g., "Diabetes"
  description TEXT,              -- e.g., "Chronic metabolic disorder"
  icd_code VARCHAR(10),          -- e.g., "E11"
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Codes Table (ICD-10)

```sql
CREATE TABLE codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10),              -- e.g., "E11.9"
  description TEXT,              -- e.g., "Type 2 diabetes without complications"
  category VARCHAR(50),          -- e.g., "Endocrine"
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Non-Covered Codes Table

```sql
CREATE TABLE non_covered_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10),              -- e.g., "Z00.00"
  reason TEXT,                   -- e.g., "Preventive screening"
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Part 4: Common Database Tasks

### Task 1: Update All Medications for a Condition

```sql
UPDATE medications 
SET coverage_status = 'Covered'
WHERE indication LIKE '%Diabetes%';
```

### Task 2: Find Medications Without Coverage Info

```sql
SELECT * FROM medications 
WHERE coverage_status IS NULL 
OR coverage_status = '';
```

### Task 3: Export Data to CSV

```sql
-- PostgreSQL
\COPY (SELECT * FROM medications) TO 'medications.csv' CSV HEADER;
```

### Task 4: Backup Database

```bash
# From command line
pg_dump database_name > backup.sql
```

### Task 5: Restore Database

```bash
# From command line
psql database_name < backup.sql
```

### Task 6: Find Duplicate Medications

```sql
SELECT scientific_name, COUNT(*) 
FROM medications 
GROUP BY scientific_name 
HAVING COUNT(*) > 1;
```

### Task 7: Delete Duplicates

```sql
DELETE FROM medications 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM medications 
  GROUP BY scientific_name
);
```

---

## Part 5: Best Practices for Database Editing

### DO ✅

- **Backup before bulk updates**: Always backup before making large changes
- **Use transactions**: Wrap multiple queries in BEGIN/COMMIT
- **Test on sample data first**: Test queries on a few records before bulk operations
- **Document changes**: Keep a log of what you changed and why
- **Use meaningful names**: Keep medication names consistent and clear
- **Validate data**: Check for duplicates and missing information

### DON'T ❌

- **Don't delete without backup**: Always backup first
- **Don't modify without WHERE clause**: Always specify which records to update
- **Don't mix data types**: Keep text as text, numbers as numbers
- **Don't leave NULL values**: Fill in missing information
- **Don't create duplicates**: Check before adding new records
- **Don't modify IDs**: Never change primary key values

---

## Part 6: Troubleshooting

### Problem: Changes Not Showing in Admin Panel

**Solution:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Refresh the page (F5)
3. Check if data was actually saved in database

### Problem: Slow Database Queries

**Solution:**
1. Add indexes to frequently searched columns:
```sql
CREATE INDEX idx_medications_scientific_name ON medications(scientific_name);
CREATE INDEX idx_medications_indication ON medications(indication);
```

2. Avoid SELECT * queries, specify columns:
```sql
-- Bad
SELECT * FROM medications;

-- Good
SELECT id, scientific_name, indication FROM medications;
```

### Problem: Duplicate Data

**Solution:**
```sql
-- Find duplicates
SELECT scientific_name, COUNT(*) FROM medications GROUP BY scientific_name HAVING COUNT(*) > 1;

-- Remove duplicates
DELETE FROM medications WHERE id NOT IN (
  SELECT MIN(id) FROM medications GROUP BY scientific_name
);
```

### Problem: Database Connection Error

**Solution:**
1. Check database URL in environment variables
2. Verify database is running
3. Check firewall/network settings
4. Restart database service

---

## Part 7: Quick Reference

### Most Common Queries

```sql
-- View all medications
SELECT * FROM medications LIMIT 100;

-- Search medications
SELECT * FROM medications WHERE scientific_name LIKE '%Paracetamol%';

-- Update coverage status
UPDATE medications SET coverage_status = 'Covered' WHERE id = 123;

-- Add new medication
INSERT INTO medications (trade_names, scientific_name, indication, icd_codes, coverage_status) 
VALUES ('Name', 'Scientific', 'Indication', 'Codes', 'Covered');

-- Delete medication
DELETE FROM medications WHERE id = 123;

-- Count medications
SELECT COUNT(*) FROM medications;

-- Find medications without coverage info
SELECT * FROM medications WHERE coverage_status IS NULL;

-- Export to CSV
\COPY (SELECT * FROM medications) TO 'medications.csv' CSV HEADER;
```

---

## Support & Resources

- **Database Documentation**: PostgreSQL docs
- **SQL Tutorial**: W3Schools SQL Tutorial
- **Admin Panel Help**: In-app help tooltips
- **Backup Guide**: See Part 6 above

Good luck with your database management!
