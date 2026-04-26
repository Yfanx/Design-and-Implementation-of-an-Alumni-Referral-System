package cn.iocoder.yudao.module.referral.controller.admin.job.vo;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = false)
public class JobInfoUpdateReqVO extends JobInfoCreateReqVO {

    private Long id;
}
