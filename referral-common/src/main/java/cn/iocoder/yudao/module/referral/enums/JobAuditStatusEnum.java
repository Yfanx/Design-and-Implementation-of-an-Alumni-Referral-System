package cn.iocoder.yudao.module.referral.enums;

public enum JobAuditStatusEnum {

    WAITING(0, "Waiting"),
    APPROVED(1, "Approved"),
    REJECTED(2, "Rejected");

    private final Integer status;
    private final String description;

    JobAuditStatusEnum(Integer status, String description) {
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
