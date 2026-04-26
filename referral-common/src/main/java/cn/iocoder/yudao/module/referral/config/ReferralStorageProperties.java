package cn.iocoder.yudao.module.referral.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "referral")
public class ReferralStorageProperties {

    private String storageMode = "mysql";

    public String getStorageMode() {
        return storageMode;
    }

    public void setStorageMode(String storageMode) {
        this.storageMode = storageMode;
    }

    public boolean isMysqlMode() {
        return "mysql".equalsIgnoreCase(storageMode);
    }
}
