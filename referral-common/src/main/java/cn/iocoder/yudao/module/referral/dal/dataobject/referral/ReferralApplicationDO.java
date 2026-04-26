package cn.iocoder.yudao.module.referral.dal.dataobject.referral;

import cn.iocoder.yudao.framework.mybatis.core.dataobject.BaseDO;
import com.baomidou.mybatisplus.annotation.KeySequence;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@TableName("ref_referral_application")
@KeySequence("ref_referral_application_seq")
@Data
@EqualsAndHashCode(callSuper = true)
public class ReferralApplicationDO extends BaseDO {

    private Long id;
    private Long jobId;
    private Long studentId;
    private Long alumniId;
    private String resumeUrl;
    private String selfIntroduction;
    private BigDecimal matchScore;
    private Integer applyStatus;
    private String processRemark;
    private LocalDateTime applyTime;
    private LocalDateTime processTime;
}
