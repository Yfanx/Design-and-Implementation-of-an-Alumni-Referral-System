package cn.iocoder.yudao.module.referral.controller.admin.consult.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ConsultMessageRespVO {

    private Long id;
    private Long jobId;
    private Long senderUserId;
    private Long receiverUserId;
    private Integer senderRole;
    private Integer receiverRole;
    private String content;
    private Integer readStatus;
    private LocalDateTime sendTime;
}
