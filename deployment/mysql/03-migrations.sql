SET @logo_url_exists = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'ref_company_info'
      AND column_name = 'logo_url'
);

SET @add_logo_url = IF(
    @logo_url_exists = 0,
    'ALTER TABLE ref_company_info ADD COLUMN logo_url VARCHAR(500) NULL AFTER company_desc',
    'SET @migration_noop = 1'
);

PREPARE migration_statement FROM @add_logo_url;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

UPDATE ref_company_info
SET logo_url = REPLACE(logo_url, '/uploads/demo/company/', '/assets/company/')
WHERE logo_url LIKE '/uploads/demo/company/%';
