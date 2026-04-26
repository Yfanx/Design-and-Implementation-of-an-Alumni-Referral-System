package cn.iocoder.yudao.module.referral.service.job;

import cn.iocoder.yudao.framework.common.pojo.PageResult;
import cn.iocoder.yudao.module.referral.config.ReferralStorageProperties;
import cn.iocoder.yudao.module.referral.controller.admin.job.vo.JobInfoCreateReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.job.vo.JobInfoMatchPageReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.job.vo.JobInfoPageReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.job.vo.JobInfoRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.job.vo.JobInfoUpdateReqVO;
import cn.iocoder.yudao.module.referral.dal.dataobject.company.CompanyInfoDO;
import cn.iocoder.yudao.module.referral.dal.dataobject.job.JobInfoDO;
import cn.iocoder.yudao.module.referral.enums.JobAuditStatusEnum;
import cn.iocoder.yudao.module.referral.enums.JobStatusEnum;
import cn.iocoder.yudao.module.referral.support.ReferralActorContext;
import cn.iocoder.yudao.module.referral.support.ReferralDemoStore;
import jakarta.annotation.Resource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class JobInfoServiceImpl implements JobInfoService {

    @Resource
    private ReferralDemoStore referralDemoStore;

    @Resource
    private ReferralStorageProperties storageProperties;

    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

    @Override
    public Long createJobInfo(JobInfoCreateReqVO createReqVO) {
        ReferralActorContext.Actor actor = ReferralActorContext.getCurrentActor();
        actor.requireRole("ALUMNI", "只有校友可以发布岗位");
        Long alumniId = actor.requireProfileId("缺少当前校友档案信息");
        AlumniCompanyBinding companyBinding = resolveAlumniCompanyBinding(alumniId);
        if (storageProperties.isMysqlMode()) {
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement("""
                        INSERT INTO ref_job_info
                        (alumni_id, company_id, job_title, job_type, industry, city, salary_range,
                         education_requirement, experience_requirement, skill_requirement, job_desc,
                         contact_type, referral_quota, status, audit_status, publish_time, expire_time)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, Statement.RETURN_GENERATED_KEYS);
                ps.setLong(1, alumniId);
                ps.setLong(2, companyBinding.companyId());
                ps.setString(3, createReqVO.getJobTitle());
                ps.setString(4, createReqVO.getJobType());
                ps.setString(5, createReqVO.getIndustry());
                ps.setString(6, createReqVO.getCity());
                ps.setString(7, createReqVO.getSalaryRange());
                ps.setString(8, createReqVO.getEducationRequirement());
                ps.setString(9, createReqVO.getExperienceRequirement());
                ps.setString(10, createReqVO.getSkillRequirement());
                ps.setString(11, createReqVO.getJobDesc());
                ps.setString(12, createReqVO.getContactType());
                ps.setObject(13, createReqVO.getReferralQuota());
                ps.setInt(14, JobStatusEnum.PENDING.getStatus());
                ps.setInt(15, JobAuditStatusEnum.WAITING.getStatus());
                ps.setObject(16, LocalDateTime.now());
                ps.setObject(17, createReqVO.getExpireTime());
                return ps;
            }, keyHolder);
            return keyHolder.getKey().longValue();
        }
        JobInfoDO jobInfo = new JobInfoDO();
        copyFields(createReqVO, jobInfo);
        jobInfo.setAlumniId(alumniId);
        jobInfo.setCompanyId(companyBinding.companyId());
        jobInfo.setStatus(JobStatusEnum.PENDING.getStatus());
        jobInfo.setAuditStatus(JobAuditStatusEnum.WAITING.getStatus());
        jobInfo.setPublishTime(LocalDateTime.now());
        return referralDemoStore.saveJob(jobInfo).getId();
    }

    @Override
    public void updateJobInfo(JobInfoUpdateReqVO updateReqVO) {
        ReferralActorContext.Actor actor = ReferralActorContext.getCurrentActor();
        AlumniCompanyBinding companyBinding = actor.isAlumni()
                ? resolveAlumniCompanyBinding(actor.requireProfileId("缺少当前校友档案信息"))
                : null;
        if (storageProperties.isMysqlMode()) {
            JobOwnership ownership = requireJobOwnership(updateReqVO.getId(), actor, "无权修改该岗位");
            jdbcTemplate.update("""
                    UPDATE ref_job_info
                    SET alumni_id = ?, company_id = ?, job_title = ?, job_type = ?, industry = ?, city = ?, salary_range = ?,
                        education_requirement = ?, experience_requirement = ?, skill_requirement = ?, job_desc = ?,
                        contact_type = ?, referral_quota = ?, expire_time = ?, audit_status = ?, status = ?
                    WHERE id = ?
                    """,
                    ownership.alumniId(), actor.isAlumni() ? companyBinding.companyId() : updateReqVO.getCompanyId(), updateReqVO.getJobTitle(), updateReqVO.getJobType(),
                    updateReqVO.getIndustry(), updateReqVO.getCity(), updateReqVO.getSalaryRange(),
                    updateReqVO.getEducationRequirement(), updateReqVO.getExperienceRequirement(), updateReqVO.getSkillRequirement(),
                    updateReqVO.getJobDesc(), updateReqVO.getContactType(), updateReqVO.getReferralQuota(),
                    updateReqVO.getExpireTime(),
                    actor.isAlumni() ? JobAuditStatusEnum.WAITING.getStatus() : ownership.auditStatus(),
                    actor.isAlumni() ? JobStatusEnum.PENDING.getStatus() : ownership.status(),
                    updateReqVO.getId());
            return;
        }
        JobInfoDO jobInfo = referralDemoStore.getJob(updateReqVO.getId());
        if (jobInfo == null) {
            return;
        }
        requireJobOwnership(jobInfo, actor, "无权修改该岗位");
        copyFields(updateReqVO, jobInfo);
        if (actor.isAlumni()) {
            jobInfo.setCompanyId(companyBinding.companyId());
            jobInfo.setAuditStatus(JobAuditStatusEnum.WAITING.getStatus());
            jobInfo.setStatus(JobStatusEnum.PENDING.getStatus());
        }
        referralDemoStore.saveJob(jobInfo);
    }

    @Override
    public JobInfoRespVO getJobInfo(Long id) {
        if (storageProperties.isMysqlMode()) {
            List<JobInfoRespVO> list = jdbcTemplate.query("""
                    SELECT j.id, j.alumni_id, j.company_id, c.company_name, j.job_title, j.job_type, j.industry, j.city,
                           j.salary_range, j.education_requirement, j.experience_requirement, j.skill_requirement,
                           j.job_desc, j.referral_quota, j.status, j.audit_status, j.publish_time, j.expire_time
                    FROM ref_job_info j
                    LEFT JOIN ref_company_info c ON c.id = j.company_id
                    WHERE j.id = ?
                    """, (rs, rowNum) -> mapJob(rs), id);
            return list.isEmpty() ? null : list.get(0);
        }
        JobInfoDO jobInfo = referralDemoStore.getJob(id);
        return jobInfo == null ? null : convert(jobInfo);
    }

    @Override
    public PageResult<JobInfoRespVO> getJobInfoPage(JobInfoPageReqVO pageReqVO) {
        ReferralActorContext.Actor actor = ReferralActorContext.getCurrentActor();
        Long scopedAlumniId = actor.isAlumni() ? actor.requireProfileId("缺少当前校友档案信息") : pageReqVO.getAlumniId();
        if (storageProperties.isMysqlMode()) {
            List<JobInfoRespVO> list = jdbcTemplate.query("""
                    SELECT j.id, j.alumni_id, j.company_id, c.company_name, j.job_title, j.job_type, j.industry, j.city,
                           j.salary_range, j.education_requirement, j.experience_requirement, j.skill_requirement,
                           j.job_desc, j.referral_quota, j.status, j.audit_status, j.publish_time, j.expire_time
                    FROM ref_job_info j
                    LEFT JOIN ref_company_info c ON c.id = j.company_id
                    ORDER BY j.id DESC
                    """, (rs, rowNum) -> mapJob(rs)).stream()
                    .filter(item -> scopedAlumniId == null || item.getAlumniId().equals(scopedAlumniId))
                    .filter(item -> pageReqVO.getJobTitle() == null || item.getJobTitle().contains(pageReqVO.getJobTitle()))
                    .filter(item -> pageReqVO.getIndustry() == null || item.getIndustry().contains(pageReqVO.getIndustry()))
                    .filter(item -> pageReqVO.getCity() == null || item.getCity().contains(pageReqVO.getCity()))
                    .filter(item -> pageReqVO.getStatus() == null || item.getStatus().equals(pageReqVO.getStatus()))
                    .filter(item -> pageReqVO.getAuditStatus() == null || item.getAuditStatus().equals(pageReqVO.getAuditStatus()))
                    .toList();
            return new PageResult<>(list, (long) list.size());
        }
        List<JobInfoRespVO> filtered = referralDemoStore.listJobs().stream()
                .filter(item -> scopedAlumniId == null || item.getAlumniId().equals(scopedAlumniId))
                .filter(item -> pageReqVO.getJobTitle() == null || item.getJobTitle().contains(pageReqVO.getJobTitle()))
                .filter(item -> pageReqVO.getIndustry() == null || item.getIndustry().contains(pageReqVO.getIndustry()))
                .filter(item -> pageReqVO.getCity() == null || item.getCity().contains(pageReqVO.getCity()))
                .filter(item -> pageReqVO.getStatus() == null || item.getStatus().equals(pageReqVO.getStatus()))
                .filter(item -> pageReqVO.getAuditStatus() == null || item.getAuditStatus().equals(pageReqVO.getAuditStatus()))
                .map(this::convert)
                .toList();
        return new PageResult<>(filtered, (long) filtered.size());
    }

    @Override
    public void auditJobInfo(Long id, Integer auditStatus) {
        ReferralActorContext.getCurrentActor().requireRole("ADMIN", "只有管理员可以审核岗位");
        if (storageProperties.isMysqlMode()) {
            int status = auditStatus != null && auditStatus.equals(JobAuditStatusEnum.APPROVED.getStatus())
                    ? JobStatusEnum.PUBLISHED.getStatus() : JobStatusEnum.PENDING.getStatus();
            jdbcTemplate.update("UPDATE ref_job_info SET audit_status = ?, status = ? WHERE id = ?", auditStatus, status, id);
            return;
        }
        JobInfoDO jobInfo = referralDemoStore.getJob(id);
        if (jobInfo == null) {
            return;
        }
        jobInfo.setAuditStatus(auditStatus);
        jobInfo.setStatus(auditStatus != null && auditStatus.equals(JobAuditStatusEnum.APPROVED.getStatus())
                ? JobStatusEnum.PUBLISHED.getStatus() : JobStatusEnum.PENDING.getStatus());
        referralDemoStore.saveJob(jobInfo);
    }

    @Override
    public PageResult<JobInfoRespVO> getJobMatchPage(JobInfoMatchPageReqVO pageReqVO) {
        if (storageProperties.isMysqlMode()) {
            List<JobInfoRespVO> list = jdbcTemplate.query("""
                    SELECT j.id, j.alumni_id, j.company_id, c.company_name, j.job_title, j.job_type, j.industry, j.city,
                           j.salary_range, j.education_requirement, j.experience_requirement, j.skill_requirement,
                           j.job_desc, j.referral_quota, j.status, j.audit_status, j.publish_time, j.expire_time
                    FROM ref_job_info j
                    LEFT JOIN ref_company_info c ON c.id = j.company_id
                    ORDER BY j.id DESC
                    """, (rs, rowNum) -> mapJob(rs)).stream()
                    .filter(item -> item.getAuditStatus() != null && item.getAuditStatus().equals(JobAuditStatusEnum.APPROVED.getStatus()))
                    .filter(item -> item.getStatus() != null && item.getStatus().equals(JobStatusEnum.PUBLISHED.getStatus()))
                    .filter(item -> pageReqVO.getIndustry() == null || item.getIndustry().contains(pageReqVO.getIndustry()))
                    .filter(item -> pageReqVO.getCity() == null || item.getCity().contains(pageReqVO.getCity()))
                    .filter(item -> pageReqVO.getExpectedJob() == null || item.getJobTitle().contains(pageReqVO.getExpectedJob()))
                    .filter(item -> pageReqVO.getEducation() == null || item.getEducationRequirement().contains(pageReqVO.getEducation()))
                    .filter(item -> pageReqVO.getKeyword() == null || item.getJobTitle().contains(pageReqVO.getKeyword())
                            || item.getJobDesc().contains(pageReqVO.getKeyword()))
                    .toList();
            return new PageResult<>(list, (long) list.size());
        }
        List<JobInfoRespVO> filtered = referralDemoStore.listJobs().stream()
                .filter(item -> item.getAuditStatus() != null && item.getAuditStatus().equals(JobAuditStatusEnum.APPROVED.getStatus()))
                .filter(item -> item.getStatus() != null && item.getStatus().equals(JobStatusEnum.PUBLISHED.getStatus()))
                .filter(item -> pageReqVO.getIndustry() == null || item.getIndustry().contains(pageReqVO.getIndustry()))
                .filter(item -> pageReqVO.getCity() == null || item.getCity().contains(pageReqVO.getCity()))
                .filter(item -> pageReqVO.getExpectedJob() == null || item.getJobTitle().contains(pageReqVO.getExpectedJob()))
                .filter(item -> pageReqVO.getEducation() == null || item.getEducationRequirement().contains(pageReqVO.getEducation()))
                .filter(item -> pageReqVO.getKeyword() == null
                        || item.getJobTitle().contains(pageReqVO.getKeyword())
                        || item.getJobDesc().contains(pageReqVO.getKeyword()))
                .map(this::convert)
                .toList();
        return new PageResult<>(filtered, (long) filtered.size());
    }

    @Override
    public void deleteJobInfo(Long id) {
        ReferralActorContext.Actor actor = ReferralActorContext.getCurrentActor();
        if (storageProperties.isMysqlMode()) {
            requireJobOwnership(id, actor, "无权删除该岗位");
            jdbcTemplate.update("DELETE FROM ref_job_info WHERE id = ?", id);
            return;
        }
        JobInfoDO jobInfo = referralDemoStore.getJob(id);
        if (jobInfo == null) {
            return;
        }
        requireJobOwnership(jobInfo, actor, "无权删除该岗位");
        referralDemoStore.removeJob(id);
    }

    private JobOwnership requireJobOwnership(Long jobId, ReferralActorContext.Actor actor, String message) {
        actor.requireLoggedIn();
        if (actor.isAdmin()) {
            List<JobOwnership> jobs = jdbcTemplate.query("""
                    SELECT id, alumni_id, audit_status, status
                    FROM ref_job_info WHERE id = ?
                    """, (rs, rowNum) -> new JobOwnership(
                    rs.getLong("id"),
                    rs.getLong("alumni_id"),
                    rs.getInt("audit_status"),
                    rs.getInt("status")), jobId);
            if (jobs.isEmpty()) {
                throw new IllegalArgumentException("岗位不存在");
            }
            return jobs.get(0);
        }
        actor.requireRole("ALUMNI", message);
        Long currentAlumniId = actor.requireProfileId(message);
        List<JobOwnership> jobs = jdbcTemplate.query("""
                SELECT id, alumni_id, audit_status, status
                FROM ref_job_info WHERE id = ?
                """, (rs, rowNum) -> new JobOwnership(
                rs.getLong("id"),
                rs.getLong("alumni_id"),
                rs.getInt("audit_status"),
                rs.getInt("status")), jobId);
        if (jobs.isEmpty()) {
            throw new IllegalArgumentException("岗位不存在");
        }
        JobOwnership ownership = jobs.get(0);
        if (!currentAlumniId.equals(ownership.alumniId())) {
            throw new IllegalArgumentException(message);
        }
        return ownership;
    }

    private void requireJobOwnership(JobInfoDO jobInfo, ReferralActorContext.Actor actor, String message) {
        actor.requireLoggedIn();
        if (jobInfo == null) {
            throw new IllegalArgumentException("岗位不存在");
        }
        if (actor.isAdmin()) {
            return;
        }
        actor.requireRole("ALUMNI", message);
        if (!actor.requireProfileId(message).equals(jobInfo.getAlumniId())) {
            throw new IllegalArgumentException(message);
        }
    }

    private void copyFields(JobInfoCreateReqVO source, JobInfoDO target) {
        target.setCompanyId(source.getCompanyId());
        target.setJobTitle(source.getJobTitle());
        target.setJobType(source.getJobType());
        target.setIndustry(source.getIndustry());
        target.setCity(source.getCity());
        target.setSalaryRange(source.getSalaryRange());
        target.setEducationRequirement(source.getEducationRequirement());
        target.setExperienceRequirement(source.getExperienceRequirement());
        target.setSkillRequirement(source.getSkillRequirement());
        target.setJobDesc(source.getJobDesc());
        target.setContactType(source.getContactType());
        target.setReferralQuota(source.getReferralQuota());
        target.setExpireTime(source.getExpireTime());
    }

    private AlumniCompanyBinding resolveAlumniCompanyBinding(Long alumniId) {
        if (storageProperties.isMysqlMode()) {
            List<AlumniCompanyBinding> bindings = jdbcTemplate.query("""
                    SELECT company_id, company_name
                    FROM ref_alumni_info
                    WHERE id = ?
                    """, (rs, rowNum) -> new AlumniCompanyBinding(
                    (Long) rs.getObject("company_id"),
                    rs.getString("company_name")), alumniId);
            if (bindings.isEmpty()) {
                throw new IllegalArgumentException("当前校友资料不存在");
            }
            AlumniCompanyBinding binding = bindings.get(0);
            if (binding.companyId() == null || binding.companyName() == null || binding.companyName().isBlank()) {
                throw new IllegalArgumentException("请先在我的资料中维护所属企业后再发布岗位");
            }
            return binding;
        }
        var alumniInfo = referralDemoStore.getAlumni(alumniId);
        if (alumniInfo == null) {
            throw new IllegalArgumentException("当前校友资料不存在");
        }
        if (alumniInfo.getCompanyId() == null || alumniInfo.getCompanyName() == null || alumniInfo.getCompanyName().isBlank()) {
            throw new IllegalArgumentException("请先在我的资料中维护所属企业后再发布岗位");
        }
        return new AlumniCompanyBinding(alumniInfo.getCompanyId(), alumniInfo.getCompanyName());
    }

    private JobInfoRespVO convert(JobInfoDO source) {
        CompanyInfoDO companyInfo = referralDemoStore.getCompany(source.getCompanyId());
        JobInfoRespVO target = new JobInfoRespVO();
        target.setId(source.getId());
        target.setAlumniId(source.getAlumniId());
        target.setCompanyId(source.getCompanyId());
        target.setCompanyName(companyInfo == null ? null : companyInfo.getCompanyName());
        target.setJobTitle(source.getJobTitle());
        target.setJobType(source.getJobType());
        target.setIndustry(source.getIndustry());
        target.setCity(source.getCity());
        target.setSalaryRange(source.getSalaryRange());
        target.setEducationRequirement(source.getEducationRequirement());
        target.setExperienceRequirement(source.getExperienceRequirement());
        target.setSkillRequirement(source.getSkillRequirement());
        target.setJobDesc(source.getJobDesc());
        target.setReferralQuota(source.getReferralQuota());
        target.setStatus(source.getStatus());
        target.setAuditStatus(source.getAuditStatus());
        target.setPublishTime(source.getPublishTime());
        target.setExpireTime(source.getExpireTime());
        return target;
    }

    private JobInfoRespVO mapJob(java.sql.ResultSet rs) throws java.sql.SQLException {
        JobInfoRespVO target = new JobInfoRespVO();
        target.setId(rs.getLong("id"));
        target.setAlumniId(rs.getLong("alumni_id"));
        target.setCompanyId(rs.getLong("company_id"));
        target.setCompanyName(rs.getString("company_name"));
        target.setJobTitle(rs.getString("job_title"));
        target.setJobType(rs.getString("job_type"));
        target.setIndustry(rs.getString("industry"));
        target.setCity(rs.getString("city"));
        target.setSalaryRange(rs.getString("salary_range"));
        target.setEducationRequirement(rs.getString("education_requirement"));
        target.setExperienceRequirement(rs.getString("experience_requirement"));
        target.setSkillRequirement(rs.getString("skill_requirement"));
        target.setJobDesc(rs.getString("job_desc"));
        target.setReferralQuota(rs.getInt("referral_quota"));
        target.setStatus(rs.getInt("status"));
        target.setAuditStatus(rs.getInt("audit_status"));
        if (rs.getTimestamp("publish_time") != null) {
            target.setPublishTime(rs.getTimestamp("publish_time").toLocalDateTime());
        }
        if (rs.getTimestamp("expire_time") != null) {
            target.setExpireTime(rs.getTimestamp("expire_time").toLocalDateTime());
        }
        return target;
    }

    private record JobOwnership(Long id, Long alumniId, Integer auditStatus, Integer status) {
    }

    private record AlumniCompanyBinding(Long companyId, String companyName) {
    }
}
