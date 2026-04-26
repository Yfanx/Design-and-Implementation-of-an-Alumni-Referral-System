package cn.iocoder.yudao.module.referral.controller.admin.student.vo;

import cn.iocoder.yudao.framework.common.pojo.PageParam;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class StudentInfoPageReqVO extends PageParam {

    private String realName;
    private String college;
    private String major;
    private String expectedCity;
}
