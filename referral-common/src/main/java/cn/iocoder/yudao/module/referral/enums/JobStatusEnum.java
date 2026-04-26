package cn.iocoder.yudao.module.referral.enums;

public enum JobStatusEnum {

    DRAFT(0, "Draft"),
    PENDING(1, "Pending"),
    PUBLISHED(2, "Published"),
    OFFLINE(3, "Offline");

    private final Integer status;
    private final String description;

    JobStatusEnum(Integer status, String description) {
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
