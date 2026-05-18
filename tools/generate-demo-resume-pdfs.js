const fs = require("fs");
const path = require("path");

const root = process.cwd();
const outputDirs = [
  path.join(root, "uploads", "demo", "resume"),
  path.join(root, "referral-app", "uploads", "demo", "resume")
];

const resumes = [
  {
    fileName: "wang_backend_resume.pdf",
    name: "Wang Chen",
    role: "Java Backend Engineer",
    contact: "Shanghai | +86 138-0000-2001 | wang.chen@campusmail.com",
    summary: [
      "Backend-focused student with hands-on experience in campus SaaS tools and recruiting workflows.",
      "Comfortable owning API design, data modeling, caching and delivery efficiency improvements."
    ],
    education: [
      "B.Eng. in Computer Science and Technology, 2022-2026, South China University.",
      "Core modules: Data Structures, DB Systems, Distributed Systems, Operating Systems."
    ],
    experience: [
      "Backend Intern, TalentCloud Lab, 2025. Built Spring Boot APIs, Redis cache and SQL tuning.",
      "Student Project Lead, Referral Platform MVP. Coordinated schema design and service integration."
    ],
    projects: [
      "Campus Recruitment Portal: implemented auth, resume review flow and recruiter workbench.",
      "Course Scheduling Platform: reduced average query latency with index and cache optimization."
    ],
    skills: [
      "Java, Spring Boot, MySQL, Redis, REST API, Linux, Git, Docker, Unit Testing"
    ]
  },
  {
    fileName: "zhao_algorithm_resume.pdf",
    name: "Zhao Yuning",
    role: "Recommendation Algorithm Engineer",
    contact: "Hangzhou | +86 138-0000-2002 | zhao.yuning@campusmail.com",
    summary: [
      "Algorithm candidate with strong interest in recommendation ranking, feature engineering and A/B analysis.",
      "Experienced in converting coursework into measurable prototypes with offline evaluation."
    ],
    education: [
      "B.Eng. in Software Engineering, 2022-2026, South China University.",
      "Core modules: Machine Learning, Probability, Recommender Systems, Data Mining."
    ],
    experience: [
      "AI Lab Research Assistant, 2025. Trained CTR models and analyzed recall/precision tradeoffs.",
      "Competition Team Member, Tianchi Track. Built candidate generation and ranking baselines."
    ],
    projects: [
      "Movie Recommendation Demo: combined collaborative filtering and LightGBM ranking pipeline.",
      "User Interest Insight Dashboard: built feature ETL scripts and evaluation report automation."
    ],
    skills: [
      "Python, Pandas, Scikit-learn, XGBoost, SQL, Feature Engineering, Experiment Analysis"
    ]
  },
  {
    fileName: "liu_cloud_resume.pdf",
    name: "Liu Haoran",
    role: "Cloud Platform Engineer",
    contact: "Hangzhou | +86 138-0000-2003 | liu.haoran@campusmail.com",
    summary: [
      "Cloud-native engineering candidate with practice in containerization, observability and service delivery.",
      "Enjoys platform tooling that improves release confidence and system operability."
    ],
    education: [
      "B.Eng. in Network Engineering, 2022-2026, South China University.",
      "Core modules: Computer Networks, Cloud Computing, Linux Systems, Service Governance."
    ],
    experience: [
      "Platform Engineering Intern, 2025. Maintained CI jobs and container deployment templates.",
      "Open Source Contributor. Submitted fixes for deployment docs and startup scripts."
    ],
    projects: [
      "K8s Deployment Toolkit: packaged microservices with Helm and rollout checklists.",
      "Cluster Monitoring Demo: integrated Prometheus metrics with alert escalation rules."
    ],
    skills: [
      "Java, Go, Docker, Kubernetes, Helm, Prometheus, Nginx, CI/CD, Shell"
    ]
  },
  {
    fileName: "sun_frontend_resume.pdf",
    name: "Sun Jia",
    role: "Frontend Engineer",
    contact: "Beijing | +86 138-0000-2004 | sun.jia@campusmail.com",
    summary: [
      "Product-oriented frontend candidate focused on information hierarchy, interaction polish and component reuse.",
      "Balances delivery speed with maintainable design system thinking."
    ],
    education: [
      "B.Eng. in Digital Media Technology, 2022-2026, South China University.",
      "Core modules: Web Engineering, Interaction Design, Computer Graphics, HCI."
    ],
    experience: [
      "Frontend Intern, 2025. Built Vue3 dashboards, approval flows and analytics pages.",
      "Campus Media Studio. Designed event landing pages and registration experiences."
    ],
    projects: [
      "Activity Ops Console: delivered tables, charts and role-based action modules with TypeScript.",
      "Design Token Playground: unified forms, cards and navigation patterns for internal tools."
    ],
    skills: [
      "Vue3, TypeScript, Element Plus, ECharts, CSS Architecture, Vite, Accessibility"
    ]
  },
  {
    fileName: "huang_software_resume.pdf",
    name: "Huang Rui",
    role: "Software Development Engineer",
    contact: "Shenzhen | +86 138-0000-2005 | huang.rui@campusmail.com",
    summary: [
      "Generalist software engineering candidate with solid systems fundamentals and strong debugging habits.",
      "Interested in performance-sensitive product development and large-scale engineering collaboration."
    ],
    education: [
      "B.Eng. in Software Engineering, 2022-2026, South China University.",
      "Core modules: Operating Systems, Computer Architecture, Network Protocols, C++ Programming."
    ],
    experience: [
      "Embedded Software Intern, 2025. Worked on serial communication and fault log analysis.",
      "Robotics Club Developer. Maintained device control programs and test reports."
    ],
    projects: [
      "Device Diagnostic Tool: built C++ parsers and Java log export utilities for QA teams.",
      "Protocol Simulation Lab: implemented socket communication and packet replay utilities."
    ],
    skills: [
      "C++, Java, Operating Systems, TCP/IP, Multithreading, Debugging, Git, Documentation"
    ]
  }
];

