# ICD-10 Search Engine - Database Migration TODO

## Phase 1: Admin Panel UI
- [x] Create Admin Panel page component
- [x] Add Admin Panel route to App.tsx
- [ ] Create Admin Panel navigation in DashboardLayout

## Phase 2: Data Migration Script
- [x] Create migration script to load JSON files
- [x] Parse medications_data.json
- [x] Parse tree_data.json
- [x] Parse non_covered_codes_full.json
- [x] Insert data into database tables

## Phase 3: tRPC Procedures
- [x] Create procedures for medications CRUD
- [x] Create procedures for conditions CRUD
- [x] Create procedures for codes CRUD
- [x] Create procedures for non-covered codes CRUD
- [x] Add authentication checks (admin only)

## Phase 4: Testing
- [ ] Test Admin Panel UI
- [ ] Test data migration
- [ ] Test CRUD operations
- [ ] Verify search functionality still works
- [ ] Verify browse modals still work

## Phase 5: Documentation
- [ ] Document Admin Panel usage
- [ ] Document API endpoints
- [ ] Create backup strategy
