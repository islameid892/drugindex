-- Full-Text Search Indexes for MySQL
-- Run this migration manually after schema sync:
--   mysql -u <user> -p <db> < drizzle/performance_indexes.sql
-- Enables MATCH...AGAINST queries (10-100x faster than LIKE '%query%')

ALTER TABLE drug_entries ADD FULLTEXT INDEX ft_drug_entries_search (scientific_name, trade_name, indication, icd_codes_raw);

ALTER TABLE icd_codes ADD FULLTEXT INDEX ft_icd_codes_search (code, description);

ALTER TABLE icd_branches ADD FULLTEXT INDEX ft_icd_branches_search (branch_code, branch_description);
