package cn.iocoder.yudao.module.referral.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Component
public class AdminApiAuthInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String role = request.getHeader("X-Referral-Role");
        String token = request.getHeader("X-Referral-Token");
        if (token == null || token.isBlank()) {
            return writeError(response, HttpServletResponse.SC_UNAUTHORIZED, "请先登录后台账号");
        }
        if (!token.startsWith("admin-token-")) {
            return writeError(response, HttpServletResponse.SC_UNAUTHORIZED, "后台登录态无效");
        }
        if (!"ADMIN".equals(role)) {
            return writeError(response, HttpServletResponse.SC_FORBIDDEN, "当前角色无权访问后台接口");
        }
        return true;
    }

    private boolean writeError(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"code\":" + status + ",\"msg\":\"" + message + "\",\"message\":\"" + message + "\"}");
        return false;
    }
}
