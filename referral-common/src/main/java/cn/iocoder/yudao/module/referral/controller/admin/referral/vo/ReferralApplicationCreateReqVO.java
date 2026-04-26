package cn.iocoder.yudao.module.referral.controller.admin.referral.vo;

import lombok.Data;

@Data
public class ReferralApplicationCreateReqVO {

    private Long jobId;
    private Long studentId;
    private Long alumniId;
    private String resumeUrl;
    private String selfIntroduction;
}
