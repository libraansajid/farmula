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

function initSectionSpy() {
  var nav = document.querySelector(".toolbar-main");
  if (!nav) return;
  var links = [].slice.call(nav.querySelectorAll('a[href^="#"]'));
  var items = links.map(function (link) {
    var id = (link.getAttribute("href") || "").replace(/^#/, "");
    var el = id ? document.getElementById(id) : null;
    return el ? { link: link, el: el } : null;
  }).filter(Boolean);
  if (!items.length) return;

  function setCurrent(active) {
    links.forEach(function (link) { link.classList.remove("current"); });
    if (active) active.link.classList.add("current");
  }

  function update() {
    var mark = 110;
    var active = items[0];
    for (var i = 0; i < items.length; i++) {
      if (items[i].el.getBoundingClientRect().top <= mark) active = items[i];
    }
    setCurrent(active);
  }

  var ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      update();
      ticking = false;
    });
  }, { passive: true });
  window.addEventListener("resize", update);
  update();
}

initSectionSpy();
