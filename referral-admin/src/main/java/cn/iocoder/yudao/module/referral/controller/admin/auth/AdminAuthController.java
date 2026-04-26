package cn.iocoder.yudao.module.referral.controller.admin.auth;

import cn.iocoder.yudao.framework.common.pojo.CommonResult;
import cn.iocoder.yudao.module.referral.controller.admin.auth.vo.AuthLoginReqVO;
import cn.iocoder.yudao.module.referral.controller.admin.auth.vo.AuthLoginRespVO;
import cn.iocoder.yudao.module.referral.service.auth.AuthAccountService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import static cn.iocoder.yudao.framework.common.pojo.CommonResult.error;
import static cn.iocoder.yudao.framework.common.pojo.CommonResult.success;

@RestController
@RequestMapping("/auth")
public class AdminAuthController {

    public static final List<String> ADMIN_MENUS = List.of(
            "dashboard", "alumni", "students", "companies", "auditCenter", "jobs", "applications", "consults", "profile");

    private final AuthAccountService authAccountService;

    public AdminAuthController(AuthAccountService authAccountService) {
        this.authAccountService = authAccountService;
    }

    @PostMapping("/login")
    public CommonResult<AuthLoginRespVO> login(@RequestBody AuthLoginReqVO loginReqVO) {
        if (!authAccountService.verifyPassword(loginReqVO.getUsername(), loginReqVO.getPassword())) {
            return error("用户名或密码错误");
        }
        var account = authAccountService.getByUsername(loginReqVO.getUsername());
        if (!"ADMIN".equals(account.getRole())) {
            return error("后台仅允许管理员登录");
        }
        return success(new AuthLoginRespVO(
                "admin-token-" + account.getUsername(),
                account.getUsername(),
                "管理员-" + account.getUsername(),
                account.getRole(),
                account.getUserId(),
                account.getProfileId(),
                "/dashboard.html",
                ADMIN_MENUS
        ));
    }
}
