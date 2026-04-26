package cn.iocoder.yudao.server;

import cn.iocoder.yudao.module.referral.config.ReferralStorageProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication(scanBasePackages = "cn.iocoder.yudao")
@EnableConfigurationProperties(ReferralStorageProperties.class)
public class ReferralAppApplication {

    public static void main(String[] args) {
        SpringApplication.run(ReferralAppApplication.class, args);
    }
}
