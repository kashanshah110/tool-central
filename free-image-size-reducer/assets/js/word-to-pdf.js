(function () {
  "use strict";

  const fileInput = document.getElementById("word-file");
  if (!fileInput) return;

  const previewButton = document.getElementById("preview-word");
  const downloadButton = document.getElementById("download-word-pdf");
  const fileSelection = document.getElementById("word-file-selection");
  const status = document.getElementById("word-pdf-status");
  const previewWrap = document.getElementById("word-preview-wrap");
  const preview = document.getElementById("word-preview");
  const allowedTags = new Set([
    "P", "H1", "H2", "H3", "H4", "BLOCKQUOTE", "UL", "OL", "LI", "TABLE",
    "THEAD", "TBODY", "TR", "TH", "TD", "STRONG", "B", "EM", "I", "U", "S",
    "SUB", "SUP", "BR", "HR", "IMG", "A", "SPAN", "DIV",
  ]);
  const maxFileSize = 50 * 1024 * 1024;

  function report(message, isError) {
    status.textContent = message;
    status.classList.toggle("is-error", Boolean(isError));
  }

  fileInput.addEventListener("change", () => {
    fileSelection.textContent = fileInput.files.length
      ? `Selected: ${fileInput.files[0].name}`
      : "No Word document selected.";
    preview.replaceChildren();
    previewWrap.hidden = true;
    downloadButton.disabled = true;
    report("", false);
  });

  function safeNode(source, destinationDocument) {
    if (source.nodeType === Node.TEXT_NODE) {
      return destinationDocument.createTextNode(source.textContent);
    }
    if (source.nodeType !== Node.ELEMENT_NODE) return null;

    const tag = source.tagName.toUpperCase();
    if (["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "SVG", "MATH"].includes(tag)) return null;
    const safeTag = allowedTags.has(tag) ? tag.toLowerCase() : "span";
    const element = destinationDocument.createElement(safeTag);

    if (tag === "IMG") {
      const src = source.getAttribute("src") || "";
      if (!/^data:image\/(?:png|jpeg|gif|webp);base64,/i.test(src) || src.length > 12_000_000) {
        return null;
      }
      element.setAttribute("src", src);
      const alt = source.getAttribute("alt");
      if (alt) element.setAttribute("alt", alt.slice(0, 500));
    } else if (tag === "A") {
      const href = source.getAttribute("href") || "";
      if (/^(?:https?:|mailto:)/i.test(href)) {
        element.setAttribute("href", href);
        element.setAttribute("rel", "noreferrer");
      }
    }

    for (const child of source.childNodes) {
      const sanitizedChild = safeNode(child, destinationDocument);
      if (sanitizedChild) element.append(sanitizedChild);
    }
    return element;
  }

  previewButton.addEventListener("click", async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) {
      report("Choose a .docx file first.", true);
      return;
    }
    if (file.size > maxFileSize) {
      report("This Word document is larger than the 50 MB browser-processing limit.", true);
      return;
    }
    if (!window.mammoth) {
      report("The Word conversion library could not load. Check your connection and reload this page.", true);
      return;
    }

    previewButton.disabled = true;
    downloadButton.disabled = true;
    report("Reading Word document…", false);
    try {
      const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
      const parsed = new DOMParser().parseFromString(result.value, "text/html");
      const safeContent = document.createDocumentFragment();
      for (const node of parsed.body.childNodes) {
        const sanitizedNode = safeNode(node, document);
        if (sanitizedNode) safeContent.append(sanitizedNode);
      }
      if (!safeContent.childNodes.length || !previewText(safeContent).trim()) {
        throw new Error("No readable document content was found in this file.");
      }
      preview.replaceChildren(safeContent);
      previewWrap.hidden = false;
      downloadButton.disabled = false;
      report(result.messages.length
        ? "Preview ready. Some advanced formatting could not be converted."
        : "Preview ready. Download your PDF when you're satisfied with the result.", false);
    } catch (error) {
      preview.replaceChildren();
      previewWrap.hidden = true;
      report(error instanceof Error ? error.message : "Could not read this Word document.", true);
    } finally {
      previewButton.disabled = false;
    }
  });

  function previewText(fragment) {
    return Array.from(fragment.childNodes).map((node) => node.textContent || "").join("");
  }

  downloadButton.addEventListener("click", async () => {
    if (previewWrap.hidden) return;
    if (typeof window.html2pdf !== "function") {
      report("The PDF download library could not load. Check your connection and reload this page.", true);
      return;
    }
    const file = fileInput.files && fileInput.files[0];
    const fileName = file ? file.name.replace(/\.docx$/i, "") : "document";
    downloadButton.disabled = true;
    report("Creating your PDF…", false);
    try {
      await window.html2pdf()
        .set({
          filename: `${fileName}.pdf`,
          margin: [10, 10, 10, 10],
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"] },
        })
        .from(preview)
        .save();
      report("PDF downloaded. Check the file to confirm its formatting.", false);
    } catch (error) {
      report(error instanceof Error ? `Could not create the PDF: ${error.message}` : "Could not create the PDF.", true);
    } finally {
      downloadButton.disabled = false;
    }
  });
})();
