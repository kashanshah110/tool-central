(function () {
  "use strict";

  const fileInput = document.getElementById("pdf-file");
  if (!fileInput) return;
  const button = document.getElementById("convert-pdf");
  const status = document.getElementById("pdf-word-status");
  const fileSelection = document.getElementById("pdf-file-selection");
  const maxFileSize = 100 * 1024 * 1024;
  const maxPages = 500;

  function report(message, isError) {
    status.textContent = message;
    status.classList.toggle("is-error", Boolean(isError));
  }

  fileInput.addEventListener("change", () => {
    fileSelection.textContent = fileInput.files.length
      ? `Selected: ${fileInput.files[0].name}`
      : "No PDF selected.";
  });

  function xmlEscape(value) {
    return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }

  function makeParagraph(text) {
    return `<w:p><w:r><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p>`;
  }

  function makeDocx(pages) {
    const pageMarkup = pages.map((lines, index) => {
      const content = lines.length ? lines.map(makeParagraph).join("") : makeParagraph("");
      if (index === 0) return content;
      return `<w:p><w:r><w:br w:type="page"/></w:r></w:p>${content}`;
    }).join("");
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${pageMarkup}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`;
    const archive = new JSZip();
    archive.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
    archive.folder("_rels").file(".rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
    archive.folder("word").file("document.xml", documentXml);
    return archive.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
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

  button.addEventListener("click", async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) {
      report("Choose a PDF file first.", true);
      return;
    }
    if (file.size > maxFileSize) {
      report("This PDF is larger than the 100 MB browser-processing limit.", true);
      return;
    }
    if (!window.pdfjsLib || !window.JSZip) {
      report("A required PDF/ZIP library could not load. Check your connection and reload this page.", true);
      return;
    }

    button.disabled = true;
    report("Extracting selectable text…", false);
    try {
      const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(await file.arrayBuffer()),
        disableWorker: true,
      }).promise;
      if (pdf.numPages > maxPages) {
        await pdf.destroy();
        throw new Error(`This PDF has more than ${maxPages} pages, the browser-processing limit.`);
      }
      const pages = [];
      let extractedCharacters = 0;
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        report(`Extracting text from page ${pageNumber} of ${pdf.numPages}…`, false);
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const lines = [];
        let line = "";
        let previousY = null;
        for (const item of content.items) {
          if (typeof item.str !== "string") continue;
          const y = Array.isArray(item.transform) ? item.transform[5] : null;
          if (line && y !== null && previousY !== null && Math.abs(y - previousY) > 3) {
            lines.push(line.trimEnd());
            line = "";
          } else if (line && !/\s$/.test(line) && !/^\s/.test(item.str)) {
            line += " ";
          }
          line += item.str;
          previousY = y;
          if (item.hasEOL) {
            lines.push(line.trimEnd());
            line = "";
            previousY = null;
          }
        }
        if (line.trim()) lines.push(line.trimEnd());
        extractedCharacters += lines.join("").length;
        pages.push(lines.filter((text) => text.trim()));
        page.cleanup();
      }
      if (extractedCharacters === 0) {
        throw new Error("No selectable text was found. This may be a scanned PDF; run OCR before converting it.");
      }
      const blob = await makeDocx(pages);
      download(blob, `${file.name.replace(/\.pdf$/i, "") || "document"}_text.docx`);
      report(`Done. Extracted text from ${pdf.numPages} pages. Layout, images, and tables are not preserved.`, false);
      await pdf.destroy();
    } catch (error) {
      report(error instanceof Error ? error.message : "Could not convert this PDF.", true);
    } finally {
      button.disabled = false;
    }
  });
})();
