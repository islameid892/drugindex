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
- [x] Run migration successfully - 46,847 medications, 540 conditions, 40,316 codes, 202 non-covered codes

## Phase 3: tRPC Procedures
- [x] Create procedures for medications CRUD
- [x] Create procedures for conditions CRUD
- [x] Create procedures for codes CRUD
- [x] Create procedures for non-covered codes CRUD
- [x] Add authentication checks (admin only)

## Phase 4: Testing
- [x] Test Admin Panel UI
- [x] Test data migration - completed successfully
- [ ] Test CRUD operations
- [x] Verify search functionality still works
- [x] Verify browse modals still work

## Phase 5: Documentation
- [ ] Document Admin Panel usage
- [ ] Document API endpoints

## SEO Improvements - Phase 1
- [x] Fix page title length (28 → 51 characters)
- [x] Add keywords meta tag
- [x] Enhance meta description with keywords
- [x] Add dynamic title setting with useEffect
- [x] Add Saudi insurance and KSA drugs keywords

## SEO Improvements - Phase 2 (Advanced)
- [x] Add Open Graph meta tags (og:title, og:description, og:image)
- [x] Add Twitter Card meta tags (twitter:card, twitter:title, twitter:description)
- [x] Create robots.txt file
- [x] Create sitemap.xml file
- [x] Add JSON-LD Structured Data (MedicalWebApplication)
- [x] Create structuredData.ts utility functions
- [x] Add FAQSchema to Home page
- [x] Add OrganizationSchema to Home page
- [x] Add BreadcrumbSchema helper function
- [x] Write tests for structured data functions
