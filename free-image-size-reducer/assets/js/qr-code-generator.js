(function () {
  "use strict";

  const form = document.getElementById("qr-form");
  if (!form) return;

  const typeSelect = document.getElementById("qr-type");
  const fieldGroups = document.querySelectorAll("[data-qr-fields]");
  const wifiSecurity = document.getElementById("wifi-security");
  const wifiPasswordField = document.getElementById("wifi-password-field");
  const marginInput = document.getElementById("qr-margin");
  const marginValue = document.getElementById("qr-margin-value");
  const preview = document.getElementById("qr-preview");
  const emptyPreview = document.getElementById("qr-empty");
  const textInput = document.getElementById("qr-text");
  const textError = document.getElementById("qr-text-error");
  const outputSize = document.getElementById("qr-output-size");
  const status = document.getElementById("qr-status");
  const downloadPngButton = document.getElementById("download-png");
  const downloadSvgButton = document.getElementById("download-svg");
  const copyPngButton = document.getElementById("copy-png");
  const copyDataButton = document.getElementById("copy-data");
  const resetButton = document.getElementById("reset-qr");

  let currentPngBlob = null;
  let currentSvg = "";
  let currentPayload = "";

  function valueOf(id) {
    return document.getElementById(id).value.trim();
  }

  function escapeWifi(value) {
    return value.replace(/([\\;,:"])/g, "\\$1");
  }

  function escapeVCard(value) {
    return value
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/([;,])/g, "\\$1");
  }

  function cleanPhone(value) {
    return value.replace(/[^\d+*#,;]/g, "");
  }

  function isValidPhone(value) {
    return /^\+?[\d*#][\d*#;,]*$/.test(value) && /\d/.test(value);
  }

  function requiredValue(id, label) {
    const value = valueOf(id);
    if (!value) throw new Error(`${label} is required.`);
    return value;
  }

  function buildPayload() {
    switch (typeSelect.value) {
      case "text": {
        const text = document.getElementById("qr-text").value.trim();
        if (!text) throw new Error("Enter the text or web address for your QR code.");
        if (text.length > 2500) throw new Error("Text is too long. Use 2,500 characters or fewer.");
        if (/^(?:https?:\/\/)?(?:www\.)?[^.\s]+\.[^\s]+$/i.test(text)) {
          const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
          if (url.protocol !== "http:" && url.protocol !== "https:") {
            throw new Error("Enter a valid web address beginning with http:// or https://.");
          }
          return url.href;
        }
        return text;
      }
      case "wifi": {
        const name = requiredValue("wifi-name", "Network name");
        const security = wifiSecurity.value;
        const password = valueOf("wifi-password");
        if (security !== "nopass" && !password) {
          throw new Error("Enter the password for this secured Wi-Fi network.");
        }
        const hidden = document.getElementById("wifi-hidden").checked ? "true" : "false";
        const passwordPart = security === "nopass" ? "" : `P:${escapeWifi(password)};`;
        return `WIFI:T:${security};S:${escapeWifi(name)};${passwordPart}H:${hidden};;`;
      }
      case "contact": {
        const name = requiredValue("contact-name", "Full name");
        const lines = [
          "BEGIN:VCARD",
          "VERSION:3.0",
          `FN:${escapeVCard(name)}`,
          `N:${escapeVCard(name)};;;;`,
        ];
        const organization = valueOf("contact-organization");
        const phone = valueOf("contact-phone");
        const email = valueOf("contact-email");
        const url = valueOf("contact-url");
        if (organization) lines.push(`ORG:${escapeVCard(organization)}`);
        if (phone) lines.push(`TEL;TYPE=CELL:${escapeVCard(phone)}`);
        if (email) {
          const input = document.getElementById("contact-email");
          if (!input.checkValidity()) throw new Error("Enter a valid contact email address.");
          lines.push(`EMAIL:${escapeVCard(email)}`);
        }
        if (url) {
          const input = document.getElementById("contact-url");
          if (!input.checkValidity()) throw new Error("Enter a valid contact website address.");
          lines.push(`URL:${escapeVCard(url)}`);
        }
        lines.push("END:VCARD");
        return lines.join("\r\n");
      }
      case "email": {
        const email = requiredValue("email-to", "Email address");
        if (!document.getElementById("email-to").checkValidity()) {
          throw new Error("Enter a valid email address.");
        }
        const query = new URLSearchParams();
        const subject = valueOf("email-subject");
        const body = document.getElementById("email-body").value.trim();
        if (subject) query.set("subject", subject);
        if (body) query.set("body", body);
        const queryString = query.toString();
        const suffix = queryString ? `?${queryString}` : "";
        return `mailto:${email}${suffix}`;
      }
      case "phone": {
        const phone = cleanPhone(requiredValue("phone-number", "Phone number"));
        if (!isValidPhone(phone)) throw new Error("Enter a valid phone number.");
        return `tel:${phone}`;
      }
      case "sms": {
        const phone = cleanPhone(requiredValue("sms-number", "Phone number"));
        const message = requiredValue("sms-message", "Text message");
        if (!isValidPhone(phone)) throw new Error("Enter a valid phone number.");
        return `SMSTO:${phone}:${message}`;
      }
      default:
        throw new Error("Choose a supported QR code content type.");
    }
  }

  function makeSvg(qr, margin, foreground, background, requestedSize) {
    const count = qr.getModuleCount();
    const gridSize = count + margin * 2;
    let pathData = "";
    for (let row = 0; row < count; row += 1) {
      for (let col = 0; col < count; col += 1) {
        if (qr.isDark(row, col)) {
          const x = col + margin;
          const y = row + margin;
          pathData += `M${x},${y}h1v1h-1z`;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${requestedSize}" height="${requestedSize}" viewBox="0 0 ${gridSize} ${gridSize}" role="img" aria-label="Generated QR code" shape-rendering="crispEdges"><rect width="${gridSize}" height="${gridSize}" fill="${background}"/><path fill="${foreground}" d="${pathData}"/></svg>`;
  }

  function makePng(qr, margin, foreground, background, requestedSize) {
    const count = qr.getModuleCount();
    const gridSize = count + margin * 2;
    if (requestedSize < gridSize) {
      throw new Error("This QR code is too dense for the selected image size. Choose a larger size or use shorter content.");
    }
    const source = document.createElement("canvas");
    source.width = gridSize;
    source.height = gridSize;
    const sourceContext = source.getContext("2d");
    if (!sourceContext) throw new Error("This browser could not create a QR image.");
    sourceContext.fillStyle = background;
    sourceContext.fillRect(0, 0, gridSize, gridSize);
    sourceContext.fillStyle = foreground;
    for (let row = 0; row < count; row += 1) {
      for (let col = 0; col < count; col += 1) {
        if (qr.isDark(row, col)) {
          sourceContext.fillRect(col + margin, row + margin, 1, 1);
        }
      }
    }
    const canvas = document.createElement("canvas");
    canvas.width = requestedSize;
    canvas.height = requestedSize;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser could not create a QR image.");
    context.imageSmoothingEnabled = false;
    context.drawImage(source, 0, 0, requestedSize, requestedSize);
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve({ blob, pixels: requestedSize });
        else reject(new Error("This browser could not export the QR code as PNG."));
      }, "image/png");
    });
  }

  function showStatus(message, isError) {
    status.textContent = message;
    status.classList.toggle("is-error", Boolean(isError));
  }

  function clearGeneratedCode() {
    currentPngBlob = null;
    currentSvg = "";
    currentPayload = "";
    preview.replaceChildren(emptyPreview);
    emptyPreview.hidden = false;
    outputSize.hidden = true;
    downloadPngButton.disabled = true;
    downloadSvgButton.disabled = true;
    copyPngButton.disabled = true;
    copyDataButton.disabled = true;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function updateTypeFields() {
    fieldGroups.forEach((group) => {
      group.hidden = group.dataset.qrFields !== typeSelect.value;
    });
    if (typeSelect.value === "wifi") updateWifiFields();
    clearGeneratedCode();
    showStatus("", false);
  }

  function updateWifiFields() {
    const passwordRequired = wifiSecurity.value !== "nopass";
    wifiPasswordField.hidden = !passwordRequired;
    document.getElementById("wifi-password").disabled = !passwordRequired;
  }

  typeSelect.addEventListener("change", updateTypeFields);
  wifiSecurity.addEventListener("change", updateWifiFields);
  marginInput.addEventListener("input", () => {
    const margin = Number(marginInput.value);
    marginValue.textContent = `${margin} ${margin === 1 ? "module" : "modules"}`;
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearGeneratedCode();
    showStatus("", false);
    textError.textContent = "";

    if (typeof window.qrcode !== "function") {
      showStatus("The QR encoder could not load. Check your connection and reload the page.", true);
      return;
    }

    if (typeSelect.value === "text" && !textInput.value.trim()) {
      const message = "Enter the text or web address for your QR code.";
      textError.textContent = message;
      showStatus(message, true);
      textInput.focus();
      textInput.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    try {
      const payload = buildPayload();
      if (typeof TextEncoder !== "function") {
        throw new Error("This browser does not support UTF-8 QR code text encoding.");
      }
      window.qrcode.stringToBytes = (text) =>
        Array.from(new TextEncoder().encode(text));
      const foreground = document.getElementById("qr-foreground").value;
      const background = document.getElementById("qr-background").value;
      const margin = Number(marginInput.value);
      const requestedSize = Number(document.getElementById("qr-size").value);
      const correction = document.getElementById("qr-error-correction").value;
      const qr = window.qrcode(0, correction);
      qr.addData(payload);
      qr.make();

      const svg = makeSvg(qr, margin, foreground, background, requestedSize);
      const png = await makePng(qr, margin, foreground, background, requestedSize);
      const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
      const image = document.createElement("img");
      image.className = "qr-preview-image";
      image.src = svgUrl;
      image.alt = "Generated QR code";
      preview.replaceChildren(image);
      setTimeout(() => URL.revokeObjectURL(svgUrl), 60000);

      currentPngBlob = png.blob;
      currentSvg = svg;
      currentPayload = payload;
      emptyPreview.hidden = true;
      outputSize.textContent = `PNG size: ${png.pixels} × ${png.pixels} px`;
      outputSize.hidden = false;
      downloadPngButton.disabled = false;
      downloadSvgButton.disabled = false;
      copyPngButton.disabled = false;
      copyDataButton.disabled = false;
      showStatus(
        margin < 4
          ? "QR code generated. A quiet-zone margin of at least 4 modules is recommended for scanning."
          : "QR code generated. Test it with a phone camera before sharing or printing.",
        false
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not generate this QR code. Try shorter content or a lower error-correction level.";
      if (typeSelect.value === "text" && !textInput.value.trim()) {
        textError.textContent = message;
        textInput.focus();
        textInput.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      showStatus(message, true);
    }
  });

  textInput.addEventListener("input", () => {
    if (textInput.value.trim()) textError.textContent = "";
  });

  downloadPngButton.addEventListener("click", () => {
    if (!currentPngBlob) return;
    downloadBlob(currentPngBlob, "qr-code.png");
  });

  downloadSvgButton.addEventListener("click", () => {
    if (!currentSvg) return;
    downloadBlob(new Blob([currentSvg], { type: "image/svg+xml;charset=utf-8" }), "qr-code.svg");
  });

  copyPngButton.addEventListener("click", async () => {
    if (!currentPngBlob) return;
    if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
      showStatus("Copying images is not supported in this browser. Download the PNG instead.", true);
      return;
    }
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": currentPngBlob }),
      ]);
      showStatus("QR code image copied to the clipboard.", false);
    } catch (error) {
      showStatus("Could not copy the image. Check clipboard permissions or download the PNG instead.", true);
    }
  });

  copyDataButton.addEventListener("click", async () => {
    if (!currentPayload) return;
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
      showStatus("Copying text is not supported here. Select the content in the form to copy it.", true);
      return;
    }
    try {
      await navigator.clipboard.writeText(currentPayload);
      showStatus("QR code content copied to the clipboard.", false);
    } catch (error) {
      showStatus("Could not copy the content. Check clipboard permissions.", true);
    }
  });

  resetButton.addEventListener("click", () => {
    form.reset();
    fieldGroups.forEach((group) => {
      group.hidden = group.dataset.qrFields !== typeSelect.value;
    });
    updateWifiFields();
    marginValue.textContent = "4 modules";
    clearGeneratedCode();
    showStatus("QR code cleared.", false);
  });

  updateWifiFields();
})();
