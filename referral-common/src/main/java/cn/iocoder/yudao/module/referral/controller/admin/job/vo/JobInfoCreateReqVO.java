package cn.iocoder.yudao.module.referral.controller.admin.job.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class JobInfoCreateReqVO {

    private Long alumniId;
    private Long companyId;
    private String jobTitle;
    private String jobType;
    private String industry;
    private String city;
    private String salaryRange;
    private String educationRequirement;
    private String experienceRequirement;
    private String skillRequirement;
    private String jobDesc;
    private String contactType;
    private Integer referralQuota;
    private LocalDateTime expireTime;
}
