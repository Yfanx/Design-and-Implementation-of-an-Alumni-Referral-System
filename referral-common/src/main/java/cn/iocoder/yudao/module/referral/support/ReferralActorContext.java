package cn.iocoder.yudao.module.referral.support;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

public final class ReferralActorContext {

    public static final String HEADER_TOKEN = "X-Referral-Token";
    public static final String HEADER_ROLE = "X-Referral-Role";
    public static final String HEADER_USER_ID = "X-Referral-User-Id";
    public static final String HEADER_PROFILE_ID = "X-Referral-Profile-Id";

    private ReferralActorContext() {
    }

    public static Actor getCurrentActor() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null) {
            return Actor.anonymous();
        }
        HttpServletRequest request = attributes.getRequest();
        return new Actor(
                trim(request.getHeader(HEADER_TOKEN)),
                trim(request.getHeader(HEADER_ROLE)),
                parseLong(request.getHeader(HEADER_USER_ID)),
                parseLong(request.getHeader(HEADER_PROFILE_ID))
        );
    }

    private static String trim(String value) {
        return value == null ? null : value.trim();
    }

    private static Long parseLong(String value) {
        try {
            return value == null || value.isBlank() ? null : Long.parseLong(value.trim());
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    public static final class Actor {
        private final String token;
        private final String role;
        private final Long userId;
        private final Long profileId;

        private Actor(String token, String role, Long userId, Long profileId) {
            this.token = token;
            this.role = role;
            this.userId = userId;
            this.profileId = profileId;
        }

        public static Actor anonymous() {
            return new Actor(null, null, null, null);
        }

        public String getToken() {
            return token;
        }

        public String getRole() {
            return role;
        }

        public Long getUserId() {
            return userId;
        }

        public Long getProfileId() {
            return profileId;
        }

        public boolean isAdmin() {
            return "ADMIN".equals(role);
        }

        public boolean isStudent() {
            return "STUDENT".equals(role);
        }

        public boolean isAlumni() {
            return "ALUMNI".equals(role);
        }

        public boolean isAppUser() {
            return isStudent() || isAlumni();
        }

        public boolean isLoggedIn() {
            return token != null && role != null;
        }

        public void requireLoggedIn() {
            if (!isLoggedIn()) {
                throw new IllegalArgumentException("请先登录后再操作");
            }
        }

        public void requireRole(String expectedRole, String message) {
            requireLoggedIn();
            if (!expectedRole.equals(role)) {
                throw new IllegalArgumentException(message);
            }
        }

        public Long requireUserId(String message) {
            requireLoggedIn();
            if (userId == null) {
                throw new IllegalArgumentException(message);
            }
            return userId;
        }

        public Long requireProfileId(String message) {
            requireLoggedIn();
            if (profileId == null) {
                throw new IllegalArgumentException(message);
            }
            return profileId;
        }
    }
}
