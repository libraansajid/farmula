function savePackPdf() {
  var link = document.createElement("a");
  link.href = "assets/BazzLab-Formulation-Pack.pdf";
  link.download = "BazzLab-Formulation-Pack.pdf";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
