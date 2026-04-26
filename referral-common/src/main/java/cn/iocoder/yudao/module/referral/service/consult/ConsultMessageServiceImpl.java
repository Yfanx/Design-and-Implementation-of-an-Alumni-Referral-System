package cn.iocoder.yudao.module.referral.service.consult;

import cn.iocoder.yudao.framework.common.pojo.PageResult;
import cn.iocoder.yudao.module.referral.config.ReferralStorageProperties;
import cn.iocoder.yudao.module.referral.controller.admin.consult.vo.ConsultMessagePageReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.consult.vo.ConsultMessageRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.consult.vo.ConsultMessageSendReqVO;
import cn.iocoder.yudao.module.referral.dal.dataobject.consult.ConsultMessageDO;
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
import java.util.ArrayList;
import java.util.List;

@Service
public class ConsultMessageServiceImpl implements ConsultMessageService {

    private static final int ROLE_ALUMNI = 1;
    private static final int ROLE_STUDENT = 2;

    @Resource
    private ReferralDemoStore referralDemoStore;

    @Resource
    private ReferralStorageProperties storageProperties;

    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

    @Override
    public Long sendConsultMessage(ConsultMessageSendReqVO sendReqVO) {
        ReferralActorContext.Actor actor = ReferralActorContext.getCurrentActor();
        actor.requireLoggedIn();
        MessagePayload payload = actor.isStudent()
                ? buildStudentPayload(actor, sendReqVO)
                : buildAlumniPayload(actor, sendReqVO);
        if (storageProperties.isMysqlMode()) {
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement("""
                        INSERT INTO ref_consult_message
                        (job_id, sender_user_id, receiver_user_id, sender_role, receiver_role, content, read_status, send_time)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """, Statement.RETURN_GENERATED_KEYS);
                ps.setObject(1, payload.jobId());
                ps.setObject(2, payload.senderUserId());
                ps.setObject(3, payload.receiverUserId());
                ps.setObject(4, payload.senderRole());
                ps.setObject(5, payload.receiverRole());
                ps.setString(6, payload.content());
                ps.setInt(7, 0);
                ps.setObject(8, LocalDateTime.now());
                return ps;
            }, keyHolder);
            return keyHolder.getKey().longValue();
        }
        ConsultMessageDO consultMessage = new ConsultMessageDO();
        consultMessage.setJobId(payload.jobId());
        consultMessage.setSenderUserId(payload.senderUserId());
        consultMessage.setReceiverUserId(payload.receiverUserId());
        consultMessage.setSenderRole(payload.senderRole());
        consultMessage.setReceiverRole(payload.receiverRole());
        consultMessage.setContent(payload.content());
        consultMessage.setReadStatus(0);
        consultMessage.setSendTime(LocalDateTime.now());
        return referralDemoStore.saveConsult(consultMessage).getId();
    }

    @Override
    public PageResult<ConsultMessageRespVO> getConsultMessagePage(ConsultMessagePageReqVO pageReqVO) {
        ReferralActorContext.Actor actor = ReferralActorContext.getCurrentActor();
        Long scopedUserId = actor.isAdmin() ? null : actor.requireUserId("缺少当前登录用户信息");
        if (storageProperties.isMysqlMode()) {
            StringBuilder sql = new StringBuilder("""
                    SELECT id, job_id, sender_user_id, receiver_user_id, sender_role, receiver_role, content, read_status, send_time
                    FROM ref_consult_message WHERE 1 = 1
                    """);
            List<Object> args = new ArrayList<>();
            if (pageReqVO.getJobId() != null) {
                sql.append(" AND job_id = ?");
                args.add(pageReqVO.getJobId());
            }
            if (scopedUserId != null) {
                sql.append(" AND (sender_user_id = ? OR receiver_user_id = ?)");
                args.add(scopedUserId);
                args.add(scopedUserId);
            } else {
                if (pageReqVO.getSenderUserId() != null) {
                    sql.append(" AND sender_user_id = ?");
                    args.add(pageReqVO.getSenderUserId());
                }
                if (pageReqVO.getReceiverUserId() != null) {
                    sql.append(" AND receiver_user_id = ?");
                    args.add(pageReqVO.getReceiverUserId());
                }
            }
            sql.append(" ORDER BY id DESC");
            List<ConsultMessageRespVO> list = jdbcTemplate.query(sql.toString(), (rs, rowNum) -> mapConsult(rs), args.toArray());
            return new PageResult<>(list, (long) list.size());
        }
        List<ConsultMessageRespVO> filtered = referralDemoStore.listConsults().stream()
                .filter(item -> pageReqVO.getJobId() == null || pageReqVO.getJobId().equals(item.getJobId()))
                .filter(item -> scopedUserId == null || scopedUserId.equals(item.getSenderUserId()) || scopedUserId.equals(item.getReceiverUserId()))
                .filter(item -> scopedUserId != null || pageReqVO.getSenderUserId() == null || pageReqVO.getSenderUserId().equals(item.getSenderUserId()))
                .filter(item -> scopedUserId != null || pageReqVO.getReceiverUserId() == null || pageReqVO.getReceiverUserId().equals(item.getReceiverUserId()))
                .map(this::convert)
                .toList();
        return new PageResult<>(filtered, (long) filtered.size());
    }

    @Override
    public void deleteConsultMessage(Long id) {
        ReferralActorContext.Actor actor = ReferralActorContext.getCurrentActor();
        actor.requireLoggedIn();
        if (storageProperties.isMysqlMode()) {
            MessageOwnership ownership = requireMessageOwnership(id);
            if (!actor.isAdmin() && !ownership.hasUser(actor.requireUserId("缺少当前登录用户信息"))) {
                throw new IllegalArgumentException("只能删除与自己相关的消息");
            }
            jdbcTemplate.update("DELETE FROM ref_consult_message WHERE id = ?", id);
            return;
        }
        ConsultMessageDO consult = referralDemoStore.getConsult(id);
        if (consult == null) {
            return;
        }
        if (!actor.isAdmin() && !actor.requireUserId("缺少当前登录用户信息").equals(consult.getSenderUserId())
                && !actor.getUserId().equals(consult.getReceiverUserId())) {
            throw new IllegalArgumentException("只能删除与自己相关的消息");
        }
        referralDemoStore.removeConsult(id);
    }

    @Override
    public void markAsRead(Long id) {
        ReferralActorContext.Actor actor = ReferralActorContext.getCurrentActor();
        actor.requireLoggedIn();
        if (storageProperties.isMysqlMode()) {
            MessageOwnership ownership = requireMessageOwnership(id);
            if (!actor.isAdmin() && !actor.requireUserId("缺少当前登录用户信息").equals(ownership.receiverUserId())) {
                throw new IllegalArgumentException("只能标记自己收到的消息");
            }
            jdbcTemplate.update("UPDATE ref_consult_message SET read_status = 1 WHERE id = ?", id);
            return;
        }
        ConsultMessageDO consult = referralDemoStore.getConsult(id);
        if (consult == null) {
            return;
        }
        if (!actor.isAdmin() && !actor.requireUserId("缺少当前登录用户信息").equals(consult.getReceiverUserId())) {
            throw new IllegalArgumentException("只能标记自己收到的消息");
        }
        consult.setReadStatus(1);
        referralDemoStore.saveConsult(consult);
    }

    private MessagePayload buildStudentPayload(ReferralActorContext.Actor actor, ConsultMessageSendReqVO sendReqVO) {
        actor.requireRole("STUDENT", "只有学生或校友可以发送消息");
        Long studentUserId = actor.requireUserId("缺少当前登录用户信息");
        Long studentProfileId = actor.requireProfileId("缺少当前学生档案信息");
        JobUserPair job = requireJobOwner(sendReqVO.getJobId());
        boolean applied = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM ref_referral_application
                WHERE job_id = ? AND student_id = ? AND apply_status <> ?
                """, Long.class, job.jobId(), studentProfileId, 5) > 0;
        if (!applied) {
            throw new IllegalArgumentException("请先投递该岗位，再发起咨询");
        }
        return new MessagePayload(job.jobId(), studentUserId, job.alumniUserId(), ROLE_STUDENT, ROLE_ALUMNI, sendReqVO.getContent());
    }

    private MessagePayload buildAlumniPayload(ReferralActorContext.Actor actor, ConsultMessageSendReqVO sendReqVO) {
        actor.requireRole("ALUMNI", "只有学生或校友可以发送消息");
        Long alumniUserId = actor.requireUserId("缺少当前登录用户信息");
        Long alumniProfileId = actor.requireProfileId("缺少当前校友档案信息");
        JobUserPair job = requireJobOwner(sendReqVO.getJobId());
        if (!alumniProfileId.equals(job.alumniProfileId())) {
            throw new IllegalArgumentException("只能回复自己岗位上的咨询");
        }
        Long receiverUserId = sendReqVO.getReceiverUserId();
        if (receiverUserId == null) {
            throw new IllegalArgumentException("请选择要回复的学生");
        }
        Long studentProfileId = findStudentProfileIdByUserId(receiverUserId);
        Long count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM ref_referral_application
                WHERE job_id = ? AND student_id = ?
                """, Long.class, job.jobId(), studentProfileId);
        if (count == null || count == 0) {
            throw new IllegalArgumentException("只能回复已投递该岗位的学生");
        }
        return new MessagePayload(job.jobId(), alumniUserId, receiverUserId, ROLE_ALUMNI, ROLE_STUDENT, sendReqVO.getContent());
    }

    private JobUserPair requireJobOwner(Long jobId) {
        if (!storageProperties.isMysqlMode()) {
            throw new IllegalStateException("当前仅支持 MySQL 模式下的消息闭环校验");
        }
        List<JobUserPair> list = jdbcTemplate.query("""
                SELECT j.id, j.alumni_id, a.user_id
                FROM ref_job_info j
                LEFT JOIN ref_alumni_info a ON a.id = j.alumni_id
                WHERE j.id = ?
                """, (rs, rowNum) -> new JobUserPair(
                rs.getLong("id"),
                rs.getLong("alumni_id"),
                rs.getLong("user_id")), jobId);
        if (list.isEmpty()) {
            throw new IllegalArgumentException("岗位不存在");
        }
        JobUserPair job = list.get(0);
        if (job.alumniUserId() == null) {
            throw new IllegalArgumentException("当前岗位未绑定可用校友账号");
        }
        return job;
    }

    private Long findStudentProfileIdByUserId(Long userId) {
        List<Long> list = jdbcTemplate.query("""
                SELECT id FROM ref_student_info WHERE user_id = ? LIMIT 1
                """, (rs, rowNum) -> rs.getLong("id"), userId);
        if (list.isEmpty()) {
            throw new IllegalArgumentException("未找到对应学生档案");
        }
        return list.get(0);
    }

    private MessageOwnership requireMessageOwnership(Long id) {
        List<MessageOwnership> list = jdbcTemplate.query("""
                SELECT id, sender_user_id, receiver_user_id
                FROM ref_consult_message WHERE id = ?
                """, (rs, rowNum) -> new MessageOwnership(
                rs.getLong("id"),
                rs.getLong("sender_user_id"),
                rs.getLong("receiver_user_id")), id);
        if (list.isEmpty()) {
            throw new IllegalArgumentException("消息不存在");
        }
        return list.get(0);
    }

    private ConsultMessageRespVO convert(ConsultMessageDO source) {
        ConsultMessageRespVO target = new ConsultMessageRespVO();
        target.setId(source.getId());
        target.setJobId(source.getJobId());
        target.setSenderUserId(source.getSenderUserId());
        target.setReceiverUserId(source.getReceiverUserId());
        target.setSenderRole(source.getSenderRole());
        target.setReceiverRole(source.getReceiverRole());
        target.setContent(source.getContent());
        target.setReadStatus(source.getReadStatus());
        target.setSendTime(source.getSendTime());
        return target;
    }

    private ConsultMessageRespVO mapConsult(java.sql.ResultSet rs) throws java.sql.SQLException {
        ConsultMessageRespVO target = new ConsultMessageRespVO();
        target.setId(rs.getLong("id"));
        target.setJobId((Long) rs.getObject("job_id"));
        target.setSenderUserId((Long) rs.getObject("sender_user_id"));
        target.setReceiverUserId((Long) rs.getObject("receiver_user_id"));
        target.setSenderRole((Integer) rs.getObject("sender_role"));
        target.setReceiverRole((Integer) rs.getObject("receiver_role"));
        target.setContent(rs.getString("content"));
        target.setReadStatus((Integer) rs.getObject("read_status"));
        if (rs.getTimestamp("send_time") != null) {
            target.setSendTime(rs.getTimestamp("send_time").toLocalDateTime());
        }
        return target;
    }

    private record MessagePayload(Long jobId, Long senderUserId, Long receiverUserId, Integer senderRole, Integer receiverRole, String content) {
    }

    private record JobUserPair(Long jobId, Long alumniProfileId, Long alumniUserId) {
    }

    private record MessageOwnership(Long id, Long senderUserId, Long receiverUserId) {
        boolean hasUser(Long userId) {
            return senderUserId.equals(userId) || receiverUserId.equals(userId);
        }
    }
}
