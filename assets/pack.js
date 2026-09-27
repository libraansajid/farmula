var PACK_SHEET_PX = 794;
var CSS_PX_TO_PT = 72 / 96;

function setPdfBusy(busy) {
  document.querySelectorAll(".save-pdf-sticky, .toolbar .ghost").forEach(function (el) {
    if (el.tagName !== "BUTTON") return;
    if (!el.dataset.label) el.dataset.label = el.textContent;
    el.disabled = !!busy;
    el.textContent = busy ? "Preparing PDF…" : el.dataset.label;
  });
}

function waitForImages(root) {
  return Promise.all(
    Array.prototype.slice.call(root.querySelectorAll("img")).map(function (img) {
      if (img.complete) return Promise.resolve();
      return new Promise(function (done) {
        img.onload = img.onerror = function () { done(); };
      });
    })
  );
}

function savePackPdf() {
  if (!window.html2canvas || !window.jspdf) {
    window.print();
    return;
  }
  exportExactPdf();
}

function exportExactPdf() {
  var stack = document.querySelector(".sheet-stack");
  var pages = stack ? stack.querySelectorAll(".page") : [];
  if (!pages.length) {
    window.print();
    return;
  }

  setPdfBusy(true);
  document.body.classList.add("pdf-capture");
  window.scrollTo(0, 0);

  waitForImages(stack)
    .then(function () {
      return new Promise(function (resolve) { requestAnimationFrame(function () { resolve(); }); });
    })
    .then(function () {
      return captureSheets(pages);
    })
    .then(function (pdf) {
      pdf.save("BazzLab-Formulation-Pack.pdf");
    })
    .catch(function () {
      window.print();
    })
    .then(function () {
      document.body.classList.remove("pdf-capture");
      setPdfBusy(false);
    });
}

function captureSheets(pages) {
  var JsPDF = window.jspdf.jsPDF;
  var pdf = null;
  var chain = Promise.resolve();
  var sheetW = PACK_SHEET_PX * CSS_PX_TO_PT;

  Array.prototype.forEach.call(pages, function (el) {
    chain = chain.then(function () {
      return html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        letterRendering: true
      }).then(function (canvas) {
        var sheetH = (canvas.height / canvas.width) * sheetW;
        var img = canvas.toDataURL("image/jpeg", 0.95);
        if (!pdf) {
          pdf = new JsPDF({
            unit: "pt",
            format: [sheetW, sheetH],
            orientation: "p",
            compress: true
          });
        } else {
          pdf.addPage([sheetW, sheetH], "p");
        }
        pdf.addImage(img, "JPEG", 0, 0, sheetW, sheetH, undefined, "FAST");
      });
    });
  });

  return chain.then(function () { return pdf; });
}
