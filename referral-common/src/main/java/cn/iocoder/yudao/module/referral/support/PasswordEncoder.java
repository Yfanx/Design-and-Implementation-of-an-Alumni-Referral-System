package cn.iocoder.yudao.module.referral.support;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class PasswordEncoder {

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public String encode(String rawPassword) {
        return encoder.encode(rawPassword);
    }

    public boolean matches(String rawPassword, String encodedPassword) {
        if (encodedPassword == null || encodedPassword.isEmpty()) {
            return false;
        }
        // 兼容旧明文密码
        if (encodedPassword.equals(rawPassword)) {
            return true;
        }
        return encoder.matches(rawPassword, encodedPassword);
    }
}
