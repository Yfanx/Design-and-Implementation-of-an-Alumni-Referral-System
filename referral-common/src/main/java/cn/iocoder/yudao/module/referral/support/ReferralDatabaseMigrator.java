package cn.iocoder.yudao.module.referral.support;

import cn.iocoder.yudao.module.referral.config.ReferralStorageProperties;
import jakarta.annotation.Resource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class ReferralDatabaseMigrator implements ApplicationRunner {

    @Resource
    private ReferralStorageProperties storageProperties;

    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        if (!storageProperties.isMysqlMode() || jdbcTemplate == null) {
            return;
        }
        ensureCompanyLogoColumn();
        migrateCompanyLogoUrls();
    }

    private void ensureCompanyLogoColumn() {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM information_schema.columns
                WHERE table_schema = DATABASE()
                  AND table_name = 'ref_company_info'
                  AND column_name = 'logo_url'
                """, Integer.class);
        if (count != null && count > 0) {
            return;
        }
        jdbcTemplate.execute("ALTER TABLE ref_company_info ADD COLUMN logo_url VARCHAR(500) NULL AFTER company_desc");
    }

    private void migrateCompanyLogoUrls() {
        jdbcTemplate.update("""
                UPDATE ref_company_info
                SET logo_url = REPLACE(logo_url, '/uploads/demo/company/', '/assets/company/')
                WHERE logo_url LIKE '/uploads/demo/company/%'
                """);
    }
}
