package cn.iocoder.yudao.module.referral.controller.app.auth;

import cn.iocoder.yudao.framework.common.pojo.CommonResult;
import cn.iocoder.yudao.module.referral.controller.admin.auth.vo.AuthLoginReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.auth.vo.AuthLoginRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.auth.vo.AuthRegisterReqVO;
import cn.iocoder.yudao.module.referral.service.auth.AuthAccountService;
import cn.iocoder.yudao.module.referral.service.auth.AuthService;
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

    private final AuthAccountService authAccountService;
    private final AuthService authService;

    public AppAuthController(AuthAccountService authAccountService, AuthService authService) {
        this.authAccountService = authAccountService;
        this.authService = authService;
    }

    @PostMapping("/login")
    public CommonResult<AuthLoginRespVO> login(@RequestBody AuthLoginReqVO loginReqVO) {
        if (!authAccountService.verifyPassword(loginReqVO.getUsername(), loginReqVO.getPassword())) {
            return error("用户名或密码错误");
        }
        var account = authAccountService.getByUsername(loginReqVO.getUsername());
        if (!"STUDENT".equals(account.getRole()) && !"ALUMNI".equals(account.getRole())) {
            return error("前台仅允许学生和校友登录");
        }
        List<String> menus = "STUDENT".equals(account.getRole()) ? STUDENT_MENUS : ALUMNI_MENUS;
        String displayName = "STUDENT".equals(account.getRole())
                ? "学生-" + account.getUsername()
                : "校友-" + account.getUsername();
        return success(new AuthLoginRespVO(
                "app-token-" + account.getUsername(),
                account.getUsername(),
                displayName,
                account.getRole(),
                account.getUserId(),
                account.getProfileId(),
                "/dashboard.html",
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
        if (!"STUDENT".equals(reqVO.getRole())) {
            return error("前台自助注册仅开放给学生");
        }
        if (authService.isUsernameTaken(reqVO.getUsername())) {
            return error("用户名已被注册");
        }
        AuthLoginRespVO result = authService.register(reqVO);
        return success(result);
    }
}
