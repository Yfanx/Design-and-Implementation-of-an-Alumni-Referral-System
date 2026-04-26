package cn.iocoder.yudao.module.referral.controller.admin.alumni.vo;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = false)
public class AlumniInfoUpdateReqVO extends AlumniInfoCreateReqVO {

    private Long id;
    private Integer verifyStatus;
}
