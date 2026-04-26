package cn.iocoder.yudao.module.referral.controller.admin.referral.vo;

import cn.iocoder.yudao.framework.common.pojo.PageParam;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class ReferralApplicationPageReqVO extends PageParam {

    private Long jobId;
    private Long studentId;
    private Long alumniId;
    private Integer applyStatus;
}
