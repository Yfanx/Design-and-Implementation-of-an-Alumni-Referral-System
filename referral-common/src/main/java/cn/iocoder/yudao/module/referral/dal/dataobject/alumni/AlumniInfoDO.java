package cn.iocoder.yudao.module.referral.dal.dataobject.alumni;

import cn.iocoder.yudao.framework.mybatis.core.dataobject.BaseDO;
import com.baomidou.mybatisplus.annotation.KeySequence;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@TableName("ref_alumni_info")
@KeySequence("ref_alumni_info_seq")
@Data
@EqualsAndHashCode(callSuper = true)
public class AlumniInfoDO extends BaseDO {

    private Long id;
    private Long userId;
    private String realName;
    private Integer gender;
    private Integer graduationYear;
    private String college;
    private String major;
    private Long companyId;
    private String companyName;
    private String industry;
    private String positionName;
    private String city;
    private Integer referralPermission;
    private String intro;
    private Integer verifyStatus;
}
