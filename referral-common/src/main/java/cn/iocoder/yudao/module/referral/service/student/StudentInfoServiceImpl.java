package cn.iocoder.yudao.module.referral.service.student;

import cn.iocoder.yudao.framework.common.pojo.PageResult;
import cn.iocoder.yudao.module.referral.config.ReferralStorageProperties;
import cn.iocoder.yudao.module.referral.controller.admin.student.vo.StudentInfoCreateReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.student.vo.StudentInfoPageReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.student.vo.StudentInfoRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.student.vo.StudentInfoUpdateReqVO;
import cn.iocoder.yudao.module.referral.dal.dataobject.student.StudentInfoDO;
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
public class StudentInfoServiceImpl implements StudentInfoService {

    @Resource
    private ReferralDemoStore referralDemoStore;

    @Resource
    private ReferralStorageProperties storageProperties;

    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

    @Override
    public Long createStudentInfo(StudentInfoCreateReqVO createReqVO) {
        if (storageProperties.isMysqlMode()) {
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement("""
                        INSERT INTO ref_student_info
                        (user_id, real_name, gender, student_no, college, major, grade, education,
                         expected_industry, expected_job, expected_city, skill_tags, resume_url, intro)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, Statement.RETURN_GENERATED_KEYS);
                ps.setObject(1, createReqVO.getUserId());
                ps.setString(2, createReqVO.getRealName());
                ps.setObject(3, createReqVO.getGender());
                ps.setString(4, createReqVO.getStudentNo());
                ps.setString(5, createReqVO.getCollege());
                ps.setString(6, createReqVO.getMajor());
                ps.setString(7, createReqVO.getGrade());
                ps.setString(8, createReqVO.getEducation());
                ps.setString(9, createReqVO.getExpectedIndustry());
                ps.setString(10, createReqVO.getExpectedJob());
                ps.setString(11, createReqVO.getExpectedCity());
                ps.setString(12, createReqVO.getSkillTags());
                ps.setString(13, createReqVO.getResumeUrl());
                ps.setString(14, createReqVO.getIntro());
                return ps;
            }, keyHolder);
            return keyHolder.getKey().longValue();
        }
        StudentInfoDO studentInfo = new StudentInfoDO();
        copyFields(createReqVO, studentInfo);
        return referralDemoStore.saveStudent(studentInfo).getId();
    }

    @Override
    public void updateStudentInfo(StudentInfoUpdateReqVO updateReqVO) {
        ReferralActorContext.Actor actor = ReferralActorContext.getCurrentActor();
        Long targetId = actor.isStudent() ? actor.requireProfileId("只能修改自己的学生档案") : updateReqVO.getId();
        if (storageProperties.isMysqlMode()) {
            if (targetId == null) {
                throw new IllegalArgumentException("学生档案不存在");
            }
            Long targetUserId = actor.isStudent() ? actor.requireUserId("缺少当前学生账号信息") : updateReqVO.getUserId();
            jdbcTemplate.update("""
                    UPDATE ref_student_info
                    SET user_id = ?, real_name = ?, gender = ?, student_no = ?, college = ?, major = ?, grade = ?,
                        education = ?, expected_industry = ?, expected_job = ?, expected_city = ?, skill_tags = ?,
                        resume_url = ?, intro = ?
                    WHERE id = ?
                    """,
                    targetUserId, updateReqVO.getRealName(), updateReqVO.getGender(), updateReqVO.getStudentNo(),
                    updateReqVO.getCollege(), updateReqVO.getMajor(), updateReqVO.getGrade(), updateReqVO.getEducation(),
                    updateReqVO.getExpectedIndustry(), updateReqVO.getExpectedJob(), updateReqVO.getExpectedCity(),
                    updateReqVO.getSkillTags(), updateReqVO.getResumeUrl(), updateReqVO.getIntro(), targetId);
            return;
        }
        StudentInfoDO studentInfo = referralDemoStore.getStudent(targetId);
        if (studentInfo == null) {
            return;
        }
        if (actor.isStudent() && !targetId.equals(actor.getProfileId())) {
            throw new IllegalArgumentException("只能修改自己的学生档案");
        }
        copyFields(updateReqVO, studentInfo);
        if (actor.isStudent()) {
            studentInfo.setUserId(actor.getUserId());
        }
        referralDemoStore.saveStudent(studentInfo);
    }

    @Override
    public StudentInfoRespVO getStudentInfo(Long id) {
        ReferralActorContext.Actor actor = ReferralActorContext.getCurrentActor();
        Long targetId = actor.isStudent() ? actor.requireProfileId("只能查看自己的学生档案") : id;
        if (storageProperties.isMysqlMode()) {
            List<StudentInfoRespVO> list = jdbcTemplate.query("""
                    SELECT id, user_id, real_name, gender, student_no, college, major, grade, education,
                           expected_industry, expected_job, expected_city, skill_tags, resume_url, intro, create_time
                    FROM ref_student_info WHERE id = ?
                    """, (rs, rowNum) -> mapStudent(rs), targetId);
            return list.isEmpty() ? null : list.get(0);
        }
        StudentInfoDO studentInfo = referralDemoStore.getStudent(targetId);
        return studentInfo == null ? null : convert(studentInfo);
    }

    @Override
    public PageResult<StudentInfoRespVO> getStudentInfoPage(StudentInfoPageReqVO pageReqVO) {
        ReferralActorContext.Actor actor = ReferralActorContext.getCurrentActor();
        if (actor.isStudent()) {
            StudentInfoRespVO self = getStudentInfo(actor.requireProfileId("只能查看自己的学生档案"));
            List<StudentInfoRespVO> list = self == null ? List.of() : List.of(self);
            return new PageResult<>(list, (long) list.size());
        }
        if (storageProperties.isMysqlMode()) {
            List<StudentInfoRespVO> list = jdbcTemplate.query("""
                    SELECT id, user_id, real_name, gender, student_no, college, major, grade, education,
                           expected_industry, expected_job, expected_city, skill_tags, resume_url, intro, create_time
                    FROM ref_student_info ORDER BY id DESC
                    """, (rs, rowNum) -> mapStudent(rs)).stream()
                    .filter(item -> pageReqVO.getRealName() == null || item.getRealName().contains(pageReqVO.getRealName()))
                    .filter(item -> pageReqVO.getCollege() == null || item.getCollege().contains(pageReqVO.getCollege()))
                    .filter(item -> pageReqVO.getMajor() == null || item.getMajor().contains(pageReqVO.getMajor()))
                    .filter(item -> pageReqVO.getExpectedCity() == null || item.getExpectedCity().contains(pageReqVO.getExpectedCity()))
                    .toList();
            return new PageResult<>(list, (long) list.size());
        }
        List<StudentInfoRespVO> filtered = referralDemoStore.listStudents().stream()
                .filter(item -> pageReqVO.getRealName() == null || item.getRealName().contains(pageReqVO.getRealName()))
                .filter(item -> pageReqVO.getCollege() == null || item.getCollege().contains(pageReqVO.getCollege()))
                .filter(item -> pageReqVO.getMajor() == null || item.getMajor().contains(pageReqVO.getMajor()))
                .filter(item -> pageReqVO.getExpectedCity() == null || item.getExpectedCity().contains(pageReqVO.getExpectedCity()))
                .map(this::convert)
                .toList();
        return new PageResult<>(filtered, (long) filtered.size());
    }

    private void copyFields(StudentInfoCreateReqVO source, StudentInfoDO target) {
        target.setUserId(source.getUserId());
        target.setRealName(source.getRealName());
        target.setGender(source.getGender());
        target.setStudentNo(source.getStudentNo());
        target.setCollege(source.getCollege());
        target.setMajor(source.getMajor());
        target.setGrade(source.getGrade());
        target.setEducation(source.getEducation());
        target.setExpectedIndustry(source.getExpectedIndustry());
        target.setExpectedJob(source.getExpectedJob());
        target.setExpectedCity(source.getExpectedCity());
        target.setSkillTags(source.getSkillTags());
        target.setResumeUrl(source.getResumeUrl());
        target.setIntro(source.getIntro());
    }

    private StudentInfoRespVO convert(StudentInfoDO source) {
        StudentInfoRespVO target = new StudentInfoRespVO();
        target.setId(source.getId());
        target.setUserId(source.getUserId());
        target.setRealName(source.getRealName());
        target.setGender(source.getGender());
        target.setStudentNo(source.getStudentNo());
        target.setCollege(source.getCollege());
        target.setMajor(source.getMajor());
        target.setGrade(source.getGrade());
        target.setEducation(source.getEducation());
        target.setExpectedIndustry(source.getExpectedIndustry());
        target.setExpectedJob(source.getExpectedJob());
        target.setExpectedCity(source.getExpectedCity());
        target.setSkillTags(source.getSkillTags());
        target.setResumeUrl(source.getResumeUrl());
        target.setIntro(source.getIntro());
        target.setCreateTime(source.getCreateTime());
        return target;
    }

    private StudentInfoRespVO mapStudent(java.sql.ResultSet rs) throws java.sql.SQLException {
        StudentInfoRespVO target = new StudentInfoRespVO();
        target.setId(rs.getLong("id"));
        target.setUserId(rs.getLong("user_id"));
        target.setRealName(rs.getString("real_name"));
        target.setGender((Integer) rs.getObject("gender"));
        target.setStudentNo(rs.getString("student_no"));
        target.setCollege(rs.getString("college"));
        target.setMajor(rs.getString("major"));
        target.setGrade(rs.getString("grade"));
        target.setEducation(rs.getString("education"));
        target.setExpectedIndustry(rs.getString("expected_industry"));
        target.setExpectedJob(rs.getString("expected_job"));
        target.setExpectedCity(rs.getString("expected_city"));
        target.setSkillTags(rs.getString("skill_tags"));
        target.setResumeUrl(rs.getString("resume_url"));
        target.setIntro(rs.getString("intro"));
        if (rs.getTimestamp("create_time") != null) {
            target.setCreateTime(rs.getTimestamp("create_time").toLocalDateTime());
        }
        return target;
    }
}
