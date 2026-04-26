package cn.iocoder.yudao.module.referral.controller.admin.job.vo;

import cn.iocoder.yudao.framework.common.pojo.PageParam;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class JobInfoMatchPageReqVO extends PageParam {

    private String industry;
    private String city;
    private String expectedJob;
    private String education;
    private String keyword;
}
