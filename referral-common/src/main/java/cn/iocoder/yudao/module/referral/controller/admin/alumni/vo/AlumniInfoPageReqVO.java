package cn.iocoder.yudao.module.referral.controller.admin.alumni.vo;

import cn.iocoder.yudao.framework.common.pojo.PageParam;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class AlumniInfoPageReqVO extends PageParam {

    private String realName;
    private String companyName;
    private String industry;
    private String city;
}
