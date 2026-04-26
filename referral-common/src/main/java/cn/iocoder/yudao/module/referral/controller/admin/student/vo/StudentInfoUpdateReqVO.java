package cn.iocoder.yudao.module.referral.controller.admin.student.vo;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = false)
public class StudentInfoUpdateReqVO extends StudentInfoCreateReqVO {

    private Long id;
}
