# Toolshub

The interface uses a high-contrast black-and-red gradient theme, with a JK
monogram across the header and favicon. Shared colors, focus states, and
responsive components are maintained in `assets/css/style.css`.

A free collection of static browser tools built with HTML, CSS, and
JavaScript — no build step, backend, or framework. Image compression,
unit conversion, typing practice, QR creation, password generation, and
document processing run in the browser.
The contact form uses FormSubmit to forward messages by email.

## Project structure

```
/
├── index.html                     Tool + landing page
├── typing-speed-test.html         Timed typing practice and results
├── qr-code-generator.html         QR generation and export options
├── unit-converter.html            Everyday and scientific unit conversions
├── password-generator.html        Password generation and strength checking
├── document-tools.html            Document tools hub
├── pdf-splitter.html              Extract PDF pages or ranges
├── pdf-to-word.html               Extract PDF text into DOCX
├── word-to-pdf.html               Convert DOCX previews to downloadable PDF
├── ppt-size-reducer.html          Optimize images in PPTX presentations
├── calculator-tools.html          Calculator tools hub
├── age-calculator.html             Calculate age in years, months, days
├── scientific-calculator.html      Scientific expression calculator
├── bmi-calculator.html             Metric and imperial BMI estimate
├── percentage-calculator.html     Percentage and change calculations
├── terms.html
├── contact.html
├── robots.txt
├── sitemap.xml
└── assets/
    ├── css/style.css
    ├── js/
    │   ├── compressor.js   Compression engine (Canvas-based, no deps)
    │   ├── app.js          UI wiring for the tool page
    │   ├── typing-speed-test.js Timed typing test and score calculation
    │   ├── qr-code-generator.js QR payloads, preview, and downloads
    │   ├── unit-converter.js Unit definitions and conversion logic
    │   ├── password-generator.js Secure generation and local strength checks
    │   ├── pdf-splitter.js        PDF page extraction
    │   ├── pdf-to-word.js         PDF text extraction and DOCX export
    │   ├── word-to-pdf.js         Safe DOCX preview and direct PDF download
    │   ├── ppt-size-reducer.js    Embedded PPTX image optimization
    │   ├── age-calculator.js      Age from calendar dates
    │   ├── scientific-calculator.js Safe scientific expression parser
    │   ├── bmi-calculator.js      BMI estimate and unit conversion
    │   ├── percentage-calculator.js Percentage calculations
    │   └── nav.js          Mobile menu and no-reload page navigation
    └── img/favicon.svg
```

## Run it locally

No build tools required. From this folder, serve it with any static
server (opening `index.html` directly via `file://` also mostly works,
but a local server avoids some browser quirks):

```bash
# Windows PowerShell
py -m http.server 8080

# macOS / Linux
python3 -m http.server 8080

# Node (if you have it)
npx serve .
```

Run the command from the folder containing `index.html`, then open
`http://localhost:8080`.

Internal links between site pages use the History API to load page content
without a full document reload. Direct page URLs and browser back/forward
remain supported; if client-side navigation cannot load a page, it falls
back to a normal page request.

## Deploy

This is a static site — deploy the folder as-is to any static host:
Netlify, Vercel, GitHub Pages, Cloudflare Pages, S3 + CloudFront, etc.
There is no server-side code and no environment variables required for
the tools themselves to work. Upload or publish the contents of this
project folder, keeping `index.html` and the `assets/` folder together.

Internal page and asset links are relative, so navigation works both
when the site is hosted at a domain root and under a project subpath
(for example, GitHub Pages project sites). After deployment, check every
page and the compressor on the final URL.

Before launch:

1. **SEO and answer-engine discovery** — update the canonical/Open Graph metadata in each HTML
   page, `robots.txt`, and `sitemap.xml` if Toolshub moves to a
   different production domain. Canonical URLs currently use the site's
   existing configured domain. For a project subpath, include that
   subpath in canonical URLs and sitemap entries. Do not add location
   targeting unless the service has a real, relevant service area.
   Page titles, descriptions, structured application/site identity, descriptive
   headings, and direct tool explanations are included to help search
   engines and answer engines identify each tool accurately. These
   signals do not guarantee rankings or AI-generated citations.
