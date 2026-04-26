package cn.iocoder.yudao.module.referral.dal.dataobject.company;

import cn.iocoder.yudao.framework.mybatis.core.dataobject.BaseDO;
import com.baomidou.mybatisplus.annotation.KeySequence;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@TableName("ref_company_info")
@KeySequence("ref_company_info_seq")
@Data
@EqualsAndHashCode(callSuper = true)
public class CompanyInfoDO extends BaseDO {

    private Long id;
    private String companyName;
    private String industry;
    private String companySize;
    private String city;
    private String address;
    private String companyDesc;
    private String officialWebsite;
    private Integer status;
}
