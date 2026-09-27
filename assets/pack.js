function savePackPdf() {
  var prev = document.title;
  document.title = "BazzLab Formulation Pack";
  var restore = function () {
    document.title = prev;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
}
