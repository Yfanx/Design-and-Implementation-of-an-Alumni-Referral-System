package cn.iocoder.yudao.module.referral.controller.admin.consult.vo;

import lombok.Data;

@Data
public class ConsultMessageSendReqVO {

    private Long jobId;
    private Long senderUserId;
    private Long receiverUserId;
    private Integer senderRole;
    private Integer receiverRole;
    private String content;
}
