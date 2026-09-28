(function () {
  "use strict";

  const {
    compressImage,
    formatBytes,
    percentChange,
    extensionFor,
    baseName,
    detectWebpEncodeSupport,
    inputMimeType,
  } = window.ImageCompressor;

  // ---- Limits (stated to the visitor near the upload area) --------------
  const MAX_FILES = 40;
  const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30 MB per file
  const MAX_CONCURRENT = 1; // avoid exhausting memory when decoding large images

  // ---- Elements -----------------------------------------------------------
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("file-input");
  const chooseBtn = document.getElementById("choose-files-btn");
  const fileSelection = document.getElementById("file-selection");
  const qualitySlider = document.getElementById("quality-slider");
  const qualityValue = document.getElementById("quality-value");
  const formatRadios = document.querySelectorAll('input[name="output-format"]');
  const compressAllBtn = document.getElementById("compress-all-btn");
  const downloadAllBtn = document.getElementById("download-all-btn");
  const resetBtn = document.getElementById("reset-btn");
  const queueEl = document.getElementById("queue");
  const queueEmpty = document.getElementById("queue-empty");
  const queueSummary = document.getElementById("queue-summary");
  const summaryCount = document.getElementById("summary-count");
  const summarySavings = document.getElementById("summary-savings");
  const statusRegion = document.getElementById("status-region");
  const webpUnsupportedNote = document.getElementById("webp-unsupported-note");

  if (!dropzone) return; // not on the tool page

  let webpSupported = true;
  detectWebpEncodeSupport().then((supported) => {
    webpSupported = supported;
    if (!supported) {
      const webpRadio = document.getElementById("format-webp");
      if (webpRadio) {
        webpRadio.disabled = true;
        webpUnsupportedNote.hidden = false;
      }
    }
  });

  /** @type {Map<string, QueueItem>} */
  const items = new Map();
  let itemSeq = 0;

  function announce(message) {
    statusRegion.textContent = message;
  }

  function releaseItemUrls(item) {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    if (item.result && item.result.url) URL.revokeObjectURL(item.result.url);
    item.previewUrl = null;
  }

  function currentOptions() {
    const format = document.querySelector('input[name="output-format"]:checked').value;
    return {
      quality: Number(qualitySlider.value) / 100,
      outputFormat: format,
      maxDimension: 4096,
      webpSupported,
    };
  }

  qualitySlider.addEventListener("input", () => {
    qualityValue.textContent = `${qualitySlider.value}%`;
  });

  // ---- File intake ---------------------------------------------------------
  chooseBtn.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("click", (e) => {
    if (e.target === chooseBtn) return;
    fileInput.click();
  });
  fileInput.addEventListener("change", () => {
    showSelectedFiles(fileInput.files);
    handleFiles(fileInput.files);
    fileInput.value = "";
  });

  ["dragenter", "dragover"].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add("is-dragover");
    });
  });
  ["dragleave", "dragend"].forEach((evt) => {
    dropzone.addEventListener(evt, () => dropzone.classList.remove("is-dragover"));
  });
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("is-dragover");
    showSelectedFiles(e.dataTransfer.files);
    handleFiles(e.dataTransfer.files);
  });

  function showSelectedFiles(fileList) {
    const files = Array.from(fileList || []);
    fileSelection.textContent = files.length
      ? `Selected: ${files.map((file) => file.name).join(", ")}`
      : "No images selected.";
  }

  function handleFiles(fileList) {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    const roomLeft = MAX_FILES - items.size;
    if (roomLeft <= 0) {
      announce(`You've reached the ${MAX_FILES}-image limit for a single batch. Remove some images or download and reset before adding more.`);
      return;
    }

    let skippedForRoom = 0;
    const toAdd = incoming.slice(0, roomLeft);
    if (incoming.length > toAdd.length) skippedForRoom = incoming.length - toAdd.length;

    let added = 0;
    let rejected = 0;
    toAdd.forEach((file) => {
      const id = `img-${++itemSeq}`;
      const problem = validateFile(file);
      const item = {
        id,
        file,
        status: problem ? "error" : "pending",
        error: problem,
        result: null,
        previewUrl: null,
        progress: 0,
        showCompare: false,
      };
      items.set(id, item);
      if (problem) rejected += 1;
      else added += 1;
    });

    renderQueue();
    updateActionAvailability();

    const parts = [];
    if (added) parts.push(`${added} image${added === 1 ? "" : "s"} added`);
    if (rejected) parts.push(`${rejected} rejected`);
    if (skippedForRoom) parts.push(`${skippedForRoom} skipped (batch limit is ${MAX_FILES})`);
    if (parts.length) announce(parts.join(", ") + ".");
  }

  function validateFile(file) {
    if (!inputMimeType(file)) {
      return "Unsupported file type. Please use JPG, PNG, or WebP.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File is larger than the ${formatBytes(MAX_FILE_SIZE)} per-image limit.`;
    }
    if (file.size === 0) {
      return "This file appears to be empty or corrupted.";
    }
    return null;
  }

  // ---- Rendering -------------------------------------------------------
  function renderQueue() {
    queueEl.innerHTML = "";
    if (items.size === 0) {
      queueEmpty.hidden = false;
      queueSummary.hidden = true;
      return;
    }
    queueEmpty.hidden = true;

    for (const item of items.values()) {
      queueEl.appendChild(renderRow(item));
    }
    renderSummary();
  }

  function renderRow(item) {
    const row = document.createElement("div");
    row.className = "file-row" + (item.status === "error" ? " has-error" : "");
    row.dataset.id = item.id;

    const thumbWrap = document.createElement("img");
    thumbWrap.className = "file-thumb";
    thumbWrap.alt = "";
    thumbWrap.loading = "lazy";
    if (inputMimeType(item.file)) {
      item.previewUrl = item.previewUrl || URL.createObjectURL(item.file);
      thumbWrap.src = item.previewUrl;
    }

    const meta = document.createElement("div");
    meta.className = "file-meta";

    const name = document.createElement("div");
    name.className = "file-name";
    name.title = item.file.name;
    name.textContent = item.file.name;
    meta.appendChild(name);

    const stats = document.createElement("div");
    stats.className = "file-stats";
    meta.appendChild(stats);

    const progress = document.createElement("div");
    progress.className = "file-progress";
    const progressBar = document.createElement("span");
    progress.appendChild(progressBar);

    const statusLine = document.createElement("div");
    statusLine.className = "file-status" + (item.status === "error" ? " is-error" : "");

    if (item.status === "error") {
      statusLine.textContent = item.error;
      stats.innerHTML = `<span>${formatBytes(item.file.size)}</span>`;
    } else if (item.status === "pending") {
      statusLine.textContent = "Waiting to compress";
      stats.innerHTML = `<span>${formatBytes(item.file.size)}</span>`;
    } else if (item.status === "processing") {
      statusLine.textContent = "Compressing…";
      meta.appendChild(progress);
      progressBar.style.width = `${item.progress}%`;
      stats.innerHTML = `<span>${formatBytes(item.file.size)}</span>`;
    } else if (item.status === "done") {
      const r = item.result;
      const pct = percentChange(r.originalSize, r.compressedSize);
      const savingsClass = pct >= 0 ? "savings" : "savings is-negative";
      stats.innerHTML = `
        <span>${formatBytes(r.originalSize)} → ${formatBytes(r.compressedSize)}</span>
        <span class="${savingsClass}">${pct >= 0 ? "−" : "+"}${Math.abs(pct).toFixed(0)}%</span>
        <span>${r.mimeType.replace("image/", "").toUpperCase()}</span>
        <span>${r.width}×${r.height}px</span>
      `;
      statusLine.textContent = r.note ? r.note : "Done";
    } else if (item.status === "failed") {
      statusLine.className = "file-status is-error";
      statusLine.textContent = item.error || "Something went wrong compressing this image.";
      stats.innerHTML = `<span>${formatBytes(item.file.size)}</span>`;
    }

    meta.appendChild(statusLine);

    const actions = document.createElement("div");
    actions.className = "file-actions";

    if (item.status === "done") {
      const dlBtn = document.createElement("a");
      dlBtn.className = "btn btn-secondary btn-sm";
      dlBtn.href = item.result.url;
      const ext = extensionFor(item.result.mimeType);
      dlBtn.download = `${baseName(item.file.name)}-compressed.${ext}`;
      dlBtn.textContent = "Download";
      actions.appendChild(dlBtn);

      const compareBtn = document.createElement("button");
      compareBtn.type = "button";
      compareBtn.className = "btn btn-ghost btn-sm file-preview-toggle";
      compareBtn.textContent = item.showCompare ? "Hide preview" : "Before / after";
      compareBtn.setAttribute("aria-expanded", String(item.showCompare));
      compareBtn.addEventListener("click", () => {
        item.showCompare = !item.showCompare;
        renderQueue();
      });
      actions.appendChild(compareBtn);
    }

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn btn-ghost btn-sm";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      releaseItemUrls(item);
      items.delete(item.id);
      renderQueue();
      updateActionAvailability();
      announce(`${item.file.name} removed.`);
    });
    actions.appendChild(removeBtn);

    row.appendChild(thumbWrap);
    row.appendChild(meta);
    row.appendChild(actions);

    if (item.status === "done" && item.showCompare) {
      row.appendChild(renderCompare(item));
    }

    return row;
  }

  function renderCompare(item) {
    const wrap = document.createElement("div");
    wrap.className = "compare";
    const grid = document.createElement("div");
    grid.className = "compare-grid";

    const before = document.createElement("figure");
    before.className = "compare-cell";
    const beforeImg = document.createElement("img");
    beforeImg.src = item.previewUrl;
    beforeImg.alt = `Original version of ${item.file.name}`;
    const beforeCap = document.createElement("figcaption");
    beforeCap.textContent = `Before — ${formatBytes(item.result.originalSize)}`;
    before.appendChild(beforeImg);
    before.appendChild(beforeCap);

    const after = document.createElement("figure");
    after.className = "compare-cell";
    const afterImg = document.createElement("img");
    afterImg.src = item.result.url;
    afterImg.alt = `Compressed version of ${item.file.name}`;
    const afterCap = document.createElement("figcaption");
    afterCap.textContent = `After — ${formatBytes(item.result.compressedSize)}`;
    after.appendChild(afterImg);
    after.appendChild(afterCap);

    grid.appendChild(before);
    grid.appendChild(after);
    wrap.appendChild(grid);
    return wrap;
  }

  function renderSummary() {
    const done = Array.from(items.values()).filter((i) => i.status === "done");
    if (!done.length) {
      queueSummary.hidden = true;
      return;
    }
    queueSummary.hidden = false;
    const totalOriginal = done.reduce((sum, i) => sum + i.result.originalSize, 0);
    const totalCompressed = done.reduce((sum, i) => sum + i.result.compressedSize, 0);
    const pct = percentChange(totalOriginal, totalCompressed);
    summaryCount.textContent = `${done.length} of ${items.size} image${items.size === 1 ? "" : "s"} compressed`;
    summarySavings.textContent =
      totalOriginal > 0
        ? `${formatBytes(totalOriginal)} → ${formatBytes(totalCompressed)} (${pct >= 0 ? "−" : "+"}${Math.abs(pct).toFixed(0)}%)`
        : "";
  }

  function updateActionAvailability() {
    const hasCompressable = Array.from(items.values()).some((i) => i.status !== "error");
    const hasDone = Array.from(items.values()).some((i) => i.status === "done");
    compressAllBtn.disabled = !hasCompressable;
    downloadAllBtn.disabled = !hasDone;
    resetBtn.disabled = items.size === 0;
  }

  function updateRow(id) {
    const row = queueEl.querySelector(`[data-id="${CSS.escape(id)}"]`);
    const item = items.get(id);
    if (!row || !item) return;
    const replacement = renderRow(item);
    row.replaceWith(replacement);
    renderSummary();
    updateActionAvailability();
  }

  // ---- Compression run ---------------------------------------------------
  compressAllBtn.addEventListener("click", async () => {
    const options = currentOptions();
    const queue = Array.from(items.values()).filter(
      (i) => i.status === "pending" || i.status === "failed" || i.status === "done"
    );
    if (!queue.length) return;

    compressAllBtn.disabled = true;
    announce(`Compressing ${queue.length} image${queue.length === 1 ? "" : "s"}…`);

    let cursor = 0;
    async function worker() {
      while (cursor < queue.length) {
        const item = queue[cursor++];
        item.status = "processing";
        item.progress = 0;
        updateRow(item.id);
        try {
          const result = await compressImage(item.file, {
            ...options,
            onProgress: (p) => {
              item.progress = p;
              const row = queueEl.querySelector(`[data-id="${CSS.escape(item.id)}"]`);
              const bar = row && row.querySelector(".file-progress > span");
              if (bar) bar.style.width = `${p}%`;
            },
          });
          if (item.result && item.result.url) URL.revokeObjectURL(item.result.url);
          item.result = result;
          item.status = "done";
        } catch (err) {
          item.status = "failed";
          item.error = err && err.message ? err.message : "Compression failed for this image.";
        }
        updateRow(item.id);
      }
    }

    const workers = Array.from({ length: Math.min(MAX_CONCURRENT, queue.length) }, worker);
    await Promise.all(workers);

    compressAllBtn.disabled = false;
    updateActionAvailability();
    const doneCount = Array.from(items.values()).filter((i) => i.status === "done").length;
    announce(`Finished. ${doneCount} of ${items.size} image${items.size === 1 ? "" : "s"} compressed successfully.`);
  });

  // ---- Download all (ZIP when available) --------------------------------
  downloadAllBtn.addEventListener("click", async () => {
    const done = Array.from(items.values()).filter((i) => i.status === "done");
    if (!done.length) return;

    if (typeof window.JSZip === "undefined") {
      announce("ZIP packaging isn't available right now, so each image will download separately.");
      done.forEach((item, idx) => setTimeout(() => triggerDownload(item), idx * 150));
      return;
    }

    downloadAllBtn.disabled = true;
    downloadAllBtn.textContent = "Zipping…";
    try {
      const zip = new window.JSZip();
      const usedNames = new Set();
      for (const item of done) {
        const ext = extensionFor(item.result.mimeType);
        let name = `${baseName(item.file.name)}-compressed.${ext}`;
        let n = 1;
        while (usedNames.has(name)) {
          name = `${baseName(item.file.name)}-compressed-${n++}.${ext}`;
        }
        usedNames.add(name);
        zip.file(name, item.result.blob);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "compressed-images.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      announce(`Downloaded a ZIP with ${done.length} compressed image${done.length === 1 ? "" : "s"}.`);
    } catch (e) {
      announce("Couldn't build a ZIP file. Downloading images separately instead.");
      done.forEach((item, idx) => setTimeout(() => triggerDownload(item), idx * 150));
    } finally {
      downloadAllBtn.disabled = false;
      downloadAllBtn.textContent = "Download all";
    }
  });

  function triggerDownload(item) {
    const ext = extensionFor(item.result.mimeType);
    const a = document.createElement("a");
    a.href = item.result.url;
    a.download = `${baseName(item.file.name)}-compressed.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // ---- Reset ---------------------------------------------------------------
  resetBtn.addEventListener("click", () => {
    for (const item of items.values()) {
      releaseItemUrls(item);
    }
    items.clear();
    renderQueue();
    updateActionAvailability();
    announce("All images cleared.");
  });

  // Revoke object URLs on unload as a courtesy (best-effort; browsers also
  // clean these up automatically when the page is torn down).
  window.addEventListener("beforeunload", () => {
    for (const item of items.values()) {
      releaseItemUrls(item);
    }
  });

  updateActionAvailability();
})();
