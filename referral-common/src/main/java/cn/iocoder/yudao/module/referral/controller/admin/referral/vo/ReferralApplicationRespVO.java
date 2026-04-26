package cn.iocoder.yudao.module.referral.controller.admin.referral.vo;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class ReferralApplicationRespVO {

    private Long id;
    private Long jobId;
    private String jobTitle;
    private Long studentId;
    private String studentName;
    private Long alumniId;
    private String alumniName;
    private String resumeUrl;
    private String selfIntroduction;
    private BigDecimal matchScore;
    private Integer applyStatus;
    private String processRemark;
    private LocalDateTime applyTime;
    private LocalDateTime processTime;
}