const aliasMap = {
  "wang.pdf": "wang_backend_resume.pdf",
  "zhao.pdf": "zhao_algorithm_resume.pdf"
};

function escapePdf(text) {
  return String(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function appendText(commands, font, size, x, y, text) {
  commands.push(`BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${escapePdf(text)}) Tj ET`);
}

function appendDivider(commands, y) {
  commands.push(`0.78 0.58 0.40 RG`);
  commands.push(`1 w`);
  commands.push(`54 ${y} m`);
  commands.push(`540 ${y} l`);
  commands.push(`S`);
}

function appendSection(commands, title, lines, yRef) {
  appendText(commands, "F2", 13, 54, yRef.value, title.toUpperCase());
  yRef.value -= 18;
  appendDivider(commands, yRef.value + 4);
  yRef.value -= 12;
  for (const line of lines) {
    appendText(commands, "F1", 11, 60, yRef.value, `- ${line}`);
    yRef.value -= 14;
  }
  yRef.value -= 8;
}

function buildResumePdf(resume) {
  const commands = [];
  const yRef = { value: 790 };

  appendText(commands, "F2", 26, 54, yRef.value, resume.name);
  yRef.value -= 30;
  appendText(commands, "F1", 13, 54, yRef.value, resume.role);
  yRef.value -= 18;
  appendText(commands, "F1", 10, 54, yRef.value, resume.contact);
  yRef.value -= 18;
  appendDivider(commands, yRef.value + 4);
  yRef.value -= 20;

  appendSection(commands, "Professional Summary", resume.summary, yRef);
  appendSection(commands, "Education", resume.education, yRef);
  appendSection(commands, "Experience", resume.experience, yRef);
  appendSection(commands, "Projects", resume.projects, yRef);
  appendSection(commands, "Skills", resume.skills, yRef);

  appendText(commands, "F1", 9, 54, 40, "Generated for referral-app demo assets on 2026-05-18");

  const stream = commands.join("\n");
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n",
    `6 0 obj\n<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream\nendobj\n`
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += object;
  }
  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "ascii");
}

for (const dir of outputDirs) {
  fs.mkdirSync(dir, { recursive: true });
  for (const resume of resumes) {
    fs.writeFileSync(path.join(dir, resume.fileName), buildResumePdf(resume));
  }
  for (const [alias, target] of Object.entries(aliasMap)) {
    fs.copyFileSync(path.join(dir, target), path.join(dir, alias));
  }
}

for (const resume of resumes) {
  console.log(`generated ${resume.fileName}`);
}
