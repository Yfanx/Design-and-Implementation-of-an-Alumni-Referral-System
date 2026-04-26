package cn.iocoder.yudao.module.referral.controller.admin.dashboard.vo;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class HotJobRespVO {

    private String jobTitle;
    private Long count;
}
