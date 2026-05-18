package cn.iocoder.yudao.module.referral.controller.admin.referral.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApplicationProgressStepRespVO {

    private Integer step;
    private String title;
    private String description;
    private String state;
    private String time;
}
