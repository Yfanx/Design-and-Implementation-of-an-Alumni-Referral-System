let attachmentPreviewFixBlobUrl = "";
let attachmentPreviewFixRequestSeq = 0;
let pdfJsModulePromise = null;

function clearAttachmentPreviewFixBlobUrl() {
  if (attachmentPreviewFixBlobUrl) {
    URL.revokeObjectURL(attachmentPreviewFixBlobUrl);
    attachmentPreviewFixBlobUrl = "";
  }
}

window.addEventListener("beforeunload", clearAttachmentPreviewFixBlobUrl);

function sanitizeAttachmentUrl(url = "") {
  const raw = String(url || "").trim();
  if (!raw) {
    return "";
  }
  try {
    const parsed = new URL(raw, window.location.origin);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "";
    }
    return parsed.href;
  } catch (error) {
    return "";
  }
}

function getAttachmentExtension(url = "") {
  const safeUrl = sanitizeAttachmentUrl(url);
  if (!safeUrl) {
    return "";
  }
  const pathname = new URL(safeUrl).pathname;
  const filename = pathname.split("/").pop() || "";
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex === -1) {
    return "";
  }
  return filename.slice(dotIndex + 1).toLowerCase();
}

function isImageUrl(url = "") {
  return ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(getAttachmentExtension(url));
}

function isPdfUrl(url = "") {
  return getAttachmentExtension(url) === "pdf";
}

async function getPdfJsModule() {
  if (!pdfJsModulePromise) {
    pdfJsModulePromise = import("/vendor/pdfjs/pdf.min.mjs").then((module) => {
      const pdfjsLib = module.default || module;
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.mjs";
      return pdfjsLib;
    });
  }
  return pdfJsModulePromise;
}

async function buildAttachmentPreviewSource(url) {
  const safeUrl = sanitizeAttachmentUrl(url);
  if (!safeUrl) {
    return "";
  }
  if (!isImageUrl(safeUrl) && !isPdfUrl(safeUrl)) {
    return safeUrl;
  }
  try {
    const response = await fetch(safeUrl);
    if (!response.ok) {
      return safeUrl;
    }
    const blob = await response.blob();
    clearAttachmentPreviewFixBlobUrl();
    attachmentPreviewFixBlobUrl = URL.createObjectURL(blob);
    return attachmentPreviewFixBlobUrl;
  } catch (error) {
    return safeUrl;
  }
}

async function renderPdfPreview(url, container, requestSeq) {
  const safeUrl = sanitizeAttachmentUrl(url);
  if (!safeUrl) {
    container.innerHTML = `<div class="attachment-preview-fallback">附件地址无效，无法预览。</div>`;
    return;
  }

  try {
    const response = await fetch(safeUrl);
    if (!response.ok) {
      throw new Error("下载 PDF 失败");
    }
    const bytes = await response.arrayBuffer();
    if (requestSeq !== attachmentPreviewFixRequestSeq) {
      return;
    }

    const pdfjsLib = await getPdfJsModule();
    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    const pdf = await loadingTask.promise;
    if (requestSeq !== attachmentPreviewFixRequestSeq) {
      return;
    }

    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      if (requestSeq !== attachmentPreviewFixRequestSeq) {
        return;
      }
      const viewport = page.getViewport({ scale: 1.25 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      canvas.className = "attachment-preview-pdf-canvas";
      await page.render({ canvasContext: context, viewport }).promise;
      pages.push(canvas);
    }

    if (requestSeq !== attachmentPreviewFixRequestSeq) {
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "attachment-preview-pdf-pages";
    pages.forEach((canvas) => wrapper.appendChild(canvas));
    container.innerHTML = "";
    container.appendChild(wrapper);
  } catch (error) {
    container.innerHTML = `
      <div class="attachment-preview-fallback">
        PDF 预览加载失败，请使用上方“新窗口打开”查看。
      </div>
    `;
  }
}

function ensureAttachmentPreviewModal() {
  const existing = document.getElementById("attachment-preview-modal");
  if (existing) {
    existing.remove();
  }

  const modal = document.createElement("div");
  modal.id = "attachment-preview-modal";
  modal.className = "attachment-preview-modal";
  modal.innerHTML = `
    <div class="attachment-preview-mask" data-close="true"></div>
    <div class="attachment-preview-dialog" role="dialog" aria-modal="true" aria-label="附件预览">
      <div class="attachment-preview-toolbar">
        <strong>附件预览</strong>
        <div class="action-group">
          <a id="attachment-preview-open-link" class="btn ghost-btn" href="#" target="_blank" rel="noreferrer">新窗口打开</a>
          <button type="button" class="btn" data-close="true">关闭</button>
        </div>
      </div>
      <div id="attachment-preview-content" class="attachment-preview-content"></div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.addEventListener("click", (event) => {
    if (event.target?.dataset?.close === "true") {
      modal.classList.remove("is-open");
      document.body.classList.remove("attachment-preview-open");
      clearAttachmentPreviewFixBlobUrl();
    }
  });
}

async function openAttachmentPreview(url) {
  const safeUrl = sanitizeAttachmentUrl(url);
  if (!safeUrl) {
    showToast("附件地址无效，无法预览。");
    return;
  }

  const requestSeq = ++attachmentPreviewFixRequestSeq;
  ensureAttachmentPreviewModal();
  const modal = document.getElementById("attachment-preview-modal");
  const content = document.getElementById("attachment-preview-content");
  const openLink = document.getElementById("attachment-preview-open-link");
  if (!modal || !content || !openLink) {
    return;
  }

  openLink.href = safeUrl;
  content.innerHTML = `<div class="attachment-preview-fallback">正在加载附件预览...</div>`;
  const previewSource = await buildAttachmentPreviewSource(safeUrl);
  if (requestSeq !== attachmentPreviewFixRequestSeq) {
    return;
  }

  if (isImageUrl(safeUrl)) {
    content.innerHTML = `<img class="attachment-preview-image" src="${previewSource}" alt="附件图片预览">`;
  } else if (isPdfUrl(safeUrl)) {
    await renderPdfPreview(safeUrl, content, requestSeq);
  } else {
    content.innerHTML = `
      <div class="attachment-preview-fallback">
        该附件类型暂不支持内嵌预览，请使用上方“新窗口打开”查看。
      </div>
    `;
  }

  modal.classList.add("is-open");
  document.body.classList.add("attachment-preview-open");
}

function renderAttachmentLink(url, label = "查看附件") {
  const safeUrl = sanitizeAttachmentUrl(url);
  if (!safeUrl) {
    return "-";
  }
  if (isImageUrl(safeUrl) || isPdfUrl(safeUrl)) {
    return `
      <span class="attachment-actions attachment-action-group">
        <button type="button" class="attachment-action attachment-preview-trigger" data-url="${safeUrl}">
          <span class="attachment-action-icon">预览</span>
          <span>${label}</span>
        </button>
        <a class="attachment-action attachment-action-secondary" href="${safeUrl}" target="_blank" rel="noreferrer">
          <span class="attachment-action-icon">跳转</span>
          <span>新窗口打开</span>
        </a>
      </span>
    `;
  }
  return `
    <span class="attachment-actions attachment-action-group">
      <a class="attachment-action attachment-action-secondary" href="${safeUrl}" target="_blank" rel="noreferrer">
        <span class="attachment-action-icon">文件</span>
        <span>${label}</span>
      </a>
    </span>
  `;
}
