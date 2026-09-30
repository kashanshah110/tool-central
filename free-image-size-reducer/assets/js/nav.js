(function () {
  "use strict";

  if (window.toolCentralNavigationReady) return;
  window.toolCentralNavigationReady = true;

  function closeMenu() {
    const toggle = document.querySelector(".nav-toggle");
    const links = document.querySelector(".nav-links");
    if (!toggle || !links) return;

    links.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }

  function updateCurrentNavigation() {
    const pathname = new URL(location.href).pathname;
    const currentFile = pathname.slice(pathname.lastIndexOf("/") + 1) || "index.html";
    const links = document.querySelectorAll(".nav-links a");
    links.forEach((link) => {
      const linkFile = new URL(link.href, location.href).pathname.split("/").pop();
      const calculatorPage = /^(age|scientific|bmi|percentage)-calculator\.html$/.test(currentFile);
      const documentPage = /^(pdf-splitter|pdf-to-word|word-to-pdf|ppt-size-reducer)\.html$/.test(currentFile);
      const active = linkFile === currentFile ||
        (linkFile === "index.html" && currentFile === "") ||
        (linkFile === "calculator-tools.html" && calculatorPage) ||
        (linkFile === "document-tools.html" && documentPage);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function copyHead(nextDocument) {
    const nextMeta = Array.from(nextDocument.head.querySelectorAll("meta[name], meta[property]"));
    const currentMeta = Array.from(document.head.querySelectorAll("meta[name], meta[property]"));

    currentMeta.forEach((meta) => {
      const attribute = meta.hasAttribute("name") ? "name" : "property";
      const key = meta.getAttribute(attribute);
      if (!nextMeta.some((item) => item.hasAttribute(attribute) && item.getAttribute(attribute) === key)) {
        meta.remove();
      }
    });

    nextMeta.forEach((meta) => {
      const attribute = meta.hasAttribute("name") ? "name" : "property";
      const key = meta.getAttribute(attribute);
      const current = currentMeta.find((item) => item.hasAttribute(attribute) && item.getAttribute(attribute) === key);
      if (current) {
        Array.from(current.attributes).forEach((item) => current.removeAttribute(item.name));
        Array.from(meta.attributes).forEach((item) => current.setAttribute(item.name, item.value));
      } else {
        document.head.appendChild(meta.cloneNode(true));
      }
    });

    const nextCanonical = nextDocument.head.querySelector('link[rel="canonical"]');
    const currentCanonical = document.head.querySelector('link[rel="canonical"]');
    if (nextCanonical && currentCanonical) {
      currentCanonical.href = nextCanonical.href;
    }

    document.head.querySelectorAll('script[type="application/ld+json"]').forEach((script) => script.remove());
    nextDocument.head.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
      document.head.appendChild(script.cloneNode(true));
    });
    document.title = nextDocument.title;
  }

  function runScript(source, pageUrl) {
    if (source.src) {
      const url = new URL(source.getAttribute("src"), pageUrl);
      if (url.pathname.endsWith("/assets/js/nav.js")) return Promise.resolve();

      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        Array.from(source.attributes).forEach((attribute) => {
          if (attribute.name !== "src" && attribute.name !== "defer" && attribute.name !== "async") {
            script.setAttribute(attribute.name, attribute.value);
          }
        });
        script.src = url.href;
        script.async = false;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Could not load ${url.href}`));
        document.body.appendChild(script);
      });
    }

    if (source.type === "application/ld+json") return Promise.resolve();
    const script = document.createElement("script");
    Array.from(source.attributes).forEach((attribute) => script.setAttribute(attribute.name, attribute.value));
    script.textContent = source.textContent;
    document.body.appendChild(script);
    return Promise.resolve();
  }

  function loadPageHeadScripts(nextDocument) {
    nextDocument.head.querySelectorAll("script[src]").forEach((source) => {
      const src = new URL(source.getAttribute("src"), location.href).href;
      const alreadyLoaded = Array.from(document.head.querySelectorAll("script[src]"))
        .some((script) => script.src === src);
      if (alreadyLoaded) return;

      const script = document.createElement("script");
      Array.from(source.attributes).forEach((attribute) => script.setAttribute(attribute.name, attribute.value));
      script.src = src;
      script.onerror = () => console.error(`Could not load page resource: ${src}`);
      document.head.appendChild(script);
    });
  }

  async function navigate(url, addHistory, restoreScroll) {
    const response = await fetch(url.href, { headers: { Accept: "text/html" } });
    if (!response.ok) throw new Error(`Page request failed with status ${response.status}`);

    const html = await response.text();
    const nextDocument = new DOMParser().parseFromString(html, "text/html");
    if (!nextDocument.querySelector("main")) throw new Error("The requested page has no main content");

    if (addHistory) {
      history.replaceState({ scrollY: window.scrollY }, "", location.href);
      history.pushState({ scrollY: 0 }, "", url.href);
    }

    document.body.classList.add("is-navigating");
    document.body.setAttribute("aria-busy", "true");
    copyHead(nextDocument);
    loadPageHeadScripts(nextDocument);
    document.documentElement.lang = nextDocument.documentElement.lang || "en";
    document.body.replaceChildren(...Array.from(nextDocument.body.childNodes).map((node) => node.cloneNode(true)));
    updateCurrentNavigation();

    const scripts = Array.from(document.body.querySelectorAll("script"));
    for (const script of scripts) {
      await runScript(script, url);
      script.remove();
    }

    document.body.classList.remove("is-navigating");
    document.body.removeAttribute("aria-busy");
    closeMenu();
    const main = document.querySelector("main");
    if (main) {
      main.tabIndex = -1;
      main.focus({ preventScroll: true });
    }
    if (typeof restoreScroll === "number") {
      window.scrollTo(0, restoreScroll);
    } else if (url.hash) {
      document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const toggle = target.closest(".nav-toggle");
    if (toggle) {
      const links = document.querySelector(".nav-links");
      if (!links) return;
      const isOpen = links.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      return;
    }

    const anchor = target.closest("a");
    if (!anchor) return;
    if (anchor.closest(".nav-links")) closeMenu();

    const url = new URL(anchor.href, location.href);
    const samePage = url.pathname === location.pathname && url.search === location.search;

    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      anchor.hasAttribute("download") ||
      (anchor.target && anchor.target !== "_self") ||
      url.origin !== location.origin ||
      !url.pathname.endsWith(".html") ||
      (samePage && url.hash)
    ) {
      return;
    }

    event.preventDefault();
    navigate(url, !samePage).catch((error) => {
      console.error("Client-side navigation failed; loading the page normally.", error);
      location.assign(url.href);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  updateCurrentNavigation();

  window.addEventListener("popstate", (event) => {
    const url = new URL(location.href);
    navigate(url, false, event.state?.scrollY).catch((error) => {
      console.error("Client-side history navigation failed; loading the page normally.", error);
      location.assign(url.href);
    });
  });
})();
