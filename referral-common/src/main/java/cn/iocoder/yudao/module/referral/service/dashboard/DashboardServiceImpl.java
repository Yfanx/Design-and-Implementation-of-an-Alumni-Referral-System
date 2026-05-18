package cn.iocoder.yudao.module.referral.service.dashboard;

import cn.iocoder.yudao.module.referral.config.ReferralStorageProperties;
import cn.iocoder.yudao.module.referral.controller.admin.dashboard.vo.ApplicationTrendRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.dashboard.vo.AlumniProcessingTrendRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.dashboard.vo.CityDistributionRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.dashboard.vo.HotJobRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.dashboard.vo.IndustryDistributionRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.dashboard.vo.KeywordCloudRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.dashboard.vo.MapDistributionRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.dashboard.vo.ReferralOverviewRespVO;
import cn.iocoder.yudao.module.referral.dal.dataobject.company.CompanyInfoDO;
import cn.iocoder.yudao.module.referral.dal.dataobject.job.JobInfoDO;
import cn.iocoder.yudao.module.referral.dal.dataobject.referral.ReferralApplicationDO;
import cn.iocoder.yudao.module.referral.enums.ReferralApplicationStatusEnum;
import cn.iocoder.yudao.module.referral.support.ReferralActorContext;
import cn.iocoder.yudao.module.referral.support.ReferralDemoStore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import jakarta.annotation.Resource;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

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

    @Override
    public List<MapDistributionRespVO> getMapDistribution() {
        if (storageProperties.isMysqlMode()) {
            return jdbcTemplate.query("""
                    SELECT city,
                           SUM(job_count) AS job_count,
                           SUM(company_count) AS company_count,
                           SUM(application_count) AS application_count
                    FROM (
                        SELECT city, COUNT(*) AS job_count, 0 AS company_count, 0 AS application_count
                        FROM ref_job_info
                        GROUP BY city
                        UNION ALL
                        SELECT city, 0 AS job_count, COUNT(*) AS company_count, 0 AS application_count
                        FROM ref_company_info
                        GROUP BY city
                        UNION ALL
                        SELECT j.city, 0 AS job_count, 0 AS company_count, COUNT(*) AS application_count
                        FROM ref_referral_application r
                        LEFT JOIN ref_job_info j ON j.id = r.job_id
                        GROUP BY j.city
                    ) stats
                    GROUP BY city
                    ORDER BY (SUM(job_count) * 3 + SUM(application_count) * 2 + SUM(company_count)) DESC, city
                    """, (rs, rowNum) -> new MapDistributionRespVO(
                    rs.getString("city"),
                    rs.getLong("job_count"),
                    rs.getLong("company_count"),
                    rs.getLong("application_count")));
        }

        Map<String, CityMetricAccumulator> cityMap = new LinkedHashMap<>();
        for (JobInfoDO job : referralDemoStore.listJobs()) {
            cityMap.computeIfAbsent(job.getCity(), key -> new CityMetricAccumulator()).jobCount += 1L;
        }
        for (CompanyInfoDO company : referralDemoStore.listCompanies()) {
            cityMap.computeIfAbsent(company.getCity(), key -> new CityMetricAccumulator()).companyCount += 1L;
        }
        for (ReferralApplicationDO referral : referralDemoStore.listReferrals()) {
            JobInfoDO job = referralDemoStore.getJob(referral.getJobId());
            if (job != null) {
                cityMap.computeIfAbsent(job.getCity(), key -> new CityMetricAccumulator()).applicationCount += 1L;
            }
        }
        return cityMap.entrySet().stream()
                .map(entry -> new MapDistributionRespVO(
                        entry.getKey(),
                        entry.getValue().jobCount,
                        entry.getValue().companyCount,
                        entry.getValue().applicationCount))
                .sorted(Comparator.comparingLong((MapDistributionRespVO item) ->
                                item.getJobCount() * 3 + item.getApplicationCount() * 2 + item.getCompanyCount())
                        .reversed())
                .toList();
    }

    @Override
    public List<KeywordCloudRespVO> getKeywordCloud() {
        Map<String, Long> counter = new HashMap<>();
        if (storageProperties.isMysqlMode()) {
            jdbcTemplate.query("""
                    SELECT job_title, industry, skill_requirement
                    FROM ref_job_info
                    """, rs -> {
                while (rs.next()) {
                    accumulateKeywords(counter,
                            rs.getString("job_title"),
                            rs.getString("industry"),
                            rs.getString("skill_requirement"));
                }
            });
            jdbcTemplate.query("""
                    SELECT expected_job, expected_industry, skill_tags
                    FROM ref_student_info
                    """, rs -> {
                while (rs.next()) {
                    accumulateKeywords(counter,
                            rs.getString("expected_job"),
                            rs.getString("expected_industry"),
                            rs.getString("skill_tags"));
                }
            });
        } else {
            referralDemoStore.listJobs().forEach(job -> accumulateKeywords(counter,
                    job.getJobTitle(), job.getIndustry(), job.getSkillRequirement()));
            referralDemoStore.listStudents().forEach(student -> accumulateKeywords(counter,
                    student.getExpectedJob(), student.getExpectedIndustry(), student.getSkillTags()));
        }
        return counter.entrySet().stream()
                .filter(entry -> entry.getKey() != null && !entry.getKey().isBlank())
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(28)
                .map(entry -> new KeywordCloudRespVO(entry.getKey(), entry.getValue()))
                .toList();
    }

    @Override
    public List<AlumniProcessingTrendRespVO> getAlumniProcessingTrend(Integer days) {
        int scopedDays = days == null || days <= 0 ? 7 : Math.min(days, 14);
        ReferralActorContext.Actor actor = ReferralActorContext.getCurrentActor();
        actor.requireRole("ALUMNI", "只有校友可以查看处理趋势");
        Long alumniId = actor.requireProfileId("缺少当前校友档案信息");
        LocalDate today = LocalDate.now();
        LocalDate startDate = today.minusDays(scopedDays - 1L);
        Map<String, AlumniTrendAccumulator> trendMap = initTrendMap(startDate, scopedDays);

        if (storageProperties.isMysqlMode()) {
            jdbcTemplate.query("""
                    SELECT DATE(apply_time) AS day_label, apply_status, COUNT(*) AS total
                    FROM ref_referral_application
                    WHERE alumni_id = ? AND DATE(apply_time) >= ?
                    GROUP BY DATE(apply_time), apply_status
                    ORDER BY DATE(apply_time)
                    """, rs -> {
                while (rs.next()) {
                    LocalDate day = rs.getDate("day_label").toLocalDate();
                    AlumniTrendAccumulator item = trendMap.get(day.format(DateTimeFormatter.ofPattern("MM-dd")));
                    if (item == null) {
                        continue;
                    }
                    accumulateTrend(item, rs.getInt("apply_status"), rs.getLong("total"));
                }
            }, alumniId, startDate);
        } else {
            referralDemoStore.listReferrals().stream()
                    .filter(item -> alumniId.equals(item.getAlumniId()))
                    .filter(item -> item.getApplyTime() != null && !item.getApplyTime().toLocalDate().isBefore(startDate))
                    .forEach(item -> {
                        String label = item.getApplyTime().toLocalDate().format(DateTimeFormatter.ofPattern("MM-dd"));
                        AlumniTrendAccumulator accumulator = trendMap.get(label);
                        if (accumulator != null) {
                            accumulateTrend(accumulator, item.getApplyStatus(), 1L);
                        }
                    });
        }

        return trendMap.entrySet().stream()
                .map(entry -> new AlumniProcessingTrendRespVO(
                        entry.getKey(),
                        entry.getValue().receivedCount,
                        entry.getValue().viewedCount,
                        entry.getValue().referredCount,
                        entry.getValue().finishedCount))
                .toList();
    }

    private void accumulateKeywords(Map<String, Long> counter, String... sources) {
        if (sources == null) {
            return;
        }
        for (String source : sources) {
            for (String token : splitKeywords(source)) {
                counter.merge(token, 1L, Long::sum);
            }
        }
    }

    private List<String> splitKeywords(String source) {
        if (source == null || source.isBlank()) {
            return List.of();
        }
        return List.of(source.split("[,，/|｜、\\s]+")).stream()
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .filter(item -> item.length() > 1 || Set.of("C", "R").contains(item))
                .toList();
    }

    private Map<String, AlumniTrendAccumulator> initTrendMap(LocalDate startDate, int days) {
        Map<String, AlumniTrendAccumulator> map = new LinkedHashMap<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MM-dd");
        for (int i = 0; i < days; i++) {
            map.put(startDate.plusDays(i).format(formatter), new AlumniTrendAccumulator());
        }
        return map;
    }

    private void accumulateTrend(AlumniTrendAccumulator accumulator, Integer status, long total) {
        accumulator.receivedCount += total;
        if (status == null) {
            return;
        }
        if (status >= ReferralApplicationStatusEnum.VIEWED.getStatus()) {
            accumulator.viewedCount += total;
        }
        if (status >= ReferralApplicationStatusEnum.REFERRED.getStatus()
                && !ReferralApplicationStatusEnum.REJECTED.getStatus().equals(status)
                && !ReferralApplicationStatusEnum.CANCELLED.getStatus().equals(status)) {
            accumulator.referredCount += total;
        }
        if (ReferralApplicationStatusEnum.FINISHED.getStatus().equals(status)) {
            accumulator.finishedCount += total;
        }
    }

    private static final class CityMetricAccumulator {
        private long jobCount;
        private long companyCount;
        private long applicationCount;
    }

    private static final class AlumniTrendAccumulator {
        private long receivedCount;
        private long viewedCount;
        private long referredCount;
        private long finishedCount;
    }
}
