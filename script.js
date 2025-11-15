const video = document.getElementById("video");
const urlInput = document.getElementById("url");
const programSel = $("#program");
const variantSel = $("#variant");
const loadBtn = document.getElementById("loadBtn");
const stopBtn = document.getElementById("stopBtn");
const logEl = document.getElementById("log");
const playingLink = document.getElementById("playingLink");
const toggleUrlBtn = document.getElementById("toggleUrl");
const urlTextSpan = document.getElementById("urlText");
const themeToggle = document.getElementById("themeToggle");

// New: Clear Button reference
const clearUrlBtn = document.getElementById("clearUrlBtn");

// New: Reset Button reference
const resetAppBtn = document.getElementById("resetAppBtn");

// New: History elements
const historyBtn = document.getElementById("historyBtn");
const historyDropdown = document.getElementById("historyDropdown");
const historyList = document.getElementById("historyList");

const ui = {
  curr: document.getElementById("curr"),
  avg: document.getElementById("avg"),
  res: document.getElementById("res"),
  segCount: document.getElementById("segCount"),
  time: document.getElementById("time"),
  // UPDATED UI ELEMENTS (QoE)
  buff: document.getElementById("buff"),
  latency: document.getElementById("latency"),
  dropped: document.getElementById("dropped"),
  stalls: document.getElementById("stalls"),
};

let hls = null;
let totalBits = 0;
let totalDur = 0;          // here: total DOWNLOAD time (seconds) for average bitrate
let segments = 0;
let startTime = null;
let monitoringInterval = null;

// NEW Counters
let stalls = 0;
let droppedFrames = 0;

// current master URL for Auto mode
let currentAutoMasterUrl = null;

// cache variants per URL if needed
const variantsCache = new Map();

