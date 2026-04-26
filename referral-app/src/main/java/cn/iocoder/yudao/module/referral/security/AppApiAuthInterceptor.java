package cn.iocoder.yudao.module.referral.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Set;

@Component
public class AppApiAuthInterceptor implements HandlerInterceptor {

    private static final Set<String> PUBLIC_PATHS = Set.of(
            "/auth/login",
            "/auth/register",
            "/referral/company-info/simple-list"
    );

    private static final Set<String> COMMON_GET_PATHS = Set.of(
            "/referral/dashboard/overview",
            "/referral/job-info/get",
            "/referral/job-info/match-list",
            "/referral/company-info/get",
            "/referral/company-info/list",
            "/referral/company-info/simple-list",
            "/referral/alumni-info/get",
            "/referral/consult-message/list",
            "/referral/referral-application/list",
            "/referral/file/preview-content"
    );

    private static final Set<String> STUDENT_GET_PATHS = Set.of(
            "/referral/student-info/get",
            "/referral/job-favorite/list",
            "/referral/alumni-info/list"
    );

    private static final Set<String> ALUMNI_GET_PATHS = Set.of(
            "/referral/job-info/list",
            "/referral/alumni-info/list"
    );

    private static final Set<String> STUDENT_MUTATION_PATHS = Set.of(
            "/referral/referral-application/create",
            "/referral/referral-application/cancel",
            "/referral/consult-message/send",
            "/referral/consult-message/mark-read",
            "/referral/student-info/update",
            "/referral/job-favorite/toggle",
            "/referral/file/upload"
    );

    private static final Set<String> ALUMNI_MUTATION_PATHS = Set.of(
            "/referral/job-info/create",
            "/referral/job-info/update",
            "/referral/job-info/delete",
            "/referral/referral-application/process",
            "/referral/consult-message/send",
            "/referral/consult-message/mark-read",
            "/referral/alumni-info/update",
            "/referral/file/upload"
    );

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String method = request.getMethod();
        String path = request.getRequestURI();
        if (PUBLIC_PATHS.contains(path)) {
            return true;
        }

        String role = request.getHeader("X-Referral-Role");
        String token = request.getHeader("X-Referral-Token");
        if (token == null || token.isBlank()) {
            return writeError(response, HttpServletResponse.SC_UNAUTHORIZED, "请先登录");
        }
        if (!token.startsWith("app-token-")) {
            return writeError(response, HttpServletResponse.SC_UNAUTHORIZED, "前台登录状态无效");
        }
        if (!"STUDENT".equals(role) && !"ALUMNI".equals(role)) {
            return writeError(response, HttpServletResponse.SC_FORBIDDEN, "当前角色无权访问前台接口");
        }

        if ("GET".equalsIgnoreCase(method)) {
            if (COMMON_GET_PATHS.contains(path)) {
                return true;
            }
            if ("STUDENT".equals(role) && STUDENT_GET_PATHS.contains(path)) {
                return true;
            }
            if ("ALUMNI".equals(role) && ALUMNI_GET_PATHS.contains(path)) {
                return true;
            }
            return writeError(response, HttpServletResponse.SC_FORBIDDEN, "当前页面无权访问该数据");
        }

        if ("STUDENT".equals(role) && STUDENT_MUTATION_PATHS.contains(path)) {
            return true;
        }
        if ("ALUMNI".equals(role) && ALUMNI_MUTATION_PATHS.contains(path)) {
            return true;
        }
        return writeError(response, HttpServletResponse.SC_FORBIDDEN, "当前角色无权执行该操作");
    }

    private boolean writeError(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"code\":" + status + ",\"msg\":\"" + message + "\",\"message\":\"" + message + "\"}");
        return false;
    }
}
