package cn.iocoder.yudao.module.referral.controller.admin.referral.vo;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class ReferralApplicationRespVO {

    private Long id;
    private Long jobId;
    private String jobTitle;
    private String companyName;
    private String city;
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
    private String matchSummary;
    private List<MatchDimensionRespVO> matchBreakdown;
    private List<ApplicationProgressStepRespVO> progressSteps;
}
