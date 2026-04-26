package cn.iocoder.yudao.module.referral.service.alumni;

import cn.iocoder.yudao.framework.common.pojo.PageResult;
import cn.iocoder.yudao.module.referral.config.ReferralStorageProperties;
import cn.iocoder.yudao.module.referral.controller.admin.alumni.vo.AlumniInfoCreateReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.alumni.vo.AlumniInfoPageReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.alumni.vo.AlumniInfoRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.alumni.vo.AlumniInfoUpdateReqVO;
import cn.iocoder.yudao.module.referral.dal.dataobject.alumni.AlumniInfoDO;
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
import java.util.List;

@Service
public class AlumniInfoServiceImpl implements AlumniInfoService {

    @Resource
    private ReferralDemoStore referralDemoStore;

    @Resource
    private ReferralStorageProperties storageProperties;

    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

    @Override
    public Long createAlumniInfo(AlumniInfoCreateReqVO createReqVO) {
        if (storageProperties.isMysqlMode()) {
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement("""
                        INSERT INTO ref_alumni_info
                        (user_id, real_name, gender, graduation_year, college, major, company_id, company_name,
                         industry, position_name, city, referral_permission, intro, verify_status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, Statement.RETURN_GENERATED_KEYS);
                ps.setObject(1, createReqVO.getUserId());
                ps.setString(2, createReqVO.getRealName());
                ps.setObject(3, createReqVO.getGender());
                ps.setObject(4, createReqVO.getGraduationYear());
                ps.setString(5, createReqVO.getCollege());
                ps.setString(6, createReqVO.getMajor());
                ps.setObject(7, createReqVO.getCompanyId());
                ps.setString(8, createReqVO.getCompanyName());
                ps.setString(9, createReqVO.getIndustry());
                ps.setString(10, createReqVO.getPositionName());
                ps.setString(11, createReqVO.getCity());
                ps.setObject(12, createReqVO.getReferralPermission());
                ps.setString(13, createReqVO.getIntro());
                ps.setInt(14, 1);
                return ps;
            }, keyHolder);
            return keyHolder.getKey().longValue();
        }
        AlumniInfoDO alumniInfo = new AlumniInfoDO();
        copyCreateFields(createReqVO, alumniInfo);
        alumniInfo.setVerifyStatus(1);
        return referralDemoStore.saveAlumni(alumniInfo).getId();
    }

    @Override
    public void updateAlumniInfo(AlumniInfoUpdateReqVO updateReqVO) {
        ReferralActorContext.Actor actor = ReferralActorContext.getCurrentActor();
        Long targetId = actor.isAlumni() ? actor.requireProfileId("只能修改自己的校友档案") : updateReqVO.getId();
        if (storageProperties.isMysqlMode()) {
            if (targetId == null) {
                throw new IllegalArgumentException("校友档案不存在");
            }
            jdbcTemplate.update("""
                    UPDATE ref_alumni_info
                    SET user_id = ?, real_name = ?, gender = ?, graduation_year = ?, college = ?, major = ?,
                        company_id = ?, company_name = ?, industry = ?, position_name = ?, city = ?,
                        referral_permission = ?, intro = ?, verify_status = ?
                    WHERE id = ?
                    """,
                    actor.isAlumni() ? actor.requireUserId("缺少当前校友账号信息") : updateReqVO.getUserId(),
                    updateReqVO.getRealName(), updateReqVO.getGender(), updateReqVO.getGraduationYear(),
                    updateReqVO.getCollege(), updateReqVO.getMajor(), updateReqVO.getCompanyId(), updateReqVO.getCompanyName(),
                    updateReqVO.getIndustry(), updateReqVO.getPositionName(), updateReqVO.getCity(),
                    updateReqVO.getReferralPermission(), updateReqVO.getIntro(),
                    actor.isAdmin() ? (updateReqVO.getVerifyStatus() == null ? 1 : updateReqVO.getVerifyStatus()) : 1,
                    targetId);
            return;
        }
        AlumniInfoDO alumniInfo = referralDemoStore.getAlumni(targetId);
        if (alumniInfo == null) {
            return;
        }
        if (actor.isAlumni() && !targetId.equals(actor.getProfileId())) {
            throw new IllegalArgumentException("只能修改自己的校友档案");
        }
        copyCreateFields(updateReqVO, alumniInfo);
        if (actor.isAdmin() && updateReqVO.getVerifyStatus() != null) {
            alumniInfo.setVerifyStatus(updateReqVO.getVerifyStatus());
        }
        if (actor.isAlumni()) {
            alumniInfo.setUserId(actor.getUserId());
            alumniInfo.setVerifyStatus(1);
        }
        referralDemoStore.saveAlumni(alumniInfo);
    }

    @Override
    public AlumniInfoRespVO getAlumniInfo(Long id) {
        ReferralActorContext.Actor actor = ReferralActorContext.getCurrentActor();
        Long targetId = actor.isAlumni() ? actor.requireProfileId("只能查看自己的校友档案") : id;
        if (storageProperties.isMysqlMode()) {
            List<AlumniInfoRespVO> list = jdbcTemplate.query("""
                    SELECT id, user_id, real_name, gender, graduation_year, college, major, company_id, company_name,
                           industry, position_name, city, referral_permission, intro, verify_status, create_time
                    FROM ref_alumni_info WHERE id = ?
                    """, (rs, rowNum) -> mapAlumni(rs), targetId);
            return list.isEmpty() ? null : list.get(0);
        }
        AlumniInfoDO alumniInfo = referralDemoStore.getAlumni(targetId);
        return alumniInfo == null ? null : convert(alumniInfo);
    }

    @Override
    public PageResult<AlumniInfoRespVO> getAlumniInfoPage(AlumniInfoPageReqVO pageReqVO) {
        ReferralActorContext.Actor actor = ReferralActorContext.getCurrentActor();
        if (actor.isAlumni()) {
            AlumniInfoRespVO self = getAlumniInfo(actor.requireProfileId("只能查看自己的校友档案"));
            List<AlumniInfoRespVO> list = self == null ? List.of() : List.of(self);
            return new PageResult<>(list, (long) list.size());
        }
        if (storageProperties.isMysqlMode()) {
            List<AlumniInfoRespVO> list = jdbcTemplate.query("""
                    SELECT id, user_id, real_name, gender, graduation_year, college, major, company_id, company_name,
                           industry, position_name, city, referral_permission, intro, verify_status, create_time
                    FROM ref_alumni_info ORDER BY id DESC
                    """, (rs, rowNum) -> mapAlumni(rs)).stream()
                    .filter(item -> pageReqVO.getRealName() == null || item.getRealName().contains(pageReqVO.getRealName()))
                    .filter(item -> pageReqVO.getCompanyName() == null || item.getCompanyName().contains(pageReqVO.getCompanyName()))
                    .filter(item -> pageReqVO.getIndustry() == null || item.getIndustry().contains(pageReqVO.getIndustry()))
                    .filter(item -> pageReqVO.getCity() == null || item.getCity().contains(pageReqVO.getCity()))
                    .toList();
            return new PageResult<>(list, (long) list.size());
        }
        List<AlumniInfoRespVO> filtered = referralDemoStore.listAlumni().stream()
                .filter(item -> pageReqVO.getRealName() == null || item.getRealName().contains(pageReqVO.getRealName()))
                .filter(item -> pageReqVO.getCompanyName() == null || item.getCompanyName().contains(pageReqVO.getCompanyName()))
                .filter(item -> pageReqVO.getIndustry() == null || item.getIndustry().contains(pageReqVO.getIndustry()))
                .filter(item -> pageReqVO.getCity() == null || item.getCity().contains(pageReqVO.getCity()))
                .map(this::convert)
                .toList();
        return new PageResult<>(filtered, (long) filtered.size());
    }

    private void copyCreateFields(AlumniInfoCreateReqVO source, AlumniInfoDO target) {
        target.setUserId(source.getUserId());
        target.setRealName(source.getRealName());
        target.setGender(source.getGender());
        target.setGraduationYear(source.getGraduationYear());
        target.setCollege(source.getCollege());
        target.setMajor(source.getMajor());
        target.setCompanyId(source.getCompanyId());
        target.setCompanyName(source.getCompanyName());
        target.setIndustry(source.getIndustry());
        target.setPositionName(source.getPositionName());
        target.setCity(source.getCity());
        target.setReferralPermission(source.getReferralPermission());
        target.setIntro(source.getIntro());
    }

    private AlumniInfoRespVO convert(AlumniInfoDO source) {
        AlumniInfoRespVO target = new AlumniInfoRespVO();
        target.setId(source.getId());
        target.setUserId(source.getUserId());
        target.setRealName(source.getRealName());
        target.setGender(source.getGender());
        target.setGraduationYear(source.getGraduationYear());
        target.setCollege(source.getCollege());
        target.setMajor(source.getMajor());
        target.setCompanyId(source.getCompanyId());
        target.setCompanyName(source.getCompanyName());
        target.setIndustry(source.getIndustry());
        target.setPositionName(source.getPositionName());
        target.setCity(source.getCity());
        target.setReferralPermission(source.getReferralPermission());
        target.setIntro(source.getIntro());
        target.setVerifyStatus(source.getVerifyStatus());
        target.setCreateTime(source.getCreateTime());
        return target;
    }

    private AlumniInfoRespVO mapAlumni(java.sql.ResultSet rs) throws java.sql.SQLException {
        AlumniInfoRespVO target = new AlumniInfoRespVO();
        target.setId(rs.getLong("id"));
        target.setUserId(rs.getLong("user_id"));
        target.setRealName(rs.getString("real_name"));
        target.setGender((Integer) rs.getObject("gender"));
        target.setGraduationYear((Integer) rs.getObject("graduation_year"));
        target.setCollege(rs.getString("college"));
        target.setMajor(rs.getString("major"));
        target.setCompanyId((Long) rs.getObject("company_id"));
        target.setCompanyName(rs.getString("company_name"));
        target.setIndustry(rs.getString("industry"));
        target.setPositionName(rs.getString("position_name"));
        target.setCity(rs.getString("city"));
        target.setReferralPermission((Integer) rs.getObject("referral_permission"));
        target.setIntro(rs.getString("intro"));
        target.setVerifyStatus((Integer) rs.getObject("verify_status"));
        if (rs.getTimestamp("create_time") != null) {
            target.setCreateTime(rs.getTimestamp("create_time").toLocalDateTime());
        }
        return target;
    }
}
