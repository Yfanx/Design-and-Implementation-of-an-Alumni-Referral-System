package cn.iocoder.yudao.module.referral.enums;

public enum ReferralApplicationStatusEnum {

    PENDING(0, "Pending"),
    VIEWED(1, "Viewed"),
    REFERRED(2, "Referred"),
    REJECTED(3, "Rejected"),
    FINISHED(4, "Finished"),
    CANCELLED(5, "Cancelled");

    private final Integer status;
    private final String description;

    ReferralApplicationStatusEnum(Integer status, String description) {
        this.status = status;
        this.description = description;
    }

    public Integer getStatus() {
        return status;
    }

    public String getDescription() {
        return description;
    }
}
