function savePackPdf() {
  var href = document.body.getAttribute("data-pdf") || "assets/BazzLab-Formulation-Pack.pdf";
  var name = href.split("/").pop();
  var a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
