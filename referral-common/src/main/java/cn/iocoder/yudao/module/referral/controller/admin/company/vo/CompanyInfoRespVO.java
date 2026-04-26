package cn.iocoder.yudao.module.referral.controller.admin.company.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CompanyInfoRespVO {

    private Long id;
    private String companyName;
    private String industry;
    private String companySize;
    private String city;
    private String address;
    private String companyDesc;
    private String officialWebsite;
    private Integer status;
    private LocalDateTime createTime;
}
