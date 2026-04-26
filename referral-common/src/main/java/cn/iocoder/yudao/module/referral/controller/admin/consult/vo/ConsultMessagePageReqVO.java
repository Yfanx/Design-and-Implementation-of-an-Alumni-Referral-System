package cn.iocoder.yudao.module.referral.controller.admin.consult.vo;

import cn.iocoder.yudao.framework.common.pojo.PageParam;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class ConsultMessagePageReqVO extends PageParam {

    private Long jobId;
    private Long senderUserId;
    private Long receiverUserId;
}
