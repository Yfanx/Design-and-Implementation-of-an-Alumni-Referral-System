package cn.iocoder.yudao.module.referral.controller.admin.company.vo;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = false)
public class CompanyInfoUpdateReqVO extends CompanyInfoCreateReqVO {

    private Long id;
}
