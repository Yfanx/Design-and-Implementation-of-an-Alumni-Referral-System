package cn.iocoder.yudao.module.referral.controller.admin.job.vo;

import cn.iocoder.yudao.framework.common.pojo.PageParam;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class JobInfoPageReqVO extends PageParam {

    private Long alumniId;
    private String jobTitle;
    private String industry;
    private String city;
    private Integer status;
    private Integer auditStatus;
}
