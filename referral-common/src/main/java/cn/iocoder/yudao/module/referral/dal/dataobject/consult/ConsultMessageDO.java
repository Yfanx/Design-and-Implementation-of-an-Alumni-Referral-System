package cn.iocoder.yudao.module.referral.dal.dataobject.consult;

import cn.iocoder.yudao.framework.mybatis.core.dataobject.BaseDO;
import com.baomidou.mybatisplus.annotation.KeySequence;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@TableName("ref_consult_message")
@KeySequence("ref_consult_message_seq")
@Data
@EqualsAndHashCode(callSuper = true)
public class ConsultMessageDO extends BaseDO {

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