2. **Contact form** — `contact.html` submits through FormSubmit to
   `syedkashanalishah110@gmail.com`. FormSubmit requires the recipient to
   confirm its activation email after the first submission before it
   forwards messages. Submit a test from the deployed site, confirm
   activation in that inbox, then send another test and verify delivery.
   Contact messages are handled by FormSubmit; do not send sensitive
   information. Review FormSubmit's privacy policy for its data practices.
3. **Final smoke test** — visit the home page, open each page from the
   navigation and footer, test the mobile menu, compress and download a
   sample image, exercise each QR content type, scan a downloaded QR
   code, complete a typing test, verify representative conversions
   (including temperature), generate/check a password, split and convert
   sample documents, and verify PowerPoint presentations after image
   optimization. The "Download all" ZIP uses JSZip from cdnjs; if that CDN is unavailable,
   the app downloads files separately.

## How the tools work

- `assets/js/compressor.js` decodes each image with `createImageBitmap`
  (honoring embedded EXIF orientation where the browser supports it),
  draws it to a `<canvas>` (capping the longest edge at 4096px), and
  re-encodes it with `canvas.toBlob()` at the chosen quality/format.
- JPEG and WebP support a quality slider (0–1, exposed as 30–95% in the
  UI). PNG is lossless in the browser — the UI explains this and
  suggests WebP for further savings.
- Converting an image with transparency to JPEG flattens it onto a
  white background, with a note shown to the visitor.
- Everything runs synchronously in the tab; there is no network call
  for the compression itself.
- The unit converter runs locally and covers length, area, volume, mass,
  temperature, speed, time, digital storage, pressure, energy, power,
  frequency, angle, and force. Currency and calendar-month conversions
  are not included.
- The typing speed test runs locally in the browser and reports words
  per minute, accuracy, correct characters, and errors for a timed round.
- The QR code generator creates codes locally in the browser for text,
  URLs, Wi-Fi, vCards, email, calls, and SMS. It offers color, size,
  margin, and error-correction settings, PNG/SVG downloads, and clipboard
  actions. The MIT-licensed QR encoder loads from jsDelivr; without that
  CDN, QR generation reports an error and requires a connection.
- The password generator uses Web Crypto for unbiased random selection
  and shuffling. Passwords are generated and checked locally, are not
  transmitted or saved by the site, and strength ratings are estimates
  rather than security guarantees.
- Document tools run in the browser using pinned PDF, Word, and ZIP
  libraries from cdnjs and jsDelivr. PDF-to-Word extracts selectable
  text into a simple DOCX and does not preserve layout or images.
  Word-to-PDF renders common DOCX content in the browser and downloads a
  PDF using html2pdf.js; advanced Word layout may not be preserved. The PPTX
  optimizer recompresses eligible embedded JPEG/PNG images only. PDF
  split/extraction and PPTX inputs are limited to 100 MB; DOCX input is
  limited to 50 MB, and PDF text extraction is limited to 500 pages.
- "Download all" zips results client-side using JSZip (loaded from
  cdnjs). If that CDN is unreachable, the app automatically falls back
  to downloading each file separately.

## Optional integrations and branding

1. **Analytics** — none is included by default. If analytics or an ad
   network is added, update the site's data disclosures in `terms.html`
   and add a consent mechanism if required in your jurisdiction.
2. **Advertising** — a single reserved `.ad-slot` container is included
   on the tool page, positioned below the tool and never inside the
   upload/preview/download area. Fill it with your ad network's code if
   you choose to monetize this way; nothing here claims ad-network
   approval or guaranteed earnings.
3. **Brand and social image** — the site uses the JK monogram in
   `assets/img/favicon.svg` and the shared page header. Add a correctly
   sized social preview image and matching `og:image` metadata if one is
   created for production.

## Known limitations (documented, not hidden)

- PNG quality/size reduction in-browser is limited to re-encoding
  (lossless); large PNG savings generally require converting to WebP,
  which the UI explains and offers.
- WebP encoding support is feature-detected; on the rare browser that
  can't encode WebP, that option is disabled with an explanation
  rather than silently failing.
- Batch limits (40 images per batch, 30 MB per file) are enforced in
  `assets/js/app.js` to keep the tab responsive — adjust `MAX_FILES` /
  `MAX_FILE_SIZE` there if you need different limits.
- The site uses a dark black-and-red theme. Shared color tokens,
  gradients, focus rings, and responsive styles are maintained in
  `assets/css/style.css`.
