package cn.iocoder.yudao.module.referral.controller.admin.student.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class StudentInfoRespVO {

    private Long id;
    private Long userId;
    private String realName;
    private Integer gender;
    private String studentNo;
    private String college;
    private String major;
    private String grade;
    private String education;
    private String expectedIndustry;
    private String expectedJob;
    private String expectedCity;
    private String skillTags;
    private String resumeUrl;
    private String intro;
    private LocalDateTime createTime;
}
