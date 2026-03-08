function valueMatchesCat(cat, q) {
  for (const m of [curMap, impMap]) {
    if (!m) continue;
    for (const [path, e] of m)
      if (getCat(path) === cat && (path + " " + e.display).toLowerCase().includes(q))
        return true;
  }
  return false;
}

function buildSidebar() {
  const types = getTypes();
  const nsQ   = nsSearch.value.toLowerCase();
  const src   = curMap || impMap;
  if (!src) return;

  const allPaths = (cmpMode && impMap)
    ? new Set([...curMap.keys(), ...impMap.keys()])
    : new Set(src.keys());

  const cats = new Map();
  for (const path of allPaths) {
    const cat   = getCat(path);
    const entry = curMap?.get(path) || impMap?.get(path);
    if (!types.has(entry?.type)) continue;
    if (!cats.has(cat)) cats.set(cat, { total: 0, diffs: 0 });
    const c = cats.get(cat);
    c.total++;
    if (cmpMode && impMap) {
      const a = curMap?.get(path), b = impMap?.get(path);
      if (!a || !b || a.type !== b.type || a.display !== b.display) c.diffs++;
    }
  }

  const sorted = [...cats.entries()].sort((a, b) => b[1].total - a[1].total);
  let totalAll = 0, totalDiffs = 0;
  for (const [, v] of cats) { totalAll += v.total; totalDiffs += v.diffs; }

  sidebarList.innerHTML = "";

  if (!nsQ) {
    const el = document.createElement("div");
    el.className = "cat-item cat-all" + (activeCat === "__all__" ? " active" : "");
    el.dataset.cat = "__all__";
    const badge = cmpMode && totalDiffs
      ? `<span class="cat-badge cb-diff">${totalDiffs}</span>`
      : `<span class="cat-badge cb-count">${totalAll}</span>`;
    el.innerHTML = `<span class="cat-name">* all</span>${badge}`;
    sidebarList.appendChild(el);
  }

  for (const [name, info] of sorted) {
    const nameMatch  = !nsQ || name.toLowerCase().includes(nsQ);
    const valueMatch = nsQ && !nameMatch && valueMatchesCat(name, nsQ);
    if (!nameMatch && !valueMatch) continue;

    const el = document.createElement("div");
    el.className = "cat-item" + (activeCat === name ? " active" : "");
    el.dataset.cat = name;
    if (valueMatch) el.dataset.valueMatch = "1";
    const badge = cmpMode && info.diffs
      ? `<span class="cat-badge cb-diff">${info.diffs}</span>`
      : `<span class="cat-badge cb-count">${info.total}</span>`;
    el.innerHTML = `<span class="cat-name">${esc(name)}</span>${badge}`;
    sidebarList.appendChild(el);
  }
}

sidebarList.addEventListener("click", e => {
  const item = e.target.closest(".cat-item"); if (!item) return;
  activeCat = item.dataset.cat;
  if (item.dataset.valueMatch) {
    searchEl.value = nsSearch.value;
    nsSearch.value = "";
    buildSidebar();
  }
  sidebarList.querySelectorAll(".cat-item").forEach(el =>
    el.classList.toggle("active", el.dataset.cat === activeCat));
  renderContent();
});
