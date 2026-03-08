let curMap      = null;
let impMap      = null;
let cmpMode     = false;
let activeCat   = "__all__";
let diffFilter  = "all";
let renderGen   = 0;
let singleCache = null;
let cmpCache    = null;

const scanBtn    = document.getElementById("scan-btn");
const exportBtn  = document.getElementById("export-btn");
const importDrop = document.getElementById("import-drop");
const fileInput  = document.getElementById("file-input");
const compareBtn = document.getElementById("compare-btn");
const searchEl   = document.getElementById("search");
const nsSearch   = document.getElementById("ns-search");
const singlePane = document.getElementById("single-pane");
const comparePan = document.getElementById("compare-pane");
const badgeA     = document.getElementById("badge-a");
const badgeB     = document.getElementById("badge-b");
const colA       = document.getElementById("col-a");
const colB       = document.getElementById("col-b");
const sidebarList= document.getElementById("sidebar-list");

const plEl    = document.getElementById("panel-loading");
const plLabel = document.getElementById("pl-label");
const plBar   = document.getElementById("pl-bar");
const plSub   = document.getElementById("pl-sub");

const sbKeys  = document.getElementById("sb-keys");
const sbDiff  = document.getElementById("sb-diff");
const sbSame  = document.getElementById("sb-same");
const sbMiss  = document.getElementById("sb-miss");
const sbScan  = document.getElementById("sb-scan");
const sbBarEl = document.getElementById("sb-bar");
