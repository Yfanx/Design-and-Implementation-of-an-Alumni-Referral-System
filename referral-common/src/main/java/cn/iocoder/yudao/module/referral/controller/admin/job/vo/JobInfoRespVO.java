package cn.iocoder.yudao.module.referral.controller.admin.job.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class JobInfoRespVO {

    private Long id;
    private Long alumniId;
    private Long companyId;
    private String companyName;
    private String jobTitle;
    private String jobType;
    private String industry;
    private String city;
    private String salaryRange;
    private String educationRequirement;
    private String experienceRequirement;
    private String skillRequirement;
    private String jobDesc;
    private Integer referralQuota;
    private Integer status;
    private Integer auditStatus;
    private LocalDateTime publishTime;
    private LocalDateTime expireTime;
}
