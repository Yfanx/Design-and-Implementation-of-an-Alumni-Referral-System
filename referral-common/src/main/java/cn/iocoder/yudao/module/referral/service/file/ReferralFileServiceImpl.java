package cn.iocoder.yudao.module.referral.service.file;

import cn.iocoder.yudao.module.referral.config.ReferralFileProperties;
import cn.iocoder.yudao.module.referral.controller.app.file.vo.ReferralFilePreviewRespVO;
import cn.iocoder.yudao.module.referral.controller.app.file.vo.ReferralFileUploadRespVO;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.Base64;
import java.util.Locale;
import java.util.UUID;

@Service
public class ReferralFileServiceImpl implements ReferralFileService {

    private final ReferralFileProperties fileProperties;

    public ReferralFileServiceImpl(ReferralFileProperties fileProperties) {
        this.fileProperties = fileProperties;
    }

    @PostConstruct
    public void initializeDemoAssets() {
        try {
            Path root = fileProperties.resolveUploadRoot();
            Files.createDirectories(root);
            Path demoResumeDir = root.resolve("demo").resolve("resume");
            Path demoImageDir = root.resolve("demo").resolve("image");
            Files.createDirectories(demoResumeDir);
            Files.createDirectories(demoImageDir);

            createPdfIfAbsent(demoResumeDir.resolve("wang.pdf"),
                    "Wang Demo Resume",
                    "Target Role: Java Backend Engineer",
                    "Skills: Java / Spring Boot / MySQL / Redis");
            createPdfIfAbsent(demoResumeDir.resolve("zhao.pdf"),
                    "Zhao Demo Resume",
                    "Target Role: Recommendation Algorithm Engineer",
                    "Skills: Python / Machine Learning / Data Analysis");
            createSvgIfAbsent(demoImageDir.resolve("portfolio-card.svg"),
                    "Referral Portfolio Demo",
                    "Supports in-app preview for image attachments");
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to initialize demo upload assets", exception);
        }
    }

