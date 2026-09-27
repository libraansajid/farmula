import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
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

async function renderFile(browser, htmlName, outRel) {
  const page = await browser.newPage();
  await page.setViewport({ width: 980, height: 1400, deviceScaleFactor: 2 });
  await page.goto(pathToFileURL(path.join(root, htmlName)).href, {
    waitUntil: "networkidle0",
    timeout: 120000
  });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({
    content: `
      .util-bar, .site-header, .site-footer, .save-pdf-sticky { display: none !important; }
      html, body { background: #fff !important; padding: 0 !important; margin: 0 !important; }
      .sheet-stack { padding: 0 !important; }
      .page { width: 210mm !important; max-width: 210mm !important; margin: 0 auto !important; box-shadow: none !important; }
    `
  });

  const ids = await page.$$eval(".sheet-stack .page", (els) =>
    els.map((el, i) => el.id || "sheet-" + i)
  );
  const merged = await PDFDocument.create();

  for (const id of ids) {
    const heightPx = await page.evaluate((keep) => {
      document.querySelectorAll(".sheet-stack .page").forEach((el, i) => {
        const key = el.id || "sheet-" + i;
        el.style.display = key === keep ? "block" : "none";
      });
      window.scrollTo(0, 0);
      const shown = Array.from(document.querySelectorAll(".sheet-stack .page")).find((el, i) => {
        return (el.id || "sheet-" + i) === keep;
      });
      return shown ? shown.scrollHeight : 800;
    }, id);

    const heightMm = Math.ceil((heightPx * 25.4) / 96 + 18);
    const buf = await page.pdf({
      printBackground: true,
      preferCSSPageSize: false,
      width: "210mm",
      height: heightMm + "mm",
      margin: { top: "6mm", right: "6mm", bottom: "6mm", left: "6mm" },
      pageRanges: "1"
    });
    const part = await PDFDocument.load(buf);
    const copied = await merged.copyPages(part, part.getPageIndices());
    copied.forEach((p) => merged.addPage(p));
  }

  await writeFile(path.join(root, outRel), await merged.save());
  await page.close();
  console.log("wrote", outRel, "sheets", ids.length);
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
