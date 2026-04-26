package cn.iocoder.yudao.module.referral.dal.dataobject.job;

import cn.iocoder.yudao.framework.mybatis.core.dataobject.BaseDO;
import com.baomidou.mybatisplus.annotation.KeySequence;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@TableName("ref_job_info")
@KeySequence("ref_job_info_seq")
@Data
@EqualsAndHashCode(callSuper = true)
public class JobInfoDO extends BaseDO {

    private Long id;
    private Long alumniId;
    private Long companyId;
    private String jobTitle;
    private String jobType;
    private String industry;
    private String city;
    private String salaryRange;
    private String educationRequirement;
    private String experienceRequirement;
    private String skillRequirement;
    private String jobDesc;
    private String contactType;
    private Integer referralQuota;
    private Integer status;
    private Integer auditStatus;
    private LocalDateTime publishTime;
    private LocalDateTime expireTime;
}
