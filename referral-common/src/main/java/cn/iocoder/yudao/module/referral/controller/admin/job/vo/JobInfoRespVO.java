package cn.iocoder.yudao.module.referral.controller.admin.job.vo;

import cn.iocoder.yudao.module.referral.controller.admin.referral.vo.MatchDimensionRespVO;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class JobInfoRespVO {

    private Long id;
    private Long alumniId;
    private Long companyId;
    private String companyName;
    private String companyLogoUrl;
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
    private Integer status;
    private Integer auditStatus;
    private LocalDateTime publishTime;
    private LocalDateTime expireTime;
    private BigDecimal matchScore;
    private String matchSummary;
    private List<MatchDimensionRespVO> matchBreakdown;
}
