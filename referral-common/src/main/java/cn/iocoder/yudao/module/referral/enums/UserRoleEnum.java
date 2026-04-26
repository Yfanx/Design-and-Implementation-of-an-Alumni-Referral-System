package cn.iocoder.yudao.module.referral.enums;

public enum UserRoleEnum {

    ADMIN(0, "Admin"),
    ALUMNI(1, "Alumni"),
    STUDENT(2, "Student");

    private final Integer role;
    private final String description;

    UserRoleEnum(Integer role, String description) {
        this.role = role;
        this.description = description;
    }

    public Integer getRole() {
        return role;
    }

    public String getDescription() {
        return description;
    }
}
