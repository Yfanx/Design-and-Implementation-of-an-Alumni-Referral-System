package cn.iocoder.yudao.module.referral.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.nio.file.Path;
import java.nio.file.Paths;

@Data
@Component
@ConfigurationProperties(prefix = "referral.file")
public class ReferralFileProperties {

    /**
     * Relative directory name under the code workspace, or an absolute path.
     */
    private String uploadDir = "uploads";

    /**
     * Public URL prefix used by Spring resource handlers.
     */
    private String publicPrefix = "/uploads/";

    public Path resolveUploadRoot() {
        String normalizedUploadDir = uploadDir == null || uploadDir.isBlank() ? "uploads" : uploadDir.trim();
        Path configuredPath = Paths.get(normalizedUploadDir);
        if (configuredPath.isAbsolute()) {
            return configuredPath.normalize();
        }
        Path workDir = Paths.get(System.getProperty("user.dir", ".")).toAbsolutePath().normalize();
        String leaf = workDir.getFileName() != null ? workDir.getFileName().toString() : "";
        if (leaf.startsWith("referral-") && workDir.getParent() != null) {
            workDir = workDir.getParent();
        }
        return workDir.resolve(configuredPath).normalize();
    }

    public String normalizePublicPrefix() {
        String prefix = publicPrefix == null || publicPrefix.isBlank() ? "/uploads/" : publicPrefix.trim();
        if (!prefix.startsWith("/")) {
            prefix = "/" + prefix;
        }
        if (!prefix.endsWith("/")) {
            prefix = prefix + "/";
        }
        return prefix;
    }
}
