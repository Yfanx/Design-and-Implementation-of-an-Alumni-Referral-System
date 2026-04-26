package cn.iocoder.yudao.module.referral.service.referral;

import cn.iocoder.yudao.framework.common.pojo.PageResult;
import cn.iocoder.yudao.module.referral.config.ReferralStorageProperties;
import cn.iocoder.yudao.module.referral.controller.admin.referral.vo.ReferralApplicationCreateReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.referral.vo.ReferralApplicationPageReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.referral.vo.ReferralApplicationRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.referral.vo.ReferralApplicationUpdateStatusReqVO;
import cn.iocoder.yudao.module.referral.dal.dataobject.alumni.AlumniInfoDO;
import cn.iocoder.yudao.module.referral.dal.dataobject.job.JobInfoDO;
import cn.iocoder.yudao.module.referral.dal.dataobject.referral.ReferralApplicationDO;
import cn.iocoder.yudao.module.referral.dal.dataobject.student.StudentInfoDO;
import cn.iocoder.yudao.module.referral.enums.JobAuditStatusEnum;
import cn.iocoder.yudao.module.referral.enums.JobStatusEnum;
import cn.iocoder.yudao.module.referral.enums.ReferralApplicationStatusEnum;
import cn.iocoder.yudao.module.referral.support.ReferralActorContext;
import cn.iocoder.yudao.module.referral.support.ReferralDemoStore;
import jakarta.annotation.Resource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class ReferralApplicationServiceImpl implements ReferralApplicationService {

    @Resource
    private ReferralDemoStore referralDemoStore;

    @Resource
    private ReferralStorageProperties storageProperties;

    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

    @Override
    public Long createReferralApplication(ReferralApplicationCreateReqVO createReqVO) {
        ReferralActorContext.Actor actor = ReferralActorContext.getCurrentActor();
        actor.requireRole("STUDENT", "只有学生可以发起内推申请");
        Long studentId = actor.requireProfileId("缺少当前学生档案信息");
        JobSnapshot job = requirePublishedJob(createReqVO.getJobId());
        ensureStudentNotApplied(job.id(), studentId);
        if (storageProperties.isMysqlMode()) {
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement("""
                        INSERT INTO ref_referral_application
                        (job_id, student_id, alumni_id, resume_url, self_introduction, match_score, apply_status, apply_time)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """, Statement.RETURN_GENERATED_KEYS);
                ps.setLong(1, job.id());
                ps.setLong(2, studentId);
                ps.setLong(3, job.alumniId());
                ps.setString(4, createReqVO.getResumeUrl());
                ps.setString(5, createReqVO.getSelfIntroduction());
                ps.setBigDecimal(6, BigDecimal.valueOf(85));
                ps.setInt(7, ReferralApplicationStatusEnum.PENDING.getStatus());
                ps.setObject(8, LocalDateTime.now());
                return ps;
            }, keyHolder);
            return keyHolder.getKey().longValue();
        }
        ReferralApplicationDO referralApplication = new ReferralApplicationDO();
        referralApplication.setJobId(job.id());
        referralApplication.setStudentId(studentId);
        referralApplication.setAlumniId(job.alumniId());
        referralApplication.setResumeUrl(createReqVO.getResumeUrl());
        referralApplication.setSelfIntroduction(createReqVO.getSelfIntroduction());
        referralApplication.setApplyStatus(ReferralApplicationStatusEnum.PENDING.getStatus());
        referralApplication.setApplyTime(LocalDateTime.now());
        referralApplication.setMatchScore(BigDecimal.valueOf(85));
        return referralDemoStore.saveReferral(referralApplication).getId();
    }

    @Override
    public ReferralApplicationRespVO getReferralApplication(Long id) {
        if (storageProperties.isMysqlMode()) {
            List<ReferralApplicationRespVO> list = jdbcTemplate.query(buildReferralSql() + " WHERE r.id = ?",
                    (rs, rowNum) -> mapReferral(rs), id);
            return list.isEmpty() ? null : list.get(0);
        }
        ReferralApplicationDO referralApplication = referralDemoStore.getReferral(id);
        return referralApplication == null ? null : convert(referralApplication);
    }

    @Override
    public PageResult<ReferralApplicationRespVO> getReferralApplicationPage(ReferralApplicationPageReqVO pageReqVO) {
        ReferralActorContext.Actor actor = ReferralActorContext.getCurrentActor();
        Long scopedStudentId = actor.isStudent() ? actor.requireProfileId("缺少当前学生档案信息") : pageReqVO.getStudentId();
        Long scopedAlumniId = actor.isAlumni() ? actor.requireProfileId("缺少当前校友档案信息") : pageReqVO.getAlumniId();
        if (storageProperties.isMysqlMode()) {
            StringBuilder sql = new StringBuilder(buildReferralSql()).append(" WHERE 1 = 1");
            List<Object> args = new ArrayList<>();
            if (pageReqVO.getJobId() != null) {
                sql.append(" AND r.job_id = ?");
                args.add(pageReqVO.getJobId());
            }
            if (scopedStudentId != null) {
                sql.append(" AND r.student_id = ?");
                args.add(scopedStudentId);
            }
            if (scopedAlumniId != null) {
                sql.append(" AND r.alumni_id = ?");
                args.add(scopedAlumniId);
            }
            if (pageReqVO.getApplyStatus() != null) {
                sql.append(" AND r.apply_status = ?");
                args.add(pageReqVO.getApplyStatus());
            }
            sql.append(" ORDER BY r.id DESC");
            List<ReferralApplicationRespVO> list = jdbcTemplate.query(sql.toString(),
                    (rs, rowNum) -> mapReferral(rs), args.toArray());
            return new PageResult<>(list, (long) list.size());
        }
        List<ReferralApplicationRespVO> filtered = referralDemoStore.listReferrals().stream()
                .filter(item -> pageReqVO.getJobId() == null || item.getJobId().equals(pageReqVO.getJobId()))
                .filter(item -> scopedStudentId == null || item.getStudentId().equals(scopedStudentId))
                .filter(item -> scopedAlumniId == null || item.getAlumniId().equals(scopedAlumniId))
                .filter(item -> pageReqVO.getApplyStatus() == null || item.getApplyStatus().equals(pageReqVO.getApplyStatus()))
                .map(this::convert)
                .toList();
        return new PageResult<>(filtered, (long) filtered.size());
    }

    @Override
    public void processReferralApplication(ReferralApplicationUpdateStatusReqVO updateReqVO) {
        ReferralActorContext.Actor actor = ReferralActorContext.getCurrentActor();
        actor.requireRole("ALUMNI", "只有校友可以处理申请");
        Long alumniId = actor.requireProfileId("缺少当前校友档案信息");
        if (storageProperties.isMysqlMode()) {
            ApplicationOwnership ownership = requireApplication(updateReqVO.getId());
            if (!alumniId.equals(ownership.alumniId())) {
                throw new IllegalArgumentException("只能处理投递到自己岗位上的申请");
            }
            jdbcTemplate.update("""
                    UPDATE ref_referral_application
                    SET apply_status = ?, process_remark = ?, process_time = ?
                    WHERE id = ?
                    """, updateReqVO.getApplyStatus(), updateReqVO.getProcessRemark(), LocalDateTime.now(), updateReqVO.getId());
            return;
        }
        ReferralApplicationDO referralApplication = referralDemoStore.getReferral(updateReqVO.getId());
        if (referralApplication == null) {
            return;
        }
        if (!alumniId.equals(referralApplication.getAlumniId())) {
            throw new IllegalArgumentException("只能处理投递到自己岗位上的申请");
        }
        referralApplication.setApplyStatus(updateReqVO.getApplyStatus());
        referralApplication.setProcessRemark(updateReqVO.getProcessRemark());
        referralApplication.setProcessTime(LocalDateTime.now());
        referralDemoStore.saveReferral(referralApplication);
    }

    @Override
    public void pushReferralApplication(ReferralApplicationUpdateStatusReqVO updateReqVO) {
        ReferralActorContext.Actor actor = ReferralActorContext.getCurrentActor();
        actor.requireRole("ADMIN", "只有管理员可以执行催办操作");
        String pushedRemark = updateReqVO.getProcessRemark();
        if (pushedRemark == null || pushedRemark.isBlank()) {
            pushedRemark = "管理员已督促校友尽快跟进该申请";
        }
        if (storageProperties.isMysqlMode()) {
            ApplicationOwnership ownership = requireApplication(updateReqVO.getId());
            jdbcTemplate.update("""
                    UPDATE ref_referral_application
                    SET process_remark = ?
                    WHERE id = ?
                    """, pushedRemark, ownership.id());
            return;
        }
        ReferralApplicationDO referralApplication = referralDemoStore.getReferral(updateReqVO.getId());
        if (referralApplication == null) {
            throw new IllegalArgumentException("申请记录不存在");
        }
        referralApplication.setProcessRemark(pushedRemark);
        referralDemoStore.saveReferral(referralApplication);
    }

    @Override
    public void deleteReferralApplication(Long id) {
        ReferralActorContext.Actor actor = ReferralActorContext.getCurrentActor();
        actor.requireRole("ADMIN", "只有管理员可以删除申请记录");
        if (storageProperties.isMysqlMode()) {
            jdbcTemplate.update("DELETE FROM ref_referral_application WHERE id = ?", id);
            return;
        }
        referralDemoStore.removeReferral(id);
    }

    @Override
    public void cancelReferralApplication(Long id) {
        ReferralActorContext.Actor actor = ReferralActorContext.getCurrentActor();
        actor.requireRole("STUDENT", "只有学生可以撤回自己的申请");
        Long studentId = actor.requireProfileId("缺少当前学生档案信息");
        if (storageProperties.isMysqlMode()) {
            ApplicationOwnership ownership = requireApplication(id);
            if (!studentId.equals(ownership.studentId())) {
                throw new IllegalArgumentException("只能撤回自己的申请");
            }
            jdbcTemplate.update(
                    "UPDATE ref_referral_application SET apply_status = ?, process_time = ? WHERE id = ?",
                    ReferralApplicationStatusEnum.CANCELLED.getStatus(), LocalDateTime.now(), id);
            return;
        }
        ReferralApplicationDO referral = referralDemoStore.getReferral(id);
        if (referral == null) {
            return;
        }
        if (!studentId.equals(referral.getStudentId())) {
            throw new IllegalArgumentException("只能撤回自己的申请");
        }
        referral.setApplyStatus(ReferralApplicationStatusEnum.CANCELLED.getStatus());
        referral.setProcessTime(LocalDateTime.now());
        referralDemoStore.saveReferral(referral);
    }

    private JobSnapshot requirePublishedJob(Long jobId) {
        if (jobId == null) {
            throw new IllegalArgumentException("请选择要投递的岗位");
        }
        if (storageProperties.isMysqlMode()) {
            List<JobSnapshot> jobs = jdbcTemplate.query("""
                    SELECT id, alumni_id, audit_status, status
                    FROM ref_job_info
                    WHERE id = ?
                    """, (rs, rowNum) -> new JobSnapshot(
                    rs.getLong("id"),
                    rs.getLong("alumni_id"),
                    rs.getInt("audit_status"),
                    rs.getInt("status")), jobId);
            if (jobs.isEmpty()) {
                throw new IllegalArgumentException("岗位不存在");
            }
            JobSnapshot job = jobs.get(0);
            if (!JobAuditStatusEnum.APPROVED.getStatus().equals(job.auditStatus())
                    || !JobStatusEnum.PUBLISHED.getStatus().equals(job.status())) {
                throw new IllegalArgumentException("当前岗位尚未开放投递");
            }
            return job;
        }
        JobInfoDO job = referralDemoStore.getJob(jobId);
        if (job == null) {
            throw new IllegalArgumentException("岗位不存在");
        }
        if (!JobAuditStatusEnum.APPROVED.getStatus().equals(job.getAuditStatus())
                || !JobStatusEnum.PUBLISHED.getStatus().equals(job.getStatus())) {
            throw new IllegalArgumentException("当前岗位尚未开放投递");
        }
        return new JobSnapshot(job.getId(), job.getAlumniId(), job.getAuditStatus(), job.getStatus());
    }

    private void ensureStudentNotApplied(Long jobId, Long studentId) {
        if (storageProperties.isMysqlMode()) {
            Long count = jdbcTemplate.queryForObject("""
                    SELECT COUNT(*) FROM ref_referral_application
                    WHERE job_id = ? AND student_id = ? AND apply_status <> ?
                    """, Long.class, jobId, studentId, ReferralApplicationStatusEnum.CANCELLED.getStatus());
            if (count != null && count > 0) {
                throw new IllegalArgumentException("该岗位已经投递过，无需重复申请");
            }
            return;
        }
        boolean exists = referralDemoStore.listReferrals().stream()
                .anyMatch(item -> jobId.equals(item.getJobId())
                        && studentId.equals(item.getStudentId())
                        && !ReferralApplicationStatusEnum.CANCELLED.getStatus().equals(item.getApplyStatus()));
        if (exists) {
            throw new IllegalArgumentException("该岗位已经投递过，无需重复申请");
        }
    }

    private ApplicationOwnership requireApplication(Long id) {
        List<ApplicationOwnership> list = jdbcTemplate.query("""
                SELECT id, student_id, alumni_id
                FROM ref_referral_application
                WHERE id = ?
                """, (rs, rowNum) -> new ApplicationOwnership(
                rs.getLong("id"),
                rs.getLong("student_id"),
                rs.getLong("alumni_id")), id);
        if (list.isEmpty()) {
            throw new IllegalArgumentException("申请记录不存在");
        }
        return list.get(0);
    }

    private String buildReferralSql() {
        return """
                SELECT r.id, r.job_id, j.job_title, r.student_id, s.real_name AS student_name,
                       r.alumni_id, a.real_name AS alumni_name, r.resume_url, r.self_introduction,
                       r.match_score, r.apply_status, r.process_remark, r.apply_time, r.process_time
                FROM ref_referral_application r
                LEFT JOIN ref_job_info j ON j.id = r.job_id
                LEFT JOIN ref_student_info s ON s.id = r.student_id
                LEFT JOIN ref_alumni_info a ON a.id = r.alumni_id
                """;
    }

    private ReferralApplicationRespVO convert(ReferralApplicationDO source) {
        JobInfoDO jobInfo = referralDemoStore.getJob(source.getJobId());
        StudentInfoDO studentInfo = referralDemoStore.getStudent(source.getStudentId());
        AlumniInfoDO alumniInfo = referralDemoStore.getAlumni(source.getAlumniId());
        ReferralApplicationRespVO target = new ReferralApplicationRespVO();
        target.setId(source.getId());
        target.setJobId(source.getJobId());
        target.setJobTitle(jobInfo == null ? null : jobInfo.getJobTitle());
        target.setStudentId(source.getStudentId());
        target.setStudentName(studentInfo == null ? null : studentInfo.getRealName());
        target.setAlumniId(source.getAlumniId());
        target.setAlumniName(alumniInfo == null ? null : alumniInfo.getRealName());
        target.setResumeUrl(source.getResumeUrl());
        target.setSelfIntroduction(source.getSelfIntroduction());
        target.setMatchScore(source.getMatchScore());
        target.setApplyStatus(source.getApplyStatus());
        target.setProcessRemark(source.getProcessRemark());
        target.setApplyTime(source.getApplyTime());
        target.setProcessTime(source.getProcessTime());
        return target;
    }

    private ReferralApplicationRespVO mapReferral(java.sql.ResultSet rs) throws java.sql.SQLException {
        ReferralApplicationRespVO target = new ReferralApplicationRespVO();
        target.setId(rs.getLong("id"));
        target.setJobId(rs.getLong("job_id"));
        target.setJobTitle(rs.getString("job_title"));
        target.setStudentId(rs.getLong("student_id"));
        target.setStudentName(rs.getString("student_name"));
        target.setAlumniId(rs.getLong("alumni_id"));
        target.setAlumniName(rs.getString("alumni_name"));
        target.setResumeUrl(rs.getString("resume_url"));
        target.setSelfIntroduction(rs.getString("self_introduction"));
        target.setMatchScore(rs.getBigDecimal("match_score"));
        target.setApplyStatus(rs.getInt("apply_status"));
        target.setProcessRemark(rs.getString("process_remark"));
        if (rs.getTimestamp("apply_time") != null) {
            target.setApplyTime(rs.getTimestamp("apply_time").toLocalDateTime());
        }
        if (rs.getTimestamp("process_time") != null) {
            target.setProcessTime(rs.getTimestamp("process_time").toLocalDateTime());
        }
        return target;
    }

    private record JobSnapshot(Long id, Long alumniId, Integer auditStatus, Integer status) {
    }

    private record ApplicationOwnership(Long id, Long studentId, Long alumniId) {
    }
}
