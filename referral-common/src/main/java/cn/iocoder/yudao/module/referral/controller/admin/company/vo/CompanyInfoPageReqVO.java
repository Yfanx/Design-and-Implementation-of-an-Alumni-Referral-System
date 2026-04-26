package cn.iocoder.yudao.module.referral.controller.admin.company.vo;

import cn.iocoder.yudao.framework.common.pojo.PageParam;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class CompanyInfoPageReqVO extends PageParam {

    private String companyName;
    private String industry;
    private String city;
}
