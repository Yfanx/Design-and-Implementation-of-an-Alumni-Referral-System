package cn.iocoder.yudao.module.referral.dal.dataobject.student;

import cn.iocoder.yudao.framework.mybatis.core.dataobject.BaseDO;
import com.baomidou.mybatisplus.annotation.KeySequence;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@TableName("ref_student_info")
@KeySequence("ref_student_info_seq")
@Data
@EqualsAndHashCode(callSuper = true)
public class StudentInfoDO extends BaseDO {

    private Long id;
    private Long userId;
    private String realName;
    private Integer gender;
    private String studentNo;
    private String college;
    private String major;
    private String grade;
    private String education;
    private String expectedIndustry;
    private String expectedJob;
    private String expectedCity;
    private String skillTags;
    private String resumeUrl;
    private String intro;
}
