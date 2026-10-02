import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer-core");

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const chrome = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
].find((p) => existsSync(p));

if (!chrome) throw new Error("Chrome not found");

function dataUri(rel) {
  const fp = path.join(root, rel.replace(/^\.\//, ""));
  if (!existsSync(fp)) return null;
  const ext = path.extname(fp).slice(1).toLowerCase();
  const mime = ext === "svg" ? "image/svg+xml" : "image/png";
  return "data:" + mime + ";base64," + readFileSync(fp).toString("base64");
}

const htmlPath = path.join(root, "BazzLab_Rev_M_Lab_Pack.html");
const outPath = path.join(root, "BazzLab_Rev_M_Open_Closed_Cell_Formulas.pdf");
let html = readFileSync(htmlPath, "utf8");
html = html.replace(/src="(assets\/[^"]+)"/g, (all, rel) => {
  const uri = dataUri(rel);
  return uri ? 'src="' + uri + '"' : all;
});

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: "new"
});

try {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load", timeout: 120000 });
  await page.emulateMediaType("print");
  await page.evaluate(() => document.fonts && document.fonts.ready);
  const buf = await page.pdf({
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "10mm", right: "11mm", bottom: "12mm", left: "11mm" }
  });
  await writeFile(outPath, buf);
  console.log("wrote", path.basename(outPath), buf.length, "bytes");
} finally {
  await browser.close();
}
