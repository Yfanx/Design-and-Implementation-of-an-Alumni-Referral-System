package cn.iocoder.yudao.module.referral.service.dashboard;

import cn.iocoder.yudao.module.referral.config.ReferralStorageProperties;
import cn.iocoder.yudao.module.referral.controller.admin.dashboard.vo.ApplicationTrendRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.dashboard.vo.CityDistributionRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.dashboard.vo.HotJobRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.dashboard.vo.IndustryDistributionRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.dashboard.vo.ReferralOverviewRespVO;
import cn.iocoder.yudao.module.referral.enums.ReferralApplicationStatusEnum;
import cn.iocoder.yudao.module.referral.support.ReferralDemoStore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import jakarta.annotation.Resource;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class DashboardServiceImpl implements DashboardService {

    @Resource
    private ReferralDemoStore referralDemoStore;

    @Resource
    private ReferralStorageProperties storageProperties;

    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

    @Override
    public ReferralOverviewRespVO getReferralOverview() {
        if (storageProperties.isMysqlMode()) {
            ReferralOverviewRespVO overview = new ReferralOverviewRespVO();
            overview.setTotalAlumni(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM ref_alumni_info", Long.class));
            overview.setTotalStudents(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM ref_student_info", Long.class));
            overview.setTotalCompanies(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM ref_company_info", Long.class));
            overview.setTotalJobs(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM ref_job_info", Long.class));
            overview.setTotalApplications(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM ref_referral_application", Long.class));
            overview.setProcessedApplications(jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM ref_referral_application WHERE apply_status <> ?",
                    Long.class, ReferralApplicationStatusEnum.PENDING.getStatus()));
            return overview;
        }
        ReferralOverviewRespVO overview = new ReferralOverviewRespVO();
        overview.setTotalAlumni((long) referralDemoStore.listAlumni().size());
        overview.setTotalStudents((long) referralDemoStore.listStudents().size());
        overview.setTotalCompanies((long) referralDemoStore.listCompanies().size());
        overview.setTotalJobs((long) referralDemoStore.listJobs().size());
        overview.setTotalApplications((long) referralDemoStore.listReferrals().size());
        overview.setProcessedApplications(referralDemoStore.listReferrals().stream()
                .filter(item -> !ReferralApplicationStatusEnum.PENDING.getStatus().equals(item.getApplyStatus()))
                .count());
        return overview;
    }

    @Override
    public List<IndustryDistributionRespVO> getIndustryDistribution() {
        if (storageProperties.isMysqlMode()) {
            return jdbcTemplate.query("""
                    SELECT industry AS name, COUNT(*) AS value
                    FROM ref_company_info
                    GROUP BY industry
                    ORDER BY value DESC
                    """, (rs, rowNum) -> new IndustryDistributionRespVO(rs.getString("name"), rs.getLong("value")));
        }
        return referralDemoStore.countByIndustry().stream()
                .map(item -> new IndustryDistributionRespVO(item.getKey(), item.getValue()))
                .toList();
    }

    @Override
    public List<CityDistributionRespVO> getCityDistribution() {
        if (storageProperties.isMysqlMode()) {
            return jdbcTemplate.query("""
                    SELECT city AS name, COUNT(*) AS value
                    FROM ref_job_info
                    GROUP BY city
                    ORDER BY value DESC
                    """, (rs, rowNum) -> new CityDistributionRespVO(rs.getString("name"), rs.getLong("value")));
        }
        return referralDemoStore.countByCity().stream()
                .map(item -> new CityDistributionRespVO(item.getKey(), item.getValue()))
                .toList();
    }

    @Override
    public List<HotJobRespVO> getHotJobs() {
        if (storageProperties.isMysqlMode()) {
            return jdbcTemplate.query("""
                    SELECT j.job_title, COUNT(r.id) AS count
                    FROM ref_referral_application r
                    LEFT JOIN ref_job_info j ON j.id = r.job_id
                    GROUP BY j.job_title
                    ORDER BY count DESC
                    """, (rs, rowNum) -> new HotJobRespVO(rs.getString("job_title"), rs.getLong("count")));
        }
        return referralDemoStore.countHotJobs().stream()
                .map(item -> new HotJobRespVO(item.getKey(), item.getValue()))
                .toList();
    }

    @Override
    public List<ApplicationTrendRespVO> getApplicationTrend() {
        if (storageProperties.isMysqlMode()) {
            LocalDate today = LocalDate.now();
            LocalDate startDate = today.minusDays(4);
            List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                    SELECT DATE(apply_time) AS day_label, COUNT(*) AS total
                    FROM ref_referral_application
                    WHERE DATE(apply_time) >= ?
                    GROUP BY DATE(apply_time)
                    ORDER BY DATE(apply_time)
                    """, startDate);

            Map<String, Long> countMap = new LinkedHashMap<>();
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MM-dd");
            for (int i = 0; i < 5; i++) {
                LocalDate current = startDate.plusDays(i);
                countMap.put(current.format(formatter), 0L);
            }
            for (Map<String, Object> row : rows) {
                Object label = row.get("day_label");
                Object total = row.get("total");
                if (label instanceof java.sql.Date sqlDate) {
                    countMap.put(sqlDate.toLocalDate().format(formatter), ((Number) total).longValue());
                }
            }

            List<ApplicationTrendRespVO> trends = new ArrayList<>();
            countMap.forEach((label, count) -> trends.add(new ApplicationTrendRespVO(label, count)));
            return trends;
        }

        return List.of(
                new ApplicationTrendRespVO("周一", 2L),
                new ApplicationTrendRespVO("周二", 3L),
                new ApplicationTrendRespVO("周三", 4L),
                new ApplicationTrendRespVO("周四", 2L),
                new ApplicationTrendRespVO("周五", 5L)
        );
    }
}
