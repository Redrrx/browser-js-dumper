const tooltip = document.getElementById("tooltip");

function ttRow(label, valHtml) {
  return '<div class="tt-row"><span class="tt-label">' + label + '</span>' + valHtml + '</div>';
}

function tooltipHTML(myVal, otherVal, myType, otherType) {
  if (otherVal === undefined) return null;
  const rows = [];
  const absent = otherVal === "—" || otherVal === "";

  if (myType && otherType && myType !== otherType)
    rows.push(ttRow("type", '<span class="tt-delta">' + esc(myType) + ' → ' + esc(otherType) + '</span>'));

  if (absent) {
    rows.push('<div class="tt-absent">not present in other environment</div>');
  } else {
    const numTypes = new Set(["integer", "float"]);
    if (numTypes.has(myType) && numTypes.has(otherType)) {
      const a = parseFloat(myVal), b = parseFloat(otherVal);
      if (!isNaN(a) && !isNaN(b)) {
        const d = b - a;
        rows.push(ttRow("Δ",     '<span class="tt-delta">' + (d >= 0 ? "+" : "") + d + '</span>'));
        rows.push(ttRow("ratio", '<span class="tt-delta">' + (a !== 0 ? (b / a).toFixed(4) + "×" : "∞") + '</span>'));
      }
    }
    rows.push(ttRow("other", '<span class="tt-other">' + esc(otherVal) + '</span>'));
  }
  return rows.join("");
}

function posTooltip(x, y) {
  tooltip.style.left = (x + 16) + "px";
  tooltip.style.top  = (y + 14) + "px";
  const r = tooltip.getBoundingClientRect();
  if (r.right  > window.innerWidth)  tooltip.style.left = (x - r.width  - 8) + "px";
  if (r.bottom > window.innerHeight) tooltip.style.top  = (y - r.height - 8) + "px";
}

document.addEventListener("mousemove", e => {
  const row = e.target.closest(".row");
  if (!row) { tooltip.style.display = "none"; return; }

  let html = null;

  if (row.hasAttribute("data-other")) {
    html = tooltipHTML(row.dataset.val, row.dataset.other, row.dataset.type, row.dataset.otype);
  } else if (row.hasAttribute("data-path") && impMap && impMap.size > 0) {
    const path = row.dataset.path;
    const imp  = impMap.get(path);
    if (imp) {
      html = tooltipHTML(row.dataset.val, imp.display, row.dataset.type ?? "", imp.type);
    } else {
      html = '<div class="tt-absent">not present in imported environment</div>';
    }
  }

  if (html) {
    tooltip.innerHTML = html;
    tooltip.style.display = "block";
    posTooltip(e.clientX, e.clientY);
  } else {
    tooltip.style.display = "none";
  }
});

document.addEventListener("mouseleave", () => { tooltip.style.display = "none"; });

let syncing = false;
colA.addEventListener("scroll", () => { if (!syncing) { syncing=true; colB.scrollTop=colA.scrollTop; syncing=false; } });
colB.addEventListener("scroll", () => { if (!syncing) { syncing=true; colA.scrollTop=colB.scrollTop; syncing=false; } });

scanBtn.onclick = async function() {
  scanBtn.disabled = true;
  clearStatus();
  showLoading("scanning", "window…");
  try {
    curMap = await scanAll((ns, count) => {
      setScan("scanning " + ns + "…  " + count.toLocaleString() + " keys");
      plLabel.textContent = "scanning";
      plSub.textContent   = ns + "  (" + count.toLocaleString() + " keys)";
    });
    singleCache = null; cmpCache = null;
    hideLoading();
    badgeA.textContent = curMap.size.toLocaleString() + " keys";
    exportBtn.disabled = false;
    if (impMap) compareBtn.disabled = false;
    activeCat = ACTIVATORS[0].ns;
    await render();
  } catch(e) {
    hideLoading();
    setScan("error: " + e.message);
  }
  scanBtn.disabled = false;
};

exportBtn.onclick = function() {
  const blob = new Blob([JSON.stringify(Object.fromEntries(curMap), null, 2)], { type: "application/json" });
  const a    = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  const ua   = navigator.userAgent.match(/Chrome\/([\d.]+)/);
  a.download = "env-" + (ua ? "chrome"+ua[1].split(".")[0] : "browser") + "-" + Date.now() + ".json";
  a.click();
};

function loadImport(text) {
  try {
    impMap = new Map(Object.entries(JSON.parse(text)));
    cmpCache = null;
    badgeB.textContent      = impMap.size.toLocaleString() + " keys";
    importDrop.textContent  = "✓ " + impMap.size.toLocaleString() + " keys";
    importDrop.classList.add("has-data");
    if (curMap) compareBtn.disabled = false;
    if (cmpMode) render();
  } catch(e) { alert("Bad JSON: " + e.message); }
}

importDrop.onclick = () => fileInput.click();
fileInput.onchange = function() {
  const f = fileInput.files[0]; if (!f) return;
  const r = new FileReader(); r.onload = e => loadImport(e.target.result); r.readAsText(f);
};
importDrop.addEventListener("dragover", e => e.preventDefault());
importDrop.addEventListener("drop", e => {
  e.preventDefault();
  const f = e.dataTransfer.files[0]; if (!f) return;
  const r = new FileReader(); r.onload = ev => loadImport(ev.target.result); r.readAsText(f);
});

compareBtn.onclick = function() {
  cmpMode = !cmpMode;
  compareBtn.classList.toggle("active", cmpMode);
  compareBtn.textContent = cmpMode ? "✕ Exit compare" : "⇌ Compare";
  if (!cmpMode) {
    diffFilter = "all";
    document.querySelectorAll(".dfbtn").forEach(b => b.classList.toggle("active", b.dataset.f === "all"));
  }
  render();
};

document.querySelectorAll(".dfbtn").forEach(btn => {
  btn.addEventListener("click", () => {
    diffFilter = btn.dataset.f;
    document.querySelectorAll(".dfbtn").forEach(b => b.classList.toggle("active", b === btn));
    renderContent();
  });
});

searchEl.addEventListener("input", debounce(render, 250));
nsSearch.addEventListener("input", debounce(buildSidebar, 150));
document.querySelectorAll(".tf").forEach(c => c.addEventListener("change", render));

function makeResizer(resizerEl, getA, setA, getTotal) {
  let dragging=false, startX=0, startW=0;
  resizerEl.addEventListener("mousedown", e => {
    dragging=true; startX=e.clientX; startW=getA();
    resizerEl.classList.add("dragging");
    document.body.style.cursor="col-resize"; document.body.style.userSelect="none";
    e.preventDefault();
  });
  document.addEventListener("mousemove", e => {
    if (!dragging) return;
    const newW = Math.max(80, Math.min(getTotal()-80, startW+(e.clientX-startX)));
    setA(newW);
  });
  document.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging=false; resizerEl.classList.remove("dragging");
    document.body.style.cursor=""; document.body.style.userSelect="";
  });
}
makeResizer(
  document.getElementById("resizer-sidebar"),
  () => document.getElementById("sidebar").offsetWidth,
  w  => { document.getElementById("sidebar").style.width = w+"px"; },
  () => document.getElementById("body").offsetWidth
);
makeResizer(
  document.getElementById("resizer-panes"),
  () => document.getElementById("cmp-col-a").offsetWidth,
  w  => { const el=document.getElementById("cmp-col-a"); el.style.flex="none"; el.style.width=w+"px"; },
  () => document.getElementById("compare-pane").offsetWidth
);
