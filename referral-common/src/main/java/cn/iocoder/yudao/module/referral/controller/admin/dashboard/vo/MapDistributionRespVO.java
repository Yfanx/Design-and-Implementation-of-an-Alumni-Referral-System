package cn.iocoder.yudao.module.referral.controller.admin.dashboard.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MapDistributionRespVO {

    private String city;
    private Long jobCount;
    private Long companyCount;
    private Long applicationCount;
}
