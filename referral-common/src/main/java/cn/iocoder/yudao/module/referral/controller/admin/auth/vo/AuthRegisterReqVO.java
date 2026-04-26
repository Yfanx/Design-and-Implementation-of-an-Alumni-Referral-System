package cn.iocoder.yudao.module.referral.controller.admin.auth.vo;

import lombok.Data;

@Data
public class AuthRegisterReqVO {

    private String username;
    private String password;
    private String confirmPassword;
    private String role;
    private String realName;
    private Integer gender;
    private String studentNo;
    private String college;
    private String major;
    private String grade;
    private String education;
    private String graduationYear;
    private String companyName;
    private String positionName;
    private String industry;
    private String city;
    private String intro;
}