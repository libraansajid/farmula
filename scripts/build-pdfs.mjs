import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer-core");
const { PDFDocument } = require("pdf-lib");

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const chrome = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
].find((p) => existsSync(p));

if (!chrome) {
  throw new Error("Chrome not found");
}

const jobs = [
  { html: "index.html", out: "assets/BazzLab-Formulation-Pack.pdf" },
  { html: "comparison.html", out: "assets/BazzLab-Comparison.pdf" },
  { html: "lab-50.html", out: "assets/BazzLab-Lab-50.pdf" }
];

function dataUri(rel) {
  const fp = path.join(root, rel.replace(/^\.\//, ""));
  if (!existsSync(fp)) return null;
  const ext = path.extname(fp).slice(1).toLowerCase();
  const mime =
    ext === "svg" ? "image/svg+xml" :
    ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
    "image/png";
  return "data:" + mime + ";base64," + readFileSync(fp).toString("base64");
}

function inlineImages(html) {
  return html.replace(/src="(assets\/[^"]+)"/g, (all, rel) => {
    const uri = dataUri(rel);
    return uri ? 'src="' + uri + '"' : all;
  });
}

async function renderFile(browser, htmlName, outRel) {
  const page = await browser.newPage();
  await page.setViewport({ width: 794, height: 2000, deviceScaleFactor: 1 });
  await page.emulateMediaType("screen");
  await page.goto(pathToFileURL(path.join(root, htmlName)).href, {
    waitUntil: "networkidle0",
    timeout: 120000
  });

  const sheets = await page.$$eval(".sheet-stack .page", (els) =>
    els.map((el) => {
      const clone = el.cloneNode(true);
      clone.querySelectorAll(".running, .print-cover-head").forEach((n) => n.remove());
      return clone.outerHTML;
    })
  );

  const baseHref = pathToFileURL(root + path.sep).href;
  const cssHref = pathToFileURL(path.join(root, "assets", "pack.css")).href;
  const merged = await PDFDocument.create();

  for (const raw of sheets) {
    const fragment = inlineImages(raw);
    await page.setContent(
      `<!DOCTYPE html><html><head>
        <base href="${baseHref}">
        <link rel="stylesheet" href="${cssHref}">
        <style>
          @page { margin: 0 !important; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          .page { width: 794px !important; max-width: 794px !important; margin: 0 !important; box-shadow: none !important; }
          .running, .print-cover-head, .util-bar, .site-header, .site-footer, .save-pdf-sticky { display: none !important; }
          img, .fig { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        </style>
      </head><body>${fragment}</body></html>`,
      { waitUntil: "load", timeout: 120000 }
    );
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.evaluate(async () => {
      await Promise.all(
        Array.from(document.images).map((img) => {
          if (img.complete && img.naturalWidth) return Promise.resolve();
          return new Promise((done) => {
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
          });
        })
      );
    });

    const box = await page.$eval(".page", (el) => ({
      w: Math.ceil(el.scrollWidth),
      h: Math.ceil(el.scrollHeight)
    }));

    const buf = await page.pdf({
      printBackground: true,
      preferCSSPageSize: false,
      width: box.w / 96 + "in",
      height: box.h / 96 + "in",
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });
    const part = await PDFDocument.load(buf);
    const copied = await merged.copyPages(part, [0]);
    copied.forEach((p) => merged.addPage(p));
  }

  await writeFile(path.join(root, outRel), await merged.save());
  await page.close();
  console.log("wrote", outRel, "sheets", sheets.length);
}

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: "new"
});

try {
  for (const job of jobs) {
    await renderFile(browser, job.html, job.out);
  }
} finally {
  await browser.close();
}