/* ---------- Helpers ---------- */
function log(t) {
  logEl.textContent += `[${new Date().toLocaleTimeString()}] ${t}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}
function human(n) {
  return (Math.round(n * 100) / 100).toFixed(2);
}
function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}
function resetUI() {
  totalBits = 0;
  totalDur = 0;
  segments = 0;
  startTime = null;

  // Reset NEW Counters
  stalls = 0;
  droppedFrames = 0;

  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }

  ui.curr.textContent = ui.avg.textContent = "0";
  ui.segCount.textContent = "0";
  ui.res.textContent = "—";
  ui.time.textContent = "00:00";
  // Reset UI elements
  ui.buff.textContent = "0";
  ui.latency.textContent = "—";
  ui.dropped.textContent = "0";
  ui.stalls.textContent = "0";
  
  logEl.textContent = "";

  playingLink.href = "#";
  playingLink.textContent = "—";

  if (hls) {
    hls.destroy();
    hls = null;
  }
  video.removeAttribute("src");
  video.load();
}

/* ---------- URL History Management ---------- */
const MAX_HISTORY = 10;
function loadUrlHistory() {
  try {
    const history = JSON.parse(localStorage.getItem('hls_url_history')) || [];
    historyList.innerHTML = '';

    if (history.length === 0) {
      const emptyItem = document.createElement('li');
      emptyItem.textContent = "No history yet.";
      emptyItem.classList.add('empty');
      historyList.appendChild(emptyItem);
      return;
    }

    history.forEach(url => {
      const listItem = document.createElement('li');
      listItem.textContent = url;
      listItem.dataset.url = url;
      listItem.title = url;
      listItem.addEventListener('click', () => {
        urlInput.value = url;
        historyDropdown.setAttribute('hidden', 'hidden');
        // Do not auto-parse on selection, let the user click Load/Parse
      });
      historyList.appendChild(listItem);
    });
  } catch (e) {
    console.error("Failed to load URL history:", e);
  }
}

function saveUrlToHistory(url) {
  try {
    let history = JSON.parse(localStorage.getItem('hls_url_history')) || [];
    // Remove if already exists
    history = history.filter(item => item !== url);
    // Add to the beginning
    history.unshift(url);
    // Trim to max size
    if (history.length > MAX_HISTORY) {
      history = history.slice(0, MAX_HISTORY);
    }
    localStorage.setItem('hls_url_history', JSON.stringify(history));
    loadUrlHistory(); // Update the list
  } catch (e) {
    console.error("Failed to save URL history:", e);
  }
}

function clearUrlHistory() {
  try {
    localStorage.removeItem('hls_url_history');
    log("🗑️ URL History cleared from local storage.");
    loadUrlHistory(); // Update the displayed history to empty
  } catch (e) {
    console.error("Failed to clear URL history:", e);
  }
}

historyBtn.addEventListener('click', (e) => {
  e.stopPropagation(); // Prevent document click listener from immediately hiding it
  loadUrlHistory(); // Refresh list before showing
  const isHidden = historyDropdown.hasAttribute('hidden');
  if (isHidden) {
    historyDropdown.removeAttribute('hidden');
  } else {
    historyDropdown.setAttribute('hidden', 'hidden');
  }
});

// Hide dropdown if clicked outside
document.addEventListener('click', (e) => {
  if (historyDropdown && !historyDropdown.contains(e.target) && e.target !== historyBtn) {
    historyDropdown.setAttribute('hidden', 'hidden');
  }
});


/* ---------- Select2 Selection Management (NEW PERSISTENCE LOGIC) ---------- */
const PROGRAM_KEY = 'hls_selected_program';
const VARIANT_KEY = 'hls_selected_variant';

function saveSelections(programUrl, variantValue) {
  try {
    localStorage.setItem(PROGRAM_KEY, programUrl || '');
    localStorage.setItem(VARIANT_KEY, variantValue || 'auto'); // Default to 'auto'
  } catch (e) {
    console.error("Failed to save Select2 selections:", e);
  }
}

function loadAndApplySelections(masterUrl) {
  try {
    const savedProgram = localStorage.getItem(PROGRAM_KEY);
    const savedVariant = localStorage.getItem(VARIANT_KEY);
    
    // 1. Check if we have saved data and if the URL matches the current one being parsed
    if (savedProgram && savedProgram === masterUrl) {
      
      // 2. Check if the saved Program URL exists in the newly populated list
      if (programSel.find(`option[value="${savedProgram}"]`).length) {
        // Select the program from the list, triggering variant fetch
        programSel.val(savedProgram).trigger('change.select2');
        
        // 3. Restore Variant Selection after a delay
        // Delay is crucial to allow the async getVariantsFromUrl (triggered by programSel change) 
        // to fetch and populate the variantSel dropdown.
        setTimeout(() => {
             // Check if the saved variant exists in the *newly loaded* variant list
             if (variantSel.find(`option[value="${savedVariant}"]`).length) {
                variantSel.val(savedVariant).trigger('change');
                log(`✅ Restored selection: Program & Variant to '${savedVariant}'.`);
             } else {
                 // Saved variant not available in the new list (e.g., deleted level)
                 variantSel.val('auto').trigger('change');
                 log(`⚠️ Saved variant '${savedVariant}' not found. Starting Auto mode.`);
             }
        }, 500); // 500ms delay to allow async variant fetching/filling
        return true; // Successfully restored selection and initiated playback
      }
    }
    
    // Fallback path: No saved selection found or program URL mismatch/not in the list.
    log("ℹ️ No saved program selection to restore. Using default (first program/auto variant).");
    return false;

  } catch (e) {
    console.error("Failed to load/apply Select2 selections:", e);
    return false;
  }
}


/* ---------- Theme Toggle ---------- */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  if (theme === "dark") {
    themeToggle.textContent = "🌙";
  } else {
    themeToggle.textContent = "☀️";
  }
  localStorage.setItem("hls_theme", theme);
}

(function initTheme() {
  const saved = localStorage.getItem("hls_theme");
  const theme = saved === "light" || saved === "dark" ? saved : "dark";
  applyTheme(theme);
})();

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  applyTheme(current === "dark" ? "light" : "dark");
});

/* ---------- Show/Hide URL ---------- */
toggleUrlBtn.addEventListener("click", () => {
  const hidden = urlTextSpan.classList.contains("url-hidden");
  if (hidden) {
    urlTextSpan.classList.remove("url-hidden");
    urlTextSpan.removeAttribute("hidden");
    toggleUrlBtn.textContent = "🔗 Hide URL";
  } else {
    urlTextSpan.classList.add("url-hidden");
    urlTextSpan.setAttribute("hidden", "hidden");
    toggleUrlBtn.textContent = "🔗 Show URL";
  }
});

/* ---------- Detect and Parse Root URL ---------- */
async function detectAndParse(url) {
  if (!url) return;
  // Save URL to history before parsing
  saveUrlToHistory(url); 
  resetUI(); // Reset UI immediately upon new parse attempt

  try {
    log("🔗 Fetching playlist...");
    const res = await fetch(url, { cache: "no-store" });
    const txt = await res.text();
    const lower = txt.toLowerCase();

    // Case 1: Master playlist with variants
    if (lower.includes("#ext-x-stream-inf")) {
      log("📄 Detected HLS master playlist (variants)");
      
      // 1. Populate program/variant lists
      parseMasterFromRoot(url, txt);

      // 2. Attempt to restore the last selection. If successful, it handles playback and returns.
      if (loadAndApplySelections(url)) {
          return; 
      }
      // If restoration fails, the default 'auto' selection and playback set by parseMasterFromRoot continues.
      return;
    }

    // Case 2: Multi-channel M3U list (many EXTINF + .m3u8 links)
    if (
      lower.includes("#extinf") &&
      lower.split("#extinf").length > 2 &&
      txt.match(/\.m3u8/gi)
    ) {
      log("📺 Detected M3U channel list");
      
      // 1. Populate program list
      parseM3U(url, txt);
      
      // 2. Attempt to restore the last selection. If successful, it handles playback and returns.
      if (loadAndApplySelections(url)) {
          return; 
      }
      // If restoration fails, the default first program selection set by parseM3U continues.
      return;
    }

    // Case 3: Single-bitrate media playlist
    if (lower.includes("#extinf") && lower.includes("#ext-x-targetduration")) {
      log("🎞️ Detected single-bitrate HLS playlist");
      programSel
        .empty()
        .append(new Option("Single Stream", url))
        .trigger("change.select2");
      variantSel.hide().empty();
      variantsCache.clear();
      currentAutoMasterUrl = null;
      // SAVE SELECTION FOR SINGLE STREAM
      saveSelections(url, url);
      startPlayback(url, false); // Playback can start immediately
      return;
    }

    // Fallback: treat as direct stream (TS/HLS)
    log("ℹ️ Unknown format, treating as direct stream URL");
    programSel
      .empty()
      .append(new Option("Direct Stream", url))
      .trigger("change.select2");
    variantSel.hide().empty();
    variantsCache.clear();
    currentAutoMasterUrl = null;
    // SAVE SELECTION FOR DIRECT STREAM
    saveSelections(url, url);
    startPlayback(url, false); // Playback can start immediately
  } catch (e) {
    log(`❌ Fetch failed: ${e.message || e}`);
  }
}

/* ---------- Parse M3U Channel List ---------- */
function parseM3U(url, txt) {
  programSel.empty().append(new Option("Select Channel", ""));
  variantSel.hide().empty();
  variantsCache.clear();
  currentAutoMasterUrl = null;

  const lines = txt.split("\n").map((l) => l.trim()).filter(Boolean);
  const channels = [];
  let currentName = null;

  for (const l of lines) {
    if (l.startsWith("#EXTINF")) {
      const name = l.split(",").pop().trim();
      currentName = name || "Unknown";
    } else if (!l.startsWith("#")) {
      // Resolve channel URL relative to the root URL
      const channelUrl = new URL(l, url).href; // FIXED: Need to resolve relative URLs
      channels.push({ name: currentName || "Unknown", url: channelUrl });
      currentName = null;
    }
  }

  channels.forEach((ch) => {
    programSel.append(new Option(ch.name, ch.url));
  });
  programSel.trigger("change.select2");
  log(`✅ Loaded ${channels.length} channels`);

  if (channels.length > 0) {
    const firstUrl = channels[0].url;
    // Auto-select the first program
    programSel.val(firstUrl).trigger("change");
    // Playback and variant check will be handled by programSel 'change' event -> getVariantsFromUrl
  }
}

/* ---------- Parse Master Playlist From Root URL ---------- */
function parseMasterFromRoot(masterUrl, txt) {
  variantsCache.clear();
  programSel.empty().append(new Option("Program 1", masterUrl));
  programSel.trigger("change.select2");

  currentAutoMasterUrl = masterUrl;
  // autoStart=true ensures default 'Auto' is selected and playback starts, 
  // unless loadAndApplySelections overrides it.
  parseAndFillVariants(masterUrl, txt, true);
}

/* ---------- Parse and Fill Variants from a Master Playlist ---------- */
function parseAndFillVariants(masterUrl, txt, autoStart = false) {
  const lines = txt.split("\n").map((l) => l.trim()).filter(Boolean);
  const variants = [];
  let current = null;

  for (const l of lines) {
    if (l.startsWith("#EXT-X-STREAM-INF")) {
      const bwMatch =
        l.match(/BANDWIDTH=(\d+)/i) ||
        l.match(/AVERAGE-BANDWIDTH=(\d+)/i);
      const bw = bwMatch ? bwMatch[1] : "0";
      const resMatch = l.match(/RESOLUTION=(\d+x\d+)/i);
      const res = resMatch ? resMatch[1] : "";
      // Extract Codecs, helpful for template result
      const codecsMatch = l.match(/CODECS="([^"]+)"/i);
      const codecs = codecsMatch ? codecsMatch[1] : "";
      current = { bw, res, codecs };
    } else if (!l.startsWith("#") && current) {
      const full = new URL(l, masterUrl).href;
      variants.push({ ...current, url: full });
      current = null;
    }
  }

  variantsCache.set(masterUrl, variants);

  variantSel.empty().show();

  // Auto option always present
  variantSel.append(new Option("Auto (Adaptive)", "auto"));

  variants.forEach((v) => {
    const kbps = v.bw ? Math.round(Number(v.bw) / 1000) : 0;
    const label = v.res
      ? v.res + (kbps ? ` @~${kbps} Kbps` : "")
      : kbps
      ? `~${kbps} Kbps`
      : "Variant";
      // Store relevant data on the option element for Select2 template
    const option = new Option(label, v.url);
    $(option).data({ res: v.res, kbps: kbps, codecs: v.codecs });
    variantSel.append(option);
  });

  variantSel.trigger("change.select2");
  log(`✅ Found ${variants.length} variants`);

  if (autoStart) {
    variantSel.val("auto").trigger("change");
    // Playback will start via the variantSel change handler
  }
}

/* ---------- Fetch Variants For a URL (Program selection) ---------- */
async function getVariantsFromUrl(u) {
  if (!u || u === "#") return;
  // IMPORTANT: Stop any existing playback when program changes
  resetUI(); 

  // 1. Check cache first
  if (variantsCache.has(u)) {
    const cached = variantsCache.get(u);
    if (cached && cached.length) {
      // re-fill dropdown from cache
      variantSel.empty().show();
      variantSel.append(new Option("Auto (Adaptive)", "auto"));
      cached.forEach((v) => {
        const kbps = v.bw ? Math.round(Number(v.bw) / 1000) : 0;
        const label = v.res
          ? v.res + (kbps ? ` @~${kbps} Kbps` : "")
          : kbps
          ? `~${kbps} Kbps`
          : "Variant";
        const option = new Option(label, v.url);
        $(option).data({ res: v.res, kbps: kbps, codecs: v.codecs });
        variantSel.append(option);
      });
      variantSel.val("auto").trigger("change.select2"); // Select Auto, playback will start
      variantSel.trigger("change"); 
      currentAutoMasterUrl = u;
      return;
    } else {
      // Cached as single stream
      log("ℹ️ Program is a single-bitrate stream (from cache).");
      variantSel.hide().empty();
      currentAutoMasterUrl = null;
      // SAVE SELECTION FOR SINGLE STREAM
      saveSelections(u, u);
      startPlayback(u, false); // Start playback immediately
      return;
    }
  }

  // 2. Fetch and check
  try {
    log(`🔍 Checking variants from: ${u}`);
    const res = await fetch(u, { cache: "no-store" });
    const txt = await res.text();

    if (!txt.toLowerCase().includes("#ext-x-stream-inf")) {
      log("ℹ️ No variants found for this program (single-bitrate stream).");
      variantSel.hide().empty();
      variantsCache.set(u, []); // Cache as single stream
      currentAutoMasterUrl = null;
      // SAVE SELECTION FOR SINGLE STREAM
      saveSelections(u, u);
      startPlayback(u, false); // Start playback immediately
      return;
    }

    // Variants found
    currentAutoMasterUrl = u;
    parseAndFillVariants(u, txt, true); // Fills variants and auto-selects 'Auto'
  } catch (e) {
    log(`❌ Failed to fetch variants: ${e.message}`);
    currentAutoMasterUrl = null;
  }
}

/* ---------- Start Playback ---------- */
async function startPlayback(url, autoMode = false) {
  // NOTE: resetUI is called by variantSel/programSel change handlers
  startTime = Date.now();
  if (!url) {
    log("⚠ No stream URL");
    return;
  }

  // update current URL link (but still hidden until user shows)
  playingLink.href = url;
  playingLink.textContent = url;

  if (Hls.isSupported()) {
    hls = new Hls({
      enableWorker: true,
      liveDurationInfinity: true,
      // For low latency live streams
      liveSyncDurationCount: 3, 
    });

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(() => {});
      log("▶ Manifest parsed, playback starting");
    });

    attachHlsEvents();

    // Use currentAutoMasterUrl for Hls.loadSource if in autoMode, otherwise use the selected variant/program url
    const src = autoMode && currentAutoMasterUrl
      ? currentAutoMasterUrl
      : url;

    hls.loadSource(src);
    hls.attachMedia(video);

    if (autoMode) {
      hls.currentLevel = -1; // auto-ABR
      log("🔀 Auto ABR enabled");
    }

    log(`🎬 Now playing: ${src}`);
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    // Safari
    video.src = url;
    video.play();
    log("▶ Native HLS playback");
  } else {
    log("❌ HLS not supported in this browser");
  }
}

/* ---------- HLS Events: Bitrate & Resolution (THROUGHPUT-BASED) ---------- */
function attachHlsEvents() {
  if (!hls) return;

  /* ---- FIXED BITRATE CALCULATION USING HEAD REQUEST ---- */
  hls.on(Hls.Events.FRAG_LOADED, async (_, data) => {
    try {
        const segUrl = data.frag.url;
        const segDur = data.frag.duration || 1;

        // HEAD request to get Content-Length (segment size)
        const head = await fetch(segUrl, { method: "HEAD" });
        const sizeBytes = Number(head.headers.get("Content-Length")) || 0;

        /* Compute bitrate */
        const bits = sizeBytes * 8;
        const kbps = (bits / segDur) / 1000;

        /* Update totals for average bitrate */
        totalBits += bits;
        totalDur += segDur;
        segments++;

        /* Update UI */
        ui.curr.textContent = human(kbps);
        ui.avg.textContent = totalDur ? human((totalBits / totalDur) / 1000) : "0";
        ui.segCount.textContent = segments;

    } catch (e) {
        console.warn("Bitrate calc failed:", e);
    }
  });


  // Resolution + nominal bitrate (from level info) + LOG ABR SWITCHING
  hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
    const level = hls.levels?.[data.level];
    if (!level) return;

    const w = level.width || video.videoWidth || 0;
    const h = level.height || video.videoHeight || 0;
    const br = level.bitrate || 0;
    const brKbps = br ? Math.round(br / 1000) : 0;

    if (w && h && brKbps) {
      ui.res.textContent = `${w}x${h} @~${brKbps} Kbps`;
    } else if (w && h) {
      ui.res.textContent = `${w}x${h}`;
    }
    
    // Log ABR Switch
    log(`📶 ABR Switched to Level ${data.level}: ${w}x${h} @~${brKbps} Kbps`);
  });
  
  // Log Stream Errors
  hls.on(Hls.Events.ERROR, (_, data) => {
      const type = data.type;
      const details = data.details;
      const fatal = data.fatal;
      log(`🚨 HLS Error! Type: ${type}, Details: ${details}, Fatal: ${fatal}`);
  });

  video.addEventListener("loadedmetadata", () => {
    if (video.videoWidth && video.videoHeight && ui.res.textContent === "—") {
      ui.res.textContent = `${video.videoWidth}x${video.videoHeight}`;
    }
  });

  // Interval for time, buffer, latency, and dropped frames monitoring
  monitoringInterval = setInterval(() => {
    if (startTime) {
      const elapsed = (Date.now() - startTime) / 1000;
      ui.time.textContent = formatTime(elapsed);
    }
    
    if (hls && hls.media) {
        // Buffer Length (time remaining in the buffer, in seconds)
        const buffered = hls.media.buffered;
        const currentBuffer = buffered.length > 0
            ? buffered.end(buffered.length - 1) - hls.media.currentTime
            : 0;
        ui.buff.textContent = human(Math.max(0, currentBuffer));

        // Latency (Live Delay) - only available if the stream is live
        if (hls.latency !== undefined) {
             ui.latency.textContent = hls.latency > 0 ? human(hls.latency) : "0";
        } else {
             // Not a live stream or latency unknown
             ui.latency.textContent = "—";
        }
        
        // Dropped Frames check
        const currentDropped = video.webkitDroppedFrameCount || video.mozDroppedFrameCount || 0;
        if (currentDropped > droppedFrames) {
            droppedFrames = currentDropped;
        }
        ui.dropped.textContent = droppedFrames;

    } else {
         ui.buff.textContent = "0";
         ui.latency.textContent = "—";
         ui.dropped.textContent = "0";
    }
  }, 500); // Check every 500ms
}

/* ---------- UI Handlers ---------- */
loadBtn.onclick = () => {
  const url = urlInput.value.trim();
  if (!url) return log("Enter .m3u / .m3u8 / HLS URL");
  detectAndParse(url);
};

urlInput.addEventListener("paste", () => {
  setTimeout(() => {
    const url = urlInput.value.trim();
    if (url) detectAndParse(url);
  }, 150);
});

// Clear URL Button Handler
clearUrlBtn.onclick = () => {
    urlInput.value = '';
    resetUI(); // Clear video, stats, and dropdowns
    log("🗑️ Input URL cleared.");
};

programSel.on("change", function () {
  const u = $(this).val();
  if (!u) {
    resetUI();
    variantSel.hide().empty();
    return;
  }
  getVariantsFromUrl(u);
});

variantSel.on("change", function () {
  const val = $(this).val();
  if (!val) {
    // Do nothing if selection is cleared
    return;
  }

  // SAVE SELECTION ON CHANGE
  saveSelections(programSel.val(), val);

  if (val === "auto") {
    const master = currentAutoMasterUrl || urlInput.value.trim();
    if (!master) {
      log("⚠ Cannot start Auto mode: Master URL is missing.");
      return;
    }
    startPlayback(master, true);
  } else {
    startPlayback(val, false);
  }
});

stopBtn.onclick = resetUI;

// Full Application Reset Handler
resetAppBtn.onclick = () => {
    const confirmation = confirm(
        "Are you sure you want to fully reset the application?\n\n" +
        "This will STOP playback, clear all statistics, clear the URL input, " +
        "and ERASE all stored URL history AND saved stream selections from your browser."
    );
    
    if (confirmation) {
        // 1. Clear current playback/UI state
        resetUI(); 
        
        // 2. Clear URL input and program/variant selections
        urlInput.value = '';
        // Use .val('') then .trigger('change.select2') to reset Select2s
        programSel.empty().append(new Option("Program", "")).val('').trigger('change.select2'); 
        variantSel.empty().append(new Option("Variant", "")).val('').trigger('change.select2').hide();

        // 3. Clear stored history AND saved selections
        clearUrlHistory();
        localStorage.removeItem(PROGRAM_KEY);
        localStorage.removeItem(VARIANT_KEY);
        
        log("🔄 Application fully reset. History, stream data, and input cleared.");
    } else {
        log("❌ Reset cancelled by user.");
    }
};

/* ---------- Select2 Templates ---------- */

// Select2 template for variants: adds resolution and bitrate info
function formatVariantResult(option) {
  // If it's a default option (e.g., placeholder), return text directly
  if (!option.id || !option.element) {
    return option.text;
  }

  const $option = $(option.element);
  const data = $option.data();
  // Get data stored earlier
  const res = data.res || 'N/A';
  const kbps = data.kbps ? `${data.kbps} Kbps` : 'N/A';
  // Use the first codec or 'N/A'
  const codecs = data.codecs ? data.codecs.split(',')[0] : 'N/A';

  // For the 'Auto' option
  if (option.id === "auto") {
    // Return a native DOM element
    const autoSpan = document.createElement('span');
    autoSpan.innerHTML = '<strong style="color: var(--accent);">Auto (Adaptive)</strong>';
    return autoSpan;
  }

  // Build the custom HTML structure for other variants
  const container = document.createElement('div');
  container.className = 'variant-result';
  container.innerHTML = `
    <div class="variant-label">${$option.text()}</div>
    <div class="variant-details">
      <span class="detail-item"><strong>Res:</strong> ${res}</span>
      <span class="detail-item"><strong>Rate:</strong> ${kbps}</span>
      <span class="detail-item"><strong>Codec:</strong> ${codecs}</span>
    </div>
  `;
  
  // Return the raw DOM element for Select2 to render HTML
  return container;
}

// Select2 template for selection: only shows the basic text label in the input box
function formatVariantSelection(option) {
    if (option.id === "auto") {
        return "Auto (Adaptive)";
    }
    // Return the clean, plain text label
    if (option.text && option.text.length > 0) {
        return option.text;
    }
    // Fallback to the text from the underlying option element
    if (option.element) {
        return option.element.text;
    }
    return option.id;
}


$(document).ready(function () {
  loadUrlHistory(); // Load history on startup

  $("#program").select2({
    width: "resolve",
    placeholder: "Select Program...",
    dropdownParent: $("body"),
  });

  $("#variant").select2({
    width: "resolve",
    placeholder: "Select Variant...",
    dropdownParent: $("body"),
    // Template for items in the dropdown
    templateResult: formatVariantResult,
    // Template for the selected item in the input box
    templateSelection: formatVariantSelection,
  });
});