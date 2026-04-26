package cn.iocoder.yudao.module.referral.service.auth;

import cn.iocoder.yudao.module.referral.controller.admin.alumni.vo.AlumniInfoCreateReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.alumni.vo.AlumniInfoUpdateReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.auth.vo.AuthLoginRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.auth.vo.AuthRegisterReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.student.vo.StudentInfoCreateReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.student.vo.StudentInfoUpdateReqVO;
import cn.iocoder.yudao.module.referral.service.alumni.AlumniInfoService;
import cn.iocoder.yudao.module.referral.service.student.StudentInfoService;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AuthServiceImpl implements AuthService {

    @Resource
    private AuthAccountService authAccountService;

    @Resource
    private StudentInfoService studentInfoService;

    @Resource
    private AlumniInfoService alumniInfoService;

    @Override
    public AuthLoginRespVO register(AuthRegisterReqVO reqVO) {
        Long profileId;
        Long accountId = authAccountService.createAccount(reqVO.getUsername(), reqVO.getPassword(), reqVO.getRole(), null, null);
        Long userId = accountId;
        String displayName = reqVO.getRealName();
        List<String> menus;

        if ("STUDENT".equals(reqVO.getRole())) {
            StudentInfoCreateReqVO studentVO = new StudentInfoCreateReqVO();
            studentVO.setUserId(userId);
            studentVO.setRealName(reqVO.getRealName());
            studentVO.setGender(reqVO.getGender());
            studentVO.setStudentNo(reqVO.getStudentNo());
            studentVO.setCollege(reqVO.getCollege());
            studentVO.setMajor(reqVO.getMajor());
            studentVO.setGrade(reqVO.getGrade());
            studentVO.setEducation(reqVO.getEducation());
            profileId = studentInfoService.createStudentInfo(studentVO);

            StudentInfoUpdateReqVO updateStudent = new StudentInfoUpdateReqVO();
            updateStudent.setId(profileId);
            updateStudent.setUserId(userId);
            updateStudent.setRealName(reqVO.getRealName());
            updateStudent.setGender(reqVO.getGender());
            updateStudent.setStudentNo(reqVO.getStudentNo());
            updateStudent.setCollege(reqVO.getCollege());
            updateStudent.setMajor(reqVO.getMajor());
            updateStudent.setGrade(reqVO.getGrade());
            updateStudent.setEducation(reqVO.getEducation());
            studentInfoService.updateStudentInfo(updateStudent);

            menus = List.of("dashboard", "jobs", "favorites", "companies", "applications", "consults", "profile");
        } else if ("ALUMNI".equals(reqVO.getRole())) {
            AlumniInfoCreateReqVO alumniVO = new AlumniInfoCreateReqVO();
            alumniVO.setUserId(userId);
            alumniVO.setRealName(reqVO.getRealName());
            alumniVO.setGender(reqVO.getGender());
            alumniVO.setGraduationYear(reqVO.getGraduationYear() != null ? Integer.parseInt(reqVO.getGraduationYear()) : null);
            alumniVO.setCollege(reqVO.getCollege());
            alumniVO.setMajor(reqVO.getMajor());
            alumniVO.setCompanyName(reqVO.getCompanyName());
            alumniVO.setIndustry(reqVO.getIndustry());
            alumniVO.setPositionName(reqVO.getPositionName());
            alumniVO.setCity(reqVO.getCity());
            alumniVO.setIntro(reqVO.getIntro());
            alumniVO.setReferralPermission(1);
            profileId = alumniInfoService.createAlumniInfo(alumniVO);

            AlumniInfoUpdateReqVO updateAlumni = new AlumniInfoUpdateReqVO();
            updateAlumni.setId(profileId);
            updateAlumni.setUserId(userId);
            updateAlumni.setRealName(reqVO.getRealName());
            updateAlumni.setGender(reqVO.getGender());
            updateAlumni.setGraduationYear(reqVO.getGraduationYear() != null ? Integer.parseInt(reqVO.getGraduationYear()) : null);
            updateAlumni.setCollege(reqVO.getCollege());
            updateAlumni.setMajor(reqVO.getMajor());
            updateAlumni.setCompanyName(reqVO.getCompanyName());
            updateAlumni.setIndustry(reqVO.getIndustry());
            updateAlumni.setPositionName(reqVO.getPositionName());
            updateAlumni.setCity(reqVO.getCity());
            updateAlumni.setIntro(reqVO.getIntro());
            updateAlumni.setReferralPermission(1);
            updateAlumni.setVerifyStatus(1);
            alumniInfoService.updateAlumniInfo(updateAlumni);

            menus = List.of("dashboard", "companies", "jobs", "applications", "consults", "profile");
        } else {
            throw new IllegalArgumentException("不支持的角色类型");
        }

        authAccountService.updateAccountLink(accountId, userId, profileId);

        return new AuthLoginRespVO(
                "token-" + reqVO.getUsername(),
                reqVO.getUsername(),
                displayName,
                reqVO.getRole(),
                userId,
                profileId,
                "/dashboard.html",
                menus
        );
    }

    @Override
    public boolean isUsernameTaken(String username) {
        return authAccountService.getByUsername(username) != null;
    }
}
