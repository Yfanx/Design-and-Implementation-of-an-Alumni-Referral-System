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

            createResumePdfIfAbsent(demoResumeDir.resolve("wang_backend_resume.pdf"),
                    "Wang Chen",
                    "Java Backend Engineer",
                    "Shanghai | +86 138-0000-2001 | wang.chen@campusmail.com",
                    new String[] {
                            "Backend-focused student with hands-on experience in campus SaaS tools and recruiting workflows.",
                            "Comfortable owning API design, data modeling, caching and delivery efficiency improvements."
                    },
                    new String[] {
                            "B.Eng. in Computer Science and Technology, 2022-2026, South China University.",
                            "Core modules: Data Structures, DB Systems, Distributed Systems, Operating Systems."
                    },
                    new String[] {
                            "Backend Intern, TalentCloud Lab, 2025. Built Spring Boot APIs, Redis cache and SQL tuning.",
                            "Student Project Lead, Referral Platform MVP. Coordinated schema design and service integration."
                    },
                    new String[] {
                            "Campus Recruitment Portal: implemented auth, resume review flow and recruiter workbench.",
                            "Course Scheduling Platform: reduced average query latency with index and cache optimization."
                    },
                    new String[] {
                            "Java, Spring Boot, MySQL, Redis, REST API, Linux, Git, Docker, Unit Testing"
                    });
            createResumePdfIfAbsent(demoResumeDir.resolve("zhao_algorithm_resume.pdf"),
                    "Zhao Yuning",
                    "Recommendation Algorithm Engineer",
                    "Hangzhou | +86 138-0000-2002 | zhao.yuning@campusmail.com",
                    new String[] {
                            "Algorithm candidate with strong interest in recommendation ranking, feature engineering and A/B analysis.",
                            "Experienced in converting coursework into measurable prototypes with offline evaluation."
                    },
                    new String[] {
                            "B.Eng. in Software Engineering, 2022-2026, South China University.",
                            "Core modules: Machine Learning, Probability, Recommender Systems, Data Mining."
                    },
                    new String[] {
                            "AI Lab Research Assistant, 2025. Trained CTR models and analyzed recall/precision tradeoffs.",
                            "Competition Team Member, Tianchi Track. Built candidate generation and ranking baselines."
                    },
                    new String[] {
                            "Movie Recommendation Demo: combined collaborative filtering and LightGBM ranking pipeline.",
                            "User Interest Insight Dashboard: built feature ETL scripts and evaluation report automation."
                    },
                    new String[] {
                            "Python, Pandas, Scikit-learn, XGBoost, SQL, Feature Engineering, Experiment Analysis"
                    });
            createResumePdfIfAbsent(demoResumeDir.resolve("liu_cloud_resume.pdf"),
                    "Liu Haoran",
                    "Cloud Platform Engineer",
                    "Hangzhou | +86 138-0000-2003 | liu.haoran@campusmail.com",
                    new String[] {
                            "Cloud-native engineering candidate with practice in containerization, observability and service delivery.",
                            "Enjoys platform tooling that improves release confidence and system operability."
                    },
                    new String[] {
                            "B.Eng. in Network Engineering, 2022-2026, South China University.",
                            "Core modules: Computer Networks, Cloud Computing, Linux Systems, Service Governance."
                    },
                    new String[] {
                            "Platform Engineering Intern, 2025. Maintained CI jobs and container deployment templates.",
                            "Open Source Contributor. Submitted fixes for deployment docs and startup scripts."
                    },
                    new String[] {
                            "K8s Deployment Toolkit: packaged microservices with Helm and rollout checklists.",
                            "Cluster Monitoring Demo: integrated Prometheus metrics with alert escalation rules."
                    },
                    new String[] {
                            "Java, Go, Docker, Kubernetes, Helm, Prometheus, Nginx, CI/CD, Shell"
                    });
            createResumePdfIfAbsent(demoResumeDir.resolve("sun_frontend_resume.pdf"),
                    "Sun Jia",
                    "Frontend Engineer",
                    "Beijing | +86 138-0000-2004 | sun.jia@campusmail.com",
                    new String[] {
                            "Product-oriented frontend candidate focused on information hierarchy, interaction polish and component reuse.",
                            "Balances delivery speed with maintainable design system thinking."
                    },
                    new String[] {
                            "B.Eng. in Digital Media Technology, 2022-2026, South China University.",
                            "Core modules: Web Engineering, Interaction Design, Computer Graphics, HCI."
                    },
                    new String[] {
                            "Frontend Intern, 2025. Built Vue3 dashboards, approval flows and analytics pages.",
                            "Campus Media Studio. Designed event landing pages and registration experiences."
                    },
                    new String[] {
                            "Activity Ops Console: delivered tables, charts and role-based action modules with TypeScript.",
                            "Design Token Playground: unified forms, cards and navigation patterns for internal tools."
                    },
                    new String[] {
                            "Vue3, TypeScript, Element Plus, ECharts, CSS Architecture, Vite, Accessibility"
                    });
            createResumePdfIfAbsent(demoResumeDir.resolve("huang_software_resume.pdf"),
                    "Huang Rui",
                    "Software Development Engineer",
                    "Shenzhen | +86 138-0000-2005 | huang.rui@campusmail.com",
                    new String[] {
                            "Generalist software engineering candidate with solid systems fundamentals and strong debugging habits.",
                            "Interested in performance-sensitive product development and large-scale engineering collaboration."
                    },
                    new String[] {
                            "B.Eng. in Software Engineering, 2022-2026, South China University.",
                            "Core modules: Operating Systems, Computer Architecture, Network Protocols, C++ Programming."
                    },
                    new String[] {
                            "Embedded Software Intern, 2025. Worked on serial communication and fault log analysis.",
                            "Robotics Club Developer. Maintained device control programs and test reports."
                    },
                    new String[] {
                            "Device Diagnostic Tool: built C++ parsers and Java log export utilities for QA teams.",
                            "Protocol Simulation Lab: implemented socket communication and packet replay utilities."
                    },
                    new String[] {
                            "C++, Java, Operating Systems, TCP/IP, Multithreading, Debugging, Git, Documentation"
                    });
            createResumePdfIfAbsent(demoResumeDir.resolve("wang.pdf"),
                    "Wang Chen",
                    "Java Backend Engineer",
                    "Shanghai | +86 138-0000-2001 | wang.chen@campusmail.com",
                    new String[] {
                            "Legacy alias kept for historical demo data compatibility."
                    },
                    new String[] {
                            "B.Eng. in Computer Science and Technology, 2022-2026, South China University."
                    },
                    new String[] {
                            "Backend Intern with Spring Boot, MySQL and Redis delivery experience."
                    },
                    new String[] {
                            "Campus Recruitment Portal and Scheduling Platform."
                    },
                    new String[] {
                            "Java, Spring Boot, MySQL, Redis"
                    });
            createResumePdfIfAbsent(demoResumeDir.resolve("zhao.pdf"),
                    "Zhao Yuning",
                    "Recommendation Algorithm Engineer",
                    "Hangzhou | +86 138-0000-2002 | zhao.yuning@campusmail.com",
                    new String[] {
                            "Legacy alias kept for historical demo data compatibility."
                    },
                    new String[] {
                            "B.Eng. in Software Engineering, 2022-2026, South China University."
                    },
                    new String[] {
                            "Research assistant with recommendation and data mining project background."
                    },
                    new String[] {
                            "Movie Recommendation Demo and User Insight Dashboard."
                    },
                    new String[] {
                            "Python, Scikit-learn, SQL, Experiment Analysis"
                    });
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

    private void createResumePdfIfAbsent(Path file, String name, String role, String contact,
                                         String[] summaryLines, String[] educationLines, String[] experienceLines,
                                         String[] projectLines, String[] skillLines) throws IOException {
        if (Files.exists(file)) {
            return;
        }
        byte[] bytes = buildResumePdf(name, role, contact, summaryLines, educationLines, experienceLines, projectLines, skillLines);
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

    private byte[] buildResumePdf(String name, String role, String contact, String[] summaryLines,
                                  String[] educationLines, String[] experienceLines, String[] projectLines,
                                  String[] skillLines) {
        String[] objects = new String[6];
        objects[0] = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
        objects[1] = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
        objects[2] = "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n";
        objects[3] = "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";
        objects[4] = "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n";

        StringBuilder content = new StringBuilder();
        int y = 790;
        y = appendPdfText(content, "F2", 26, 54, y, name, 30);
        y = appendPdfText(content, "F1", 13, 54, y, role, 18);
        y = appendPdfText(content, "F1", 10, 54, y, contact, 18);
        appendPdfDivider(content, y + 4);
        y -= 20;
        y = appendPdfSection(content, y, "Professional Summary", summaryLines);
        y = appendPdfSection(content, y, "Education", educationLines);
        y = appendPdfSection(content, y, "Experience", experienceLines);
        y = appendPdfSection(content, y, "Projects", projectLines);
        y = appendPdfSection(content, y, "Skills", skillLines);
        appendPdfText(content, "F1", 9, 54, 40, "Generated for referral-app demo assets on " + LocalDate.now(), 0);

        String contentString = content.toString();
        objects[5] = "6 0 obj\n<< /Length " + contentString.getBytes(StandardCharsets.US_ASCII).length + " >>\nstream\n" +
                contentString + "\nendstream\nendobj\n";

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

    private int appendPdfSection(StringBuilder content, int y, String title, String[] lines) {
        y = appendPdfText(content, "F2", 13, 54, y, title.toUpperCase(Locale.ROOT), 18);
        appendPdfDivider(content, y + 4);
        y -= 12;
        for (String line : lines) {
            y = appendPdfText(content, "F1", 11, 60, y, "- " + line, 14);
        }
        return y - 8;
    }

    private int appendPdfText(StringBuilder content, String font, int size, int x, int y, String text, int gap) {
        content.append("BT\n/")
                .append(font)
                .append(' ')
                .append(size)
                .append(" Tf\n1 0 0 1 ")
                .append(x)
                .append(' ')
                .append(y)
                .append(" Tm\n(")
                .append(escapePdf(text))
                .append(") Tj\nET\n");
        return y - gap;
    }

    private void appendPdfDivider(StringBuilder content, int y) {
        content.append("0.78 0.58 0.40 RG\n1 w\n54 ")
                .append(y)
                .append(" m\n540 ")
                .append(y)
                .append(" l\nS\n");
    }

    private String escapePdf(String text) {
        return text.replace("\\", "\\\\")
                .replace("(", "\\(")
                .replace(")", "\\)");
    }
}
