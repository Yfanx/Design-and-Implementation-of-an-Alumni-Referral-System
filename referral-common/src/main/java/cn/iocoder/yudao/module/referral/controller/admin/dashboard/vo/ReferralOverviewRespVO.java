package cn.iocoder.yudao.module.referral.controller.admin.dashboard.vo;

import lombok.Data;

@Data
public class ReferralOverviewRespVO {

    private Long totalAlumni;
    private Long totalStudents;
    private Long totalCompanies;
    private Long totalJobs;
    private Long totalApplications;
    private Long processedApplications;
}
