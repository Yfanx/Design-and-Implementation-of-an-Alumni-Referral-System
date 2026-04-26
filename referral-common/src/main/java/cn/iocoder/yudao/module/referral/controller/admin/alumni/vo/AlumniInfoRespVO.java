package cn.iocoder.yudao.module.referral.controller.admin.alumni.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AlumniInfoRespVO {

    private Long id;
    private Long userId;
    private String realName;
    private Integer gender;
    private Integer graduationYear;
    private String college;
    private String major;
    private Long companyId;
    private String companyName;
    private String industry;
    private String positionName;
    private String city;
    private Integer referralPermission;
    private String intro;
    private Integer verifyStatus;
    private LocalDateTime createTime;
}
