package cn.iocoder.yudao.module.referral.controller.app.auth;

import cn.iocoder.yudao.framework.common.pojo.CommonResult;
import cn.iocoder.yudao.module.referral.controller.admin.auth.vo.AuthLoginReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.auth.vo.AuthLoginRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.auth.vo.AuthRegisterReqVO;
import cn.iocoder.yudao.module.referral.service.auth.AuthAccountService;
import cn.iocoder.yudao.module.referral.service.auth.AuthService;
import cn.iocoder.yudao.module.referral.service.student.StudentInfoService;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import static cn.iocoder.yudao.framework.common.pojo.CommonResult.error;
import static cn.iocoder.yudao.framework.common.pojo.CommonResult.success;

@RestController
@RequestMapping("/auth")
public class AppAuthController {

    public static final List<String> STUDENT_MENUS = List.of(
            "dashboard", "jobs", "favorites", "companies", "applications", "consults", "profile");

    public static final List<String> ALUMNI_MENUS = List.of(
            "dashboard", "companies", "jobs", "applications", "consults", "profile");

    public static final List<String> ADMIN_MENUS = List.of(
            "students", "alumni");

    private final AuthAccountService authAccountService;
    private final AuthService authService;
    private final StudentInfoService studentInfoService;

    public AppAuthController(AuthAccountService authAccountService, AuthService authService,
                             StudentInfoService studentInfoService) {
        this.authAccountService = authAccountService;
        this.authService = authService;
        this.studentInfoService = studentInfoService;
    }

    @PostMapping("/login")
    public CommonResult<AuthLoginRespVO> login(@RequestBody AuthLoginReqVO loginReqVO) {
        if (!authAccountService.verifyPassword(loginReqVO.getUsername(), loginReqVO.getPassword())) {
            return error("用户名或密码错误");
        }
        var account = authAccountService.getByUsername(loginReqVO.getUsername());
        List<String> menus;
        String displayName;
        String landingPage;
        switch (account.getRole()) {
            case "STUDENT" -> {
                menus = STUDENT_MENUS;
                displayName = "学生-" + account.getUsername();
                landingPage = "/dashboard.html";
            }
            case "ALUMNI" -> {
                menus = ALUMNI_MENUS;
                displayName = "校友-" + account.getUsername();
                landingPage = "/dashboard.html";
            }
            case "ADMIN" -> {
                menus = ADMIN_MENUS;
                displayName = "管理员-" + account.getUsername();
                landingPage = "/students.html";
            }
            default -> {
                return error("当前账号角色暂不支持前台登录");
            }
        }
        return success(new AuthLoginRespVO(
                "app-token-" + account.getUsername(),
                account.getUsername(),
                displayName,
                account.getRole(),
                account.getUserId(),
                account.getProfileId(),
                landingPage,
                menus
        ));
    }

    @PostMapping("/register")
    public CommonResult<AuthLoginRespVO> register(@RequestBody AuthRegisterReqVO reqVO) {
        if (reqVO.getUsername() == null || reqVO.getUsername().isBlank()) {
            return error("用户名不能为空");
        }
        if (reqVO.getPassword() == null || reqVO.getPassword().isBlank()) {
            return error("密码不能为空");
        }
        if (!reqVO.getPassword().equals(reqVO.getConfirmPassword())) {
            return error("两次密码输入不一致");
        }
        if (!"STUDENT".equals(reqVO.getRole()) && !"ALUMNI".equals(reqVO.getRole())) {
            return error("仅支持学生和校友注册");
        }
        if (authService.isUsernameTaken(reqVO.getUsername())) {
            return error("用户名已被注册");
        }
        if ("STUDENT".equals(reqVO.getRole())) {
            if (reqVO.getStudentNo() == null || reqVO.getStudentNo().isBlank()) {
                return error("学号不能为空");
            }
            String studentNo = reqVO.getStudentNo().trim();
            if (studentInfoService.existsByStudentNo(studentNo)) {
                return error("该学号已注册，请更换学号或直接登录");
            }
            reqVO.setStudentNo(studentNo);
        } else if ("ALUMNI".equals(reqVO.getRole())) {
            if (reqVO.getGraduationYear() == null || reqVO.getGraduationYear().isBlank()) {
                return error("毕业年份不能为空");
            }
            if (reqVO.getCompanyName() == null || reqVO.getCompanyName().isBlank()) {
                return error("所在企业不能为空");
            }
            if (reqVO.getPositionName() == null || reqVO.getPositionName().isBlank()) {
                return error("岗位名称不能为空");
            }
        }
        try {
            AuthLoginRespVO result = authService.register(reqVO);
            return success(result);
        } catch (DuplicateKeyException exception) {
            String message = exception.getMessage();
            if (message != null && message.contains("uk_student_no")) {
                return error("该学号已注册，请更换学号或直接登录");
            }
            if (message != null && message.contains("username")) {
                return error("用户名已被注册");
            }
            return error("注册信息与已有账号冲突，请检查用户名、学号或身份资料");
        } catch (IllegalArgumentException exception) {
            return error(exception.getMessage());
        }
    }
}
