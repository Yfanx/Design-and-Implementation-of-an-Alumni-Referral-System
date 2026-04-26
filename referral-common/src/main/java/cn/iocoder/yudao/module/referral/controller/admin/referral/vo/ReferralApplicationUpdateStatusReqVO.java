package cn.iocoder.yudao.module.referral.controller.admin.referral.vo;

import lombok.Data;

@Data
public class ReferralApplicationUpdateStatusReqVO {

    private Long id;
    private Integer applyStatus;
    private String processRemark;
}
