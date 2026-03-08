function showLoading(label, sub) {
  plLabel.textContent = label;
  plBar.textContent   = pbar(0);
  plSub.textContent   = sub || "";
  plEl.classList.add("visible");
}
function updateLoading(frac, sub) {
  plBar.textContent = pbar(frac);
  if (sub !== undefined) plSub.textContent = sub;
}
function hideLoading() { plEl.classList.remove("visible"); }

function setScan(msg)          { sbScan.textContent = msg; sbBarEl.textContent = ""; }
function setScanBar(frac, msg) { sbScan.textContent = msg; sbBarEl.textContent = pbar(frac, 20); }
function clearStatus()         { sbKeys.textContent="—"; sbDiff.textContent="—"; sbSame.textContent="—"; sbMiss.textContent="—"; sbScan.textContent=""; sbBarEl.textContent=""; }

function setViewStatus(shown, total) {
  sbKeys.textContent = shown.toLocaleString() + " / " + total.toLocaleString();
  sbDiff.textContent = "—"; sbSame.textContent = "—"; sbMiss.textContent = "—";
}
function setCmpStatus(shown, nDiff, nSame, nMiss) {
  sbKeys.textContent = shown.toLocaleString();
  sbDiff.textContent = nDiff.toLocaleString();
  sbSame.textContent = nSame.toLocaleString();
  sbMiss.textContent = nMiss.toLocaleString();
}

async function stream(gen, entries, filter, flush, onDone) {
  const total = entries.length;
  let pending = [], nShown = 0;
  for (let i = 0; i < total; i++) {
    if (renderGen !== gen) { hideLoading(); return false; }
    const item = filter(entries[i]);
    if (item == null) continue;
    pending.push(item);
    nShown++;
    if (nShown % BATCH === 0) {
      flush(pending, i / total, nShown);
      pending = [];
      await YIELD();
    }
  }
  if (renderGen !== gen) { hideLoading(); return false; }
  if (pending.length) flush(pending, 1, nShown);
  onDone(nShown);
  return true;
}

async function renderSingle(gen) {
  if (!singleCache) { showLoading("indexing", "…"); await buildSingleCache(); }
  if (renderGen !== gen) { hideLoading(); return; }

  const types   = getTypes();
  const q       = searchEl.value.toLowerCase();
  const entries = singleCache.get(activeCat) || [];
  const total   = entries.length;
  showLoading("loading", activeCat === "__all__" ? "all" : activeCat);
  singlePane.innerHTML = "";

  await stream(gen, entries,
    e => (!types.has(e.type) || (q && !e.text.toLowerCase().includes(q))) ? null : e.html,
    (items, frac, nShown) => {
      singlePane.insertAdjacentHTML("beforeend", items.join(""));
      updateLoading(frac, nShown.toLocaleString() + " rows");
      setScanBar(frac, nShown.toLocaleString() + " / " + total.toLocaleString());
    },
    nShown => {
      hideLoading();
      setViewStatus(nShown, curMap.size);
      sbScan.textContent = ""; sbBarEl.textContent = "";
    }
  );
}

async function renderCompare(gen) {
  if (!cmpCache) { showLoading("indexing", "building comparison cache…"); await buildCmpCache(); }
  if (renderGen !== gen) { hideLoading(); return; }

  const types   = getTypes();
  const q       = searchEl.value.toLowerCase();
  const catData = cmpCache.get(activeCat) || { diff: [], same: [], miss: [], all: [] };
  const entries = { diff: catData.diff, same: catData.same, missing: catData.miss }[diffFilter] ?? catData.all;
  showLoading("comparing", (activeCat === "__all__" ? "all" : activeCat) + " · " + diffFilter);
  colA.innerHTML = ""; colB.innerHTML = "";

  await stream(gen, entries,
    e => (!types.has(e.typeA) && !types.has(e.typeB)) ||
         (q && !e.ta.toLowerCase().includes(q) && !e.tb.toLowerCase().includes(q)) ? null : e,
    (items, frac, nShown) => {
      colA.insertAdjacentHTML("beforeend", items.map(e => e.aHtml).join(""));
      colB.insertAdjacentHTML("beforeend", items.map(e => e.bHtml).join(""));
      updateLoading(frac, nShown.toLocaleString() + " / " + entries.length.toLocaleString());
      setScanBar(frac, nShown.toLocaleString() + " / " + entries.length.toLocaleString());
    },
    nShown => {
      hideLoading();
      setCmpStatus(nShown, catData.diff.length, catData.same.length, catData.miss.length);
      sbScan.textContent = ""; sbBarEl.textContent = "";
    }
  );
}

async function renderContent() {
  const gen = ++renderGen;
  if (cmpMode && curMap && impMap) {
    singlePane.style.display = "none";
    comparePan.style.display = "flex";
    await renderCompare(gen);
  } else {
    comparePan.style.display = "none";
    singlePane.style.display = "";
    if (curMap) await renderSingle(gen);
  }
}

async function render() { buildSidebar(); await renderContent(); }