    @Override
    public ReferralFileUploadRespVO uploadFile(MultipartFile file, String category) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("上传文件不能为空");
        }
        try {
            String originalName = file.getOriginalFilename() == null ? "attachment" : file.getOriginalFilename();
            String safeCategory = sanitizeCategory(category);
            String extension = resolveExtension(originalName);
            String savedFileName = UUID.randomUUID().toString().replace("-", "") + extension;

            Path targetDir = fileProperties.resolveUploadRoot().resolve(safeCategory);
            Files.createDirectories(targetDir);
            Path targetFile = targetDir.resolve(savedFileName);
            file.transferTo(targetFile);

            String contentType = file.getContentType();
            if (contentType == null || contentType.isBlank()) {
                contentType = Files.probeContentType(targetFile);
            }
            String previewType = determinePreviewType(originalName, contentType);
            String publicPrefix = fileProperties.normalizePublicPrefix();
            String url = publicPrefix + safeCategory + "/" + savedFileName;
            return new ReferralFileUploadRespVO(savedFileName, originalName, contentType, file.getSize(), url, previewType);
        } catch (IOException exception) {
            throw new IllegalStateException("文件保存失败，请稍后重试", exception);
        }
    }

    @Override
    public ReferralFilePreviewRespVO getPreviewContent(String fileUrl) {
        String safeUrl = fileUrl == null ? "" : fileUrl.trim();
        if (safeUrl.isBlank()) {
            throw new IllegalArgumentException("文件地址不能为空");
        }

        try {
            String normalizedPrefix = fileProperties.normalizePublicPrefix();
            String pathPart = extractPath(safeUrl);
            if (!pathPart.startsWith(normalizedPrefix)) {
                throw new IllegalArgumentException("仅支持预览上传目录中的文件");
            }

            String relativePath = pathPart.substring(normalizedPrefix.length());
            Path root = fileProperties.resolveUploadRoot().toAbsolutePath().normalize();
            Path target = root.resolve(relativePath).normalize();
            if (!target.startsWith(root)) {
                throw new IllegalArgumentException("文件路径不合法");
            }
            if (!Files.exists(target) || !Files.isRegularFile(target)) {
                throw new IllegalArgumentException("文件不存在");
            }

            byte[] content = Files.readAllBytes(target);
            String contentType = Files.probeContentType(target);
            if (contentType == null || contentType.isBlank()) {
                contentType = "application/octet-stream";
            }
            String fileName = target.getFileName() == null ? "attachment" : target.getFileName().toString();
            String previewType = determinePreviewType(fileName, contentType);
            String base64Content = Base64.getEncoder().encodeToString(content);
            return new ReferralFilePreviewRespVO(fileName, contentType, (long) content.length, previewType, base64Content);
        } catch (IllegalArgumentException exception) {
            throw exception;
        } catch (IOException exception) {
            throw new IllegalStateException("读取文件预览内容失败，请稍后重试", exception);
        }
    }

    private String sanitizeCategory(String category) {
        String normalized = category == null || category.isBlank() ? "general" : category.trim().toLowerCase(Locale.ROOT);
        normalized = normalized.replace("\\", "/");
        normalized = normalized.replaceAll("[^a-z0-9/_-]", "-");
        normalized = normalized.replaceAll("/+", "/");
        normalized = normalized.replaceAll("^-+", "");
        normalized = normalized.replaceAll("-+$", "");
        return normalized.isBlank() ? "general" : normalized;
    }

    private String resolveExtension(String originalName) {
        int index = originalName.lastIndexOf('.');
        if (index < 0 || index == originalName.length() - 1) {
            return "";
        }
        return originalName.substring(index).toLowerCase(Locale.ROOT);
    }

    private String extractPath(String fileUrl) {
        String normalized = fileUrl.replace("\\", "/");
        int schemeIndex = normalized.indexOf("://");
        String pathValue = normalized;
        if (schemeIndex >= 0) {
            int pathStart = normalized.indexOf('/', schemeIndex + 3);
            pathValue = pathStart < 0 ? "/" : normalized.substring(pathStart);
        }
        int queryStart = pathValue.indexOf('?');
        if (queryStart >= 0) {
            pathValue = pathValue.substring(0, queryStart);
        }
        int hashStart = pathValue.indexOf('#');
        if (hashStart >= 0) {
            pathValue = pathValue.substring(0, hashStart);
        }
        return pathValue;
    }

    private String determinePreviewType(String originalName, String contentType) {
        String lowerName = originalName.toLowerCase(Locale.ROOT);
        String lowerType = contentType == null ? "" : contentType.toLowerCase(Locale.ROOT);
        if (lowerType.startsWith("image/") || lowerName.endsWith(".png") || lowerName.endsWith(".jpg")
                || lowerName.endsWith(".jpeg") || lowerName.endsWith(".gif") || lowerName.endsWith(".svg")) {
            return "image";
        }
        if (lowerType.contains("pdf") || lowerName.endsWith(".pdf")) {
            return "pdf";
        }
        return "file";
    }

    private void createPdfIfAbsent(Path file, String title, String line2, String line3) throws IOException {
        if (Files.exists(file)) {
            return;
        }
        byte[] bytes = buildSimplePdf(title, line2, line3);
        Files.write(file, bytes);
    }

    private void createSvgIfAbsent(Path file, String title, String subtitle) throws IOException {
        if (Files.exists(file)) {
            return;
        }
        String svg =
                "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1200\" height=\"720\" viewBox=\"0 0 1200 720\">\n" +
                        "  <defs>\n" +
                        "    <linearGradient id=\"bg\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"100%\">\n" +
                        "      <stop offset=\"0%\" stop-color=\"#141413\"/>\n" +
                        "      <stop offset=\"100%\" stop-color=\"#30302e\"/>\n" +
                        "    </linearGradient>\n" +
                        "    <linearGradient id=\"card\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"100%\">\n" +
                        "      <stop offset=\"0%\" stop-color=\"#f8f5ee\"/>\n" +
                        "      <stop offset=\"100%\" stop-color=\"#efe6de\"/>\n" +
                        "    </linearGradient>\n" +
                        "  </defs>\n" +
                        "  <rect width=\"1200\" height=\"720\" fill=\"url(#bg)\"/>\n" +
                        "  <circle cx=\"1040\" cy=\"130\" r=\"160\" fill=\"#c96442\" opacity=\"0.18\"/>\n" +
                        "  <circle cx=\"160\" cy=\"600\" r=\"120\" fill=\"#d97757\" opacity=\"0.14\"/>\n" +
                        "  <rect x=\"120\" y=\"120\" width=\"960\" height=\"480\" rx=\"36\" fill=\"url(#card)\" stroke=\"#d8d0c5\"/>\n" +
                        "  <text x=\"180\" y=\"240\" font-size=\"58\" font-family=\"Georgia, serif\" fill=\"#141413\">" + escapeXml(title) + "</text>\n" +
                        "  <text x=\"180\" y=\"316\" font-size=\"28\" font-family=\"Microsoft YaHei, sans-serif\" fill=\"#5e5d59\">" + escapeXml(subtitle) + "</text>\n" +
                        "  <rect x=\"180\" y=\"390\" width=\"340\" height=\"84\" rx=\"18\" fill=\"#ffffff\" stroke=\"#d8d0c5\"/>\n" +
                        "  <text x=\"220\" y=\"442\" font-size=\"24\" font-family=\"Microsoft YaHei, sans-serif\" fill=\"#c96442\">AI Product Style Demo</text>\n" +
                        "  <rect x=\"560\" y=\"390\" width=\"320\" height=\"84\" rx=\"18\" fill=\"#ffffff\" stroke=\"#d8d0c5\"/>\n" +
                        "  <text x=\"600\" y=\"442\" font-size=\"24\" font-family=\"Microsoft YaHei, sans-serif\" fill=\"#30302e\">Image Preview Enabled</text>\n" +
                        "</svg>\n";
        Files.writeString(file, svg, StandardCharsets.UTF_8);
    }

    private String escapeXml(String value) {
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");
    }

    private byte[] buildSimplePdf(String title, String line2, String line3) {
        String[] objects = new String[5];
        objects[0] = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
        objects[1] = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
        objects[2] = "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n";
        objects[3] = "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";
        String content = "BT\n" +
                "/F1 24 Tf\n" +
                "72 760 Td\n(" + escapePdf(title) + ") Tj\n" +
                "0 -42 Td\n/F1 14 Tf\n(" + escapePdf(line2) + ") Tj\n" +
                "0 -28 Td\n(" + escapePdf(line3) + ") Tj\n" +
                "0 -28 Td\n(" + escapePdf("Generated on: " + LocalDate.now()) + ") Tj\n" +
                "ET";
        objects[4] = "5 0 obj\n<< /Length " + content.getBytes(StandardCharsets.US_ASCII).length + " >>\nstream\n" +
                content + "\nendstream\nendobj\n";

        StringBuilder pdf = new StringBuilder("%PDF-1.4\n");
        int[] offsets = new int[objects.length + 1];
        for (int i = 0; i < objects.length; i++) {
            offsets[i + 1] = pdf.toString().getBytes(StandardCharsets.US_ASCII).length;
            pdf.append(objects[i]);
        }
        int xrefOffset = pdf.toString().getBytes(StandardCharsets.US_ASCII).length;
        pdf.append("xref\n0 ").append(objects.length + 1).append('\n');
        pdf.append("0000000000 65535 f \n");
        for (int i = 1; i < offsets.length; i++) {
            pdf.append(String.format(Locale.ROOT, "%010d 00000 n \n", offsets[i]));
        }
        pdf.append("trailer\n<< /Size ").append(objects.length + 1).append(" /Root 1 0 R >>\n");
        pdf.append("startxref\n").append(xrefOffset).append('\n');
        pdf.append("%%EOF");
        return pdf.toString().getBytes(StandardCharsets.US_ASCII);
    }

    private String escapePdf(String text) {
        return text.replace("\\", "\\\\")
                .replace("(", "\\(")
                .replace(")", "\\)");
    }
}
