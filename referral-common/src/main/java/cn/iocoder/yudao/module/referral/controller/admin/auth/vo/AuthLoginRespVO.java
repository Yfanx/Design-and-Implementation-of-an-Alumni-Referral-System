package cn.iocoder.yudao.module.referral.controller.admin.auth.vo;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class AuthLoginRespVO {

    private String token;
    private String username;
    private String displayName;
    private String role;
    private Long userId;
    private Long profileId;
    private String landingPage;
    private List<String> menus;
}
