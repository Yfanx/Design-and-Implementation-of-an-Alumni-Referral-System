package cn.iocoder.yudao.module.referral.service.auth;

import cn.iocoder.yudao.module.referral.controller.admin.auth.vo.AuthLoginRespVO;
import cn.iocoder.yudao.module.referral.controller.admin.auth.vo.AuthRegisterReqVO;

public interface AuthService {

    AuthLoginRespVO register(AuthRegisterReqVO reqVO);

    boolean isUsernameTaken(String username);
}