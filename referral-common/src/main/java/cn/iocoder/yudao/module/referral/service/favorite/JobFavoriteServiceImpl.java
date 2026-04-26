package cn.iocoder.yudao.module.referral.service.favorite;

import cn.iocoder.yudao.framework.common.pojo.PageResult;
import cn.iocoder.yudao.module.referral.config.ReferralStorageProperties;
import cn.iocoder.yudao.module.referral.controller.admin.favorite.vo.JobFavoritePageReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.favorite.vo.JobFavoriteRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.favorite.vo.JobFavoriteToggleReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.favorite.vo.JobFavoriteToggleRespVO;
import cn.iocoder.yudao.module.referral.dal.dataobject.favorite.JobFavoriteDO;
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
import java.util.ArrayList;
import java.util.List;

@Service
public class JobFavoriteServiceImpl implements JobFavoriteService {

    @Resource
    private ReferralDemoStore referralDemoStore;

    @Resource
    private ReferralStorageProperties storageProperties;

    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

    @Override
    public JobFavoriteToggleRespVO toggleFavorite(JobFavoriteToggleReqVO reqVO) {
        ReferralActorContext.Actor actor = ReferralActorContext.getCurrentActor();
        actor.requireRole("STUDENT", "只有学生可以收藏岗位");
        Long studentId = actor.requireProfileId("缺少当前学生档案信息");
        if (storageProperties.isMysqlMode()) {
            Long existingId = findFavoriteId(studentId, reqVO.getJobId());
            if (existingId != null) {
                jdbcTemplate.update("DELETE FROM ref_job_favorite WHERE id = ?", existingId);
                return new JobFavoriteToggleRespVO(false, existingId);
            }
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement("""
                        INSERT INTO ref_job_favorite (student_id, job_id)
                        VALUES (?, ?)
                        """, Statement.RETURN_GENERATED_KEYS);
                ps.setLong(1, studentId);
                ps.setLong(2, reqVO.getJobId());
                return ps;
            }, keyHolder);
            return new JobFavoriteToggleRespVO(true, keyHolder.getKey().longValue());
        }

        JobFavoriteDO existing = referralDemoStore.getFavoriteByStudentAndJob(studentId, reqVO.getJobId());
        if (existing != null) {
            referralDemoStore.removeFavorite(existing.getId());
            return new JobFavoriteToggleRespVO(false, existing.getId());
        }
        JobFavoriteDO favoriteDO = new JobFavoriteDO();
        favoriteDO.setStudentId(studentId);
        favoriteDO.setJobId(reqVO.getJobId());
        JobFavoriteDO saved = referralDemoStore.saveFavorite(favoriteDO);
        return new JobFavoriteToggleRespVO(true, saved.getId());
    }

    @Override
    public PageResult<JobFavoriteRespVO> getFavoritePage(JobFavoritePageReqVO pageReqVO) {
        ReferralActorContext.Actor actor = ReferralActorContext.getCurrentActor();
        Long studentId = actor.isStudent() ? actor.requireProfileId("缺少当前学生档案信息") : pageReqVO.getStudentId();
        if (storageProperties.isMysqlMode()) {
            StringBuilder sql = new StringBuilder("""
                    SELECT id, student_id, job_id, create_time
                    FROM ref_job_favorite WHERE 1 = 1
                    """);
            List<Object> args = new ArrayList<>();
            if (studentId != null) {
                sql.append(" AND student_id = ?");
                args.add(studentId);
            }
            if (pageReqVO.getJobId() != null) {
                sql.append(" AND job_id = ?");
                args.add(pageReqVO.getJobId());
            }
            sql.append(" ORDER BY id DESC");
            List<JobFavoriteRespVO> list = jdbcTemplate.query(sql.toString(), (rs, rowNum) -> {
                JobFavoriteRespVO item = new JobFavoriteRespVO();
                item.setId(rs.getLong("id"));
                item.setStudentId(rs.getLong("student_id"));
                item.setJobId(rs.getLong("job_id"));
                if (rs.getTimestamp("create_time") != null) {
                    item.setCreateTime(rs.getTimestamp("create_time").toLocalDateTime());
                }
                return item;
            }, args.toArray());
            return new PageResult<>(list, (long) list.size());
        }

        List<JobFavoriteRespVO> list = referralDemoStore.listFavorites().stream()
                .filter(item -> studentId == null || item.getStudentId().equals(studentId))
                .filter(item -> pageReqVO.getJobId() == null || item.getJobId().equals(pageReqVO.getJobId()))
                .map(item -> {
                    JobFavoriteRespVO vo = new JobFavoriteRespVO();
                    vo.setId(item.getId());
                    vo.setStudentId(item.getStudentId());
                    vo.setJobId(item.getJobId());
                    vo.setCreateTime(item.getCreateTime());
                    return vo;
                })
                .toList();
        return new PageResult<>(list, (long) list.size());
    }

    private Long findFavoriteId(Long studentId, Long jobId) {
        List<Long> ids = jdbcTemplate.query("""
                SELECT id FROM ref_job_favorite
                WHERE student_id = ? AND job_id = ?
                LIMIT 1
                """, (rs, rowNum) -> rs.getLong("id"), studentId, jobId);
        return ids.isEmpty() ? null : ids.get(0);
    }
}
