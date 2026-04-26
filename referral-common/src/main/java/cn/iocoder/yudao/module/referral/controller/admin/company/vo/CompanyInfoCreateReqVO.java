package cn.iocoder.yudao.module.referral.controller.admin.company.vo;

import lombok.Data;

@Data
public class CompanyInfoCreateReqVO {

    private String companyName;
    private String industry;
    private String companySize;
    private String city;
    private String address;
    private String companyDesc;
    private String officialWebsite;
    private Integer status;
}
