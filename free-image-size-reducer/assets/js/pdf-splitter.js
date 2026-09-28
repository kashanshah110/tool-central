(function () {
  "use strict";

  const fileInput = document.getElementById("pdf-file");
  if (!fileInput) return;

  const rangesInput = document.getElementById("page-ranges");
  const pageCountLabel = document.getElementById("page-count");
  const status = document.getElementById("split-status");
  const splitButton = document.getElementById("split-pdf");
  const fileSelection = document.getElementById("pdf-file-selection");
  let pageCount = 0;
  const maxFileSize = 100 * 1024 * 1024;

  function report(message, isError) {
    status.textContent = message;
    status.classList.toggle("is-error", Boolean(isError));
  }

  function safeBaseName(filename) {
    return filename.replace(/\.pdf$/i, "").replace(/[^\w.-]+/g, "_") || "document";
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function parseRanges(text, totalPages) {
    const pages = [];
    const tokens = text.split(",").map((token) => token.trim());
    if (!tokens.length || tokens.some((token) => !token)) {
      throw new Error("Enter page numbers or ranges, such as 1-3, 5.");
    }
    for (const token of tokens) {
      const match = token.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
      if (!match) throw new Error(`Invalid page range: "${token}". Use values like 2 or 2-5.`);
      const start = Number(match[1]);
      const end = Number(match[2] || match[1]);
      if (start < 1 || end < start || end > totalPages) {
        throw new Error(`Page range "${token}" is outside this PDF's 1–${totalPages} page range.`);
      }
      for (let page = start; page <= end; page += 1) pages.push(page - 1);
    }
    if (new Set(pages).size !== pages.length) {
      throw new Error("Page ranges overlap. List each page only once.");
    }
    return pages;
  }

  fileInput.addEventListener("change", async () => {
    fileSelection.textContent = fileInput.files.length
      ? `Selected: ${fileInput.files[0].name}`
      : "No PDF selected.";
    pageCount = 0;
    rangesInput.value = "";
    if (!fileInput.files.length) {
      pageCountLabel.textContent = "Enter page numbers and ranges separated by commas. Pages are numbered from 1.";
      return;
    }
    const file = fileInput.files[0];
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      report("Choose a PDF file.", true);
      return;
    }
    if (file.size > maxFileSize) {
      report("This PDF is larger than the 100 MB browser-processing limit.", true);
      return;
    }
    if (!window.PDFLib) {
      report("The PDF library could not load. Check your connection and reload this page.", true);
      return;
    }
    report("Reading PDF page count…", false);
    try {
      const document = await PDFLib.PDFDocument.load(await file.arrayBuffer());
      pageCount = document.getPageCount();
      pageCountLabel.textContent = `${pageCount} page${pageCount === 1 ? "" : "s"} detected.`;
      report("PDF ready.", false);
    } catch (error) {
      report("Could not read this PDF. It may be damaged or password-protected.", true);
      pageCountLabel.textContent = "Could not read the PDF page count.";
    }
  });

  splitButton.addEventListener("click", async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) {
      report("Choose a PDF file first.", true);
      return;
    }
    if (file.size > maxFileSize) {
      report("This PDF is larger than the 100 MB browser-processing limit.", true);
      return;
    }
    if (!window.PDFLib || !window.JSZip) {
      report("A required PDF/ZIP library could not load. Check your connection and reload this page.", true);
      return;
    }

    splitButton.disabled = true;
    report("Preparing selected pages…", false);
    try {
      const source = await PDFLib.PDFDocument.load(await file.arrayBuffer());
      pageCount = source.getPageCount();
      const pages = parseRanges(rangesInput.value, pageCount);
      const baseName = safeBaseName(file.name);
      const mode = document.querySelector('input[name="split-mode"]:checked').value;

      if (mode === "combined") {
        const result = await PDFLib.PDFDocument.create();
        const copiedPages = await result.copyPages(source, pages);
        copiedPages.forEach((page) => result.addPage(page));
        download(new Blob([await result.save()], { type: "application/pdf" }), `${baseName}_pages.pdf`);
      } else {
        const archive = new JSZip();
        for (const pageIndex of pages) {
          const result = await PDFLib.PDFDocument.create();
          const [copiedPage] = await result.copyPages(source, [pageIndex]);
          result.addPage(copiedPage);
          archive.file(`${baseName}_page_${pageIndex + 1}.pdf`, await result.save());
        }
        const blob = await archive.generateAsync({ type: "blob" });
        download(blob, `${baseName}_pages.zip`);
      }
      report(`Done. Extracted ${pages.length} page${pages.length === 1 ? "" : "s"}.`, false);
    } catch (error) {
      report(error instanceof Error ? error.message : "Could not split this PDF.", true);
    } finally {
      splitButton.disabled = false;
    }
  });
})();
