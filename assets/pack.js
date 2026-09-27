var CSS_PX_TO_PT = 72 / 96;

function setPdfBusy(busy) {
  document.querySelectorAll(".save-pdf-sticky, .toolbar .ghost").forEach(function (el) {
    if (el.tagName !== "BUTTON") return;
    if (!el.dataset.label) el.dataset.label = el.textContent;
    el.disabled = !!busy;
    el.textContent = busy ? "Preparing PDF…" : el.dataset.label;
  });
}

function pdfLib() {
  var ns = window.jspdf || window.jsPDF;
  if (!ns) return null;
  return ns.jsPDF || ns;
}

function waitImages(root) {
  return Promise.all(
    Array.prototype.slice.call(root.querySelectorAll("img")).map(function (img) {
      if (img.complete && img.naturalWidth) return Promise.resolve();
      return new Promise(function (done) {
        img.onload = img.onerror = function () { done(); };
      });
    })
  );
}

function downloadBlob(blob, filename) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
}

function savePackPdf() {
  var JsPDF = pdfLib();
  if (!window.html2canvas || !JsPDF) {
    setPdfBusy(true);
    loadPdfLibs().then(exportWebPdf).catch(function () {
      setPdfBusy(false);
      alert("PDF download could not start. Refresh the page and try Save PDF again.");
    });
    return;
  }
  exportWebPdf();
}

function loadPdfLibs() {
  function add(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  var chain = Promise.resolve();
  if (!window.html2canvas) chain = chain.then(function () { return add("assets/html2canvas.min.js"); });
  if (!pdfLib()) chain = chain.then(function () { return add("assets/jspdf.umd.min.js"); });
  return chain;
}

function exportWebPdf() {
  var JsPDF = pdfLib();
  var stack = document.querySelector(".sheet-stack");
  var pages = stack ? stack.querySelectorAll(".page") : [];
  if (!JsPDF || !window.html2canvas || !pages.length) {
    alert("Nothing to save.");
    return;
  }

  setPdfBusy(true);
  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();

  fontsReady
    .then(function () { return waitImages(stack); })
    .then(function () { return captureAsWeb(pages, JsPDF); })
    .then(function (pdf) {
      downloadBlob(pdf.output("blob"), "BazzLab-Formulation-Pack.pdf");
    })
    .catch(function (err) {
      console.error(err);
      alert("PDF download failed. Refresh and try Save PDF again.");
    })
    .then(function () {
      setPdfBusy(false);
    });
}

function captureAsWeb(pages, JsPDF) {
  var pdf = null;
  var scale = 2;
  var chain = Promise.resolve();

  Array.prototype.forEach.call(pages, function (el) {
    chain = chain.then(function () {
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
      return new Promise(function (resolve) { setTimeout(resolve, 40); });
    }).then(function () {
      return html2canvas(el, {
        scale: scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        imageTimeout: 8000,
        onclone: function (doc) {
          var cloned = doc.getElementById(el.id) || doc.querySelector("#" + el.id);
          if (cloned) {
            cloned.style.width = el.offsetWidth + "px";
            cloned.style.maxWidth = el.offsetWidth + "px";
            cloned.style.boxShadow = "none";
            cloned.style.margin = "0";
          }
        }
      });
    }).then(function (canvas) {
      var ptW = (canvas.width / scale) * CSS_PX_TO_PT;
      var ptH = (canvas.height / scale) * CSS_PX_TO_PT;
      var img = canvas.toDataURL("image/jpeg", 0.96);
      if (!pdf) {
        pdf = new JsPDF({ unit: "pt", format: [ptW, ptH], orientation: "p", compress: true });
      } else {
        pdf.addPage([ptW, ptH], "p");
      }
      pdf.addImage(img, "JPEG", 0, 0, ptW, ptH, undefined, "FAST");
    });
  });

  return chain.then(function () { return pdf; });
}
