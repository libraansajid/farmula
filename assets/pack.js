function packPdfName() {
  var title = (document.title || "BazzLab Formulation Pack").replace(/[\\/:*?"<>|]+/g, " ").trim();
  return title + ".pdf";
}

function setPdfBusy(busy) {
  document.querySelectorAll(".save-pdf-sticky, .toolbar .ghost").forEach(function (el) {
    if (el.tagName !== "BUTTON") return;
    if (!el.dataset.label) el.dataset.label = el.textContent;
    el.disabled = !!busy;
    el.textContent = busy ? "Preparing PDF…" : el.dataset.label;
  });
}

function savePackPdf() {
  if (typeof html2pdf === "undefined") {
    window.print();
    return;
  }
  exportPackPdf();
}

function exportPackPdf() {
  var source = document.querySelector(".sheet-stack");
  if (!source) {
    window.print();
    return;
  }

  setPdfBusy(true);
  document.body.classList.add("pdf-export");
  source.querySelectorAll(".page").forEach(function (page, i) {
    page.classList.toggle("pdf-break-before", i > 0);
  });

  var opt = {
    margin: [8, 8, 8, 8],
    filename: packPdfName(),
    image: { type: "jpeg", quality: 0.95 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: 794,
      scrollX: 0,
      scrollY: 0
    },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["css", "legacy"], before: ".pdf-break-before" }
  };

  function done(fallbackPrint) {
    source.querySelectorAll(".pdf-break-before").forEach(function (page) {
      page.classList.remove("pdf-break-before");
    });
    document.body.classList.remove("pdf-export");
    setPdfBusy(false);
    if (fallbackPrint) window.print();
  }

  html2pdf()
    .set(opt)
    .from(source)
    .save()
    .then(function () { done(false); })
    .catch(function () { done(true); });
}
