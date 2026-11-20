/* ==========================================================================
   MAMFLIX — THE STORY OF HER
   Film Engine, Web Audio Controller, Video & Wishes Logic (js/main.js)
   ==========================================================================
   Pure vanilla JavaScript. Reads all text, photos, ministry videos, birthday
   wishes, audio settings, and chapter timings from window.MAMFLIX_CONTENT.
   ========================================================================== */

(function () {
  "use strict";

  const CONTENT = window.MAMFLIX_CONTENT;
  if (!CONTENT) {
    console.error("MAMFLIX_CONTENT not found. Check that js/content.js is loaded before js/main.js.");
    return;
  }

  /* ------------------------------------------------------------------------
     1. HELPERS & DEMO MODE FLAGS
     ------------------------------------------------------------------------ */

  function isDemoAuto() {
    return CONTENT.demoMode !== "off";
  }

  function shouldShowDemoTags() {
    return isDemoAuto() && CONTENT.showDemoTags !== false;
  }

  function getBasename(path) {
    if (!path) return "photo.jpg";
    const parts = path.split("/");
    return parts[parts.length - 1] || path;
  }

  // Returns an alternate .jpeg/.jpg path so the loader quietly tries "name.jpeg"
  // if "name.jpg" is not found (or vice-versa) before falling back to the demo frame.
  function getAlternateJpegPath(src) {
    if (!src || typeof src !== "string") return "";
    if (/\.jpg$/i.test(src)) {
      return src.replace(/\.jpg$/i, ".jpeg");
    }
    if (/\.jpeg$/i.test(src)) {
      return src.replace(/\.jpeg$/i, ".jpg");
    }
    return "";
  }

  function getKenBurnsClass(direction) {
    switch (direction) {
      case "zoom-out":
        return "kb-zoom-out";
      case "pan-left":
        return "kb-pan-left";
      case "pan-right":
        return "kb-pan-right";
      case "zoom-in":
      default:
        return "kb-zoom-in";
    }
  }

  // Returns all wishes configured in content.js
  function getAllWishes() {
    return Array.isArray(CONTENT.wishes) ? CONTENT.wishes : [];
  }

  // Returns featured wishes for the "Voices of Love" film chapter (capped at maxFeaturedWishesInFilm)
  function getFeaturedWishes() {
    const maxCount = CONTENT.maxFeaturedWishesInFilm || 8;
    return getAllWishes()
      .filter(function (w) {
        return w && w.featured !== false;
      })
      .slice(0, maxCount);
  }

  // Returns active chapters (hides "wishes" chapter gracefully if wishes list is empty and demoMode is "off")
  function getActiveChapters() {
    const featuredWishes = getFeaturedWishes();
    return (CONTENT.chapters || []).filter(function (ch) {
      if (ch.type === "wishes" && featuredWishes.length === 0 && !isDemoAuto()) {
        return false;
      }
      return true;
    });
  }

  /* ------------------------------------------------------------------------
     2. SMART FIT, PHOTO DECODING & AUTOMATIC ABSTRACT DEMO FALLBACKS
     ------------------------------------------------------------------------
     - Never uses stock photos, fake footage, or images of people.
     - Smart Fit: compares the loaded photo's aspect ratio with the viewport's
       aspect ratio (and re-evaluates on window resize & orientation change):
         * If they are close (difference under ~25%), or fit === "cover", uses
           object-fit: cover with the photo's focalPoint.
         * If they differ significantly (e.g. portrait photo on a landscape screen,
           or vice versa), or fit === "contain", displays the whole photo centered
           with object-fit: contain over a blurred (36px), darkened, slightly
           scaled-up copy of the same photo + plum tint.
         * Hero photo uses cover with its focal point on matching orientations,
           and automatically uses the blurred-fill method if the hero photo is
           portrait on a landscape screen so her face is never cut off.
     - Never upscales a photo beyond its natural pixel dimensions.
     - Preloads and decodes (img.decode()) the next 1–2 scenes' photos while the
       current scene plays, holding cross-fades until decoded (with a 3s slow-network
       grace fallback that shows the soft plum frame briefly and fades the photo in
       when ready, never freezing the film).
     ------------------------------------------------------------------------ */

  const activeSmartStages = new Set();
  const activeSmartVideos = new Set();

  function evaluateSmartVideoFit(videoEntry) {
    if (!videoEntry || !videoEntry.wrapper || !videoEntry.video) return;
    const wrapper = videoEntry.wrapper;
    const video = videoEntry.video;

    if (!wrapper.isConnected) {
      activeSmartVideos.delete(videoEntry);
      return;
    }

    const vidW = video.videoWidth || 0;
    const vidH = video.videoHeight || 0;
    if (!vidW || !vidH) return;

    const viewW = wrapper.clientWidth || window.innerWidth || 1;
    const viewH = wrapper.clientHeight || window.innerHeight || 1;

    const vidRatio = vidW / vidH;
    const screenRatio = viewW / viewH;
    const fitMode = (videoEntry.fit || "auto").toLowerCase();

    let useContain = false;

    if (fitMode === "contain") {
      useContain = true;
    } else if (fitMode === "cover") {
      useContain = false;
    } else {
      // Compare video aspect ratio with screen aspect ratio:
      // If close (difference under ~25% or matching orientation within 32%), use object-fit: cover;
      // otherwise use object-fit: contain over the soft darkened plum + blurred poster backdrop.
      const bothPortrait = vidRatio < 0.95 && screenRatio < 0.95;
      const bothLandscape = vidRatio > 1.05 && screenRatio > 1.05;
      const relativeDiff = Math.abs(vidRatio - screenRatio) / Math.max(vidRatio, screenRatio);
      const closeEnough = relativeDiff < 0.25 || (bothPortrait && relativeDiff < 0.34) || (bothLandscape && relativeDiff < 0.28);
      useContain = !closeEnough;
    }

    wrapper.classList.toggle("is-contain", useContain);

    // Tell the caption card how much empty blurred space the contained video leaves (above/below and beside)
    if (videoEntry.fitSeq && videoEntry.fitSeq === fitSeqLatest) {
      recordContainSpace(viewW, viewH, vidW, vidH, useContain);
    }

    // When a landscape video is shown with contain on a portrait phone, place the sender's name
    // and relationship in the empty blurred space below the video, never on top of the video.
    const wishOverlayEl = document.getElementById("wish-film-overlay");
    if (wishOverlayEl && videoEntry.isWish) {
      wishOverlayEl.classList.toggle("pos-contain-below", useContain);
    }
  }

  // --- Caption placement helpers (shared by photos and videos) ---
  let fitSeqLatest = 0; // Only the newest on-stage photo/video reports its empty space to the caption card

  function recordContainSpace(viewW, viewH, mediaW, mediaH, useContain) {
    const bar = document.getElementById("subtitle-bar");
    if (!bar) return;
    let sideSpace = 0;
    let vSpace = 0;
    if (useContain) {
      const scale = Math.min(viewW / mediaW, viewH / mediaH, 1); // never upscale
      const dispW = mediaW * scale;
      const dispH = mediaH * scale;
      sideSpace = Math.max(0, (viewW - dispW) / 2);
      vSpace = Math.max(0, (viewH - dispH) / 2);
    }
    bar.dataset.contained = useContain ? "1" : "0";
    bar.dataset.sideSpace = String(Math.round(sideSpace));
    bar.dataset.vSpace = String(Math.round(vSpace));
    applyCaptionPlacement();
  }

  // Decides where the compact caption card sits so it never covers faces:
  //  - side:  wide screens with >= 220px of empty blurred space beside the photo (vertically centred)
  //  - top:   focal point lower than 55% (people low in frame) or faces: "lower"
  //  - bottom: otherwise (default)
  // It is never placed in the middle of the photo.
  function applyCaptionPlacement() {
    const bar = document.getElementById("subtitle-bar");
    if (!bar) return;
    const req = (bar.dataset.reqPos || "auto").toLowerCase();
    const faces = (bar.dataset.faces || "").toLowerCase();
    const focalY = parseFloat(bar.dataset.focalY);
    const fy = isNaN(focalY) ? 30 : focalY;
    const contained = bar.dataset.contained === "1";
    const sideSpace = parseFloat(bar.dataset.sideSpace) || 0;
    const canSide = contained && sideSpace >= 220;

    const verticalChoice = function () {
      if (faces === "lower") return "top";
      if (faces === "upper") return "bottom";
      return fy <= 55 ? "bottom" : "top";
    };

    let pos;
    if (req === "top" || req === "bottom") {
      pos = req;
    } else if (req === "side") {
      pos = canSide ? "side" : verticalChoice();
    } else {
      pos = canSide ? "side" : verticalChoice();
    }

    bar.classList.toggle("pos-top", pos === "top");
    bar.classList.toggle("pos-bottom", pos === "bottom");
    bar.classList.toggle("pos-side", pos === "side");
    bar.classList.toggle("is-faces-both", faces === "both");
    if (pos === "side") {
      bar.style.setProperty("--side-w", Math.floor(sideSpace) + "px");
    } else {
      bar.style.removeProperty("--side-w");
    }
  }

  function evaluateSmartFit(stageEntry) {
    if (!stageEntry || !stageEntry.wrapper || !stageEntry.img) return;
    const wrapper = stageEntry.wrapper;
    const img = stageEntry.img;

    if (!wrapper.isConnected) {
      activeSmartStages.delete(stageEntry);
      return;
    }

    const natW = img.naturalWidth || 0;
    const natH = img.naturalHeight || 0;
    if (!natW || !natH) return;

    const viewW = wrapper.clientWidth || window.innerWidth || 1;
    const viewH = wrapper.clientHeight || window.innerHeight || 1;

    const imgRatio = natW / natH;
    const screenRatio = viewW / viewH;
    const fitMode = (stageEntry.fit || "auto").toLowerCase();
    const isHero = stageEntry.isHero === true;

    let useContain = false;

    if (fitMode === "contain") {
      useContain = true;
    } else if (fitMode === "cover") {
      useContain = false;
    } else if (isHero) {
      // Hero uses cover with its focal point, except when the photo is portrait
      // and the screen is landscape (extra-safe so her face is never cropped)
      const isPhotoPortrait = imgRatio < 0.95;
      const isScreenLandscape = screenRatio > 1.08;
      useContain = isPhotoPortrait && isScreenLandscape;
    } else {
      // Smart Fit "auto": compare photo aspect ratio vs screen aspect ratio.
      // Same orientation (portrait-on-portrait or landscape-on-landscape) or difference
      // under ~25% uses cover with the photo's focalPoint; mismatched orientations
      // or >25% difference use contain + blurred backdrop so faces are never cut off.
      const bothPortrait = imgRatio < 0.95 && screenRatio < 0.95;
      const bothLandscape = imgRatio > 1.05 && screenRatio > 1.05;
      const relativeDiff = Math.abs(imgRatio - screenRatio) / Math.max(imgRatio, screenRatio);
      const closeEnough = relativeDiff < 0.25 || (bothPortrait && relativeDiff < 0.36) || (bothLandscape && relativeDiff < 0.28);
      useContain = !closeEnough;
    }

    wrapper.classList.toggle("is-contain", useContain);

    // Report empty blurred space to the caption card (newest on-stage photo only, never the hero)
    if (!isHero && stageEntry.fitSeq && stageEntry.fitSeq === fitSeqLatest) {
      recordContainSpace(viewW, viewH, natW, natH, useContain);
    }

    // Never upscale a photo beyond its natural pixel size (accounting for devicePixelRatio)
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const maxCssW = Math.round(natW / dpr);
    const maxCssH = Math.round(natH / dpr);

    // If the image's natural pixel dimensions are smaller than the viewport even at 1x CSS pixels,
    // cap its display size to naturalWidth / naturalHeight and enable the blurred backdrop behind it.
    if (natW < viewW || natH < viewH) {
      wrapper.classList.add("is-contain", "is-natural-capped");
      img.style.maxWidth = Math.min(natW, viewW) + "px";
      img.style.maxHeight = Math.min(natH, viewH) + "px";
    } else if (useContain && (maxCssW < viewW || maxCssH < viewH)) {
      img.style.maxWidth = "100%";
      img.style.maxHeight = "100%";
      wrapper.classList.remove("is-natural-capped");
    } else {
      img.style.maxWidth = "100%";
      img.style.maxHeight = "100%";
      wrapper.classList.remove("is-natural-capped");
    }
  }

  function refreshAllSmartFitStages() {
    activeSmartStages.forEach(function (entry) {
      evaluateSmartFit(entry);
    });
    activeSmartVideos.forEach(function (vEntry) {
      evaluateSmartVideoFit(vEntry);
    });
    evaluateLetterTruncation();
  }

  window.addEventListener("resize", refreshAllSmartFitStages, { passive: true });
  window.addEventListener("orientationchange", function () {
    setTimeout(refreshAllSmartFitStages, 120);
  }, { passive: true });

  function renderDemoFrame(container, options) {
    if (!container) return;
    const opts = options || {};
    const kbClass = getKenBurnsClass(opts.kenBurns);
    const kbDuration = Math.max(opts.durationSec || 12, 8) + 2.5;
    const prefix = opts.labelPrefix || "DEMO PHOTO";
    const fileName = getBasename(opts.src || "photo.jpg");
    const folderHint = opts.folderHint || "assets/photos/";

    container.innerHTML = "";
    const frame = document.createElement("div");
    frame.className = "demo-frame " + kbClass;
    frame.style.setProperty("--kb-dur", kbDuration + "s");

    const outline = document.createElement("div");
    outline.className = "demo-frame-outline";

    const monogram = document.createElement("span");
    monogram.className = "demo-frame-monogram";
    monogram.textContent = "M";
    outline.appendChild(monogram);

    if (isDemoAuto()) {
      const label = document.createElement("span");
      label.className = "demo-frame-label";
      label.textContent = prefix + " · replace with " + fileName;
      outline.appendChild(label);

      const sub = document.createElement("p");
      sub.className = "demo-frame-sub";
      sub.textContent = "Drop " + fileName + " into " + folderHint + " to play automatically";
      outline.appendChild(sub);
    }

    frame.appendChild(outline);
    container.appendChild(frame);
  }

  /* ------------------------------------------------------------------------
     3. PHOTO CACHE, ASYNC DECODE & SELECTIVE NEXT-SCENE PRELOADER
     ------------------------------------------------------------------------ */

  const decodedPhotoCache = new Map(); // src -> Promise<{ resolvedSrc, naturalWidth, naturalHeight }>

  function loadAndDecodePhoto(src, highPriority) {
    if (!src) return Promise.reject(new Error("Empty photo src"));
    if (decodedPhotoCache.has(src)) {
      return decodedPhotoCache.get(src);
    }

    const promise = new Promise(function (resolve, reject) {
      const probe = new Image();
      probe.decoding = "async";
      if (highPriority) {
        try {
          probe.fetchPriority = "high";
          probe.setAttribute("fetchpriority", "high");
        } catch (e) {}
      }

      let triedAlternateJpeg = false;
      let activeSrc = src;

      const finalizeLoad = function () {
        const done = function () {
          resolve({
            resolvedSrc: activeSrc,
            naturalWidth: probe.naturalWidth || 1920,
            naturalHeight: probe.naturalHeight || 1080
          });
        };
        if (typeof probe.decode === "function") {
          probe.decode().then(done).catch(done);
        } else {
          done();
        }
      };

      probe.onload = finalizeLoad;

      probe.onerror = function () {
        if (!triedAlternateJpeg) {
          triedAlternateJpeg = true;
          const altSrc = getAlternateJpegPath(src);
          if (altSrc) {
            activeSrc = altSrc;
            probe.src = altSrc;
            return;
          }
        }
        decodedPhotoCache.delete(src);
        reject(new Error("Missing photo: " + src));
      };

      probe.src = src;
    });

    decodedPhotoCache.set(src, promise);
    return promise;
  }

  function preloadPhoto(src, highPriority) {
    if (!src) return;
    loadAndDecodePhoto(src, Boolean(highPriority)).catch(function () {});
  }

  function buildSmartPhotoDOM(resolvedSrc, photoConfig, durationSec, isHero) {
    const focalPoint = (photoConfig && photoConfig.focalPoint) || (isHero ? "50% 22%" : "50% 30%");
    const kbClass = getKenBurnsClass(photoConfig && photoConfig.kenBurns);
    const kbDuration = Math.max(durationSec || 12, 8) + 2.5;
    const fitSetting = (photoConfig && photoConfig.fit) || "auto";

    const wrapper = document.createElement("div");
    wrapper.className = "smart-photo-wrapper" + (isHero ? " hero-fade-in" : "");

    // Blurred, darkened, scaled-up backdrop copy (visible only when smart-fit chooses contain)
    const blurBg = new Image();
    blurBg.className = "photo-backdrop-blur";
    blurBg.alt = "";
    blurBg.decoding = "async";
    blurBg.setAttribute("aria-hidden", "true");
    blurBg.style.objectPosition = focalPoint;
    blurBg.src = resolvedSrc;

    const plumTint = document.createElement("div");
    plumTint.className = "photo-backdrop-plum-tint";
    plumTint.setAttribute("aria-hidden", "true");

    // Main sharp foreground photo
    const img = new Image();
    img.className = "photo-element " + kbClass;
    img.alt = "";
    img.decoding = "async";
    if (isHero) {
      try {
        img.fetchPriority = "high";
        img.setAttribute("fetchpriority", "high");
      } catch (e) {}
    }
    img.style.objectPosition = focalPoint;
    img.style.setProperty("--kb-dur", kbDuration + "s");
    img.src = resolvedSrc;

    wrapper.appendChild(blurBg);
    wrapper.appendChild(plumTint);
    wrapper.appendChild(img);

    const stageEntry = {
      wrapper: wrapper,
      img: img,
      fit: fitSetting,
      isHero: Boolean(isHero),
      fitSeq: isHero ? 0 : ++fitSeqLatest
    };

    activeSmartStages.add(stageEntry);

    if (img.complete && img.naturalWidth > 0) {
      evaluateSmartFit(stageEntry);
    } else {
      img.addEventListener("load", function () {
        evaluateSmartFit(stageEntry);
      }, { once: true });
    }

    return { wrapper: wrapper, stageEntry: stageEntry };
  }

  function populateMediaStage(container, photoConfig, durationSec, options) {
    if (!container) return;
    const opts = options || {};
    const isHero = opts.isHero === true;
    const onReady = opts.onReady || function () {};
    const src = (photoConfig && photoConfig.src) || (photoConfig && photoConfig.photo) || "";

    const fallback = function () {
      renderDemoFrame(container, {
        src: src,
        kenBurns: photoConfig && photoConfig.kenBurns,
        durationSec: durationSec,
        labelPrefix: "DEMO PHOTO",
        folderHint: "assets/photos/"
      });
      onReady();
    };

    if (!src) {
      fallback();
      return;
    }

    // For the hero, show a fine, subtle gold loading shimmer while decoding
    if (isHero) {
      container.innerHTML = '<div class="hero-loading-shimmer" aria-hidden="true"></div>';
    }

    let slowTimeoutTriggered = false;
    let settled = false;

    // 3-second slow-network safety timer: if a photo takes > 3s, show the soft demo/plum
    // frame briefly so the film never freezes, then fade the real photo in when ready.
    const slowTimer = setTimeout(function () {
      if (settled) return;
      slowTimeoutTriggered = true;
      renderDemoFrame(container, {
        src: src,
        kenBurns: photoConfig && photoConfig.kenBurns,
        durationSec: durationSec,
        labelPrefix: "DEMO PHOTO",
        folderHint: "assets/photos/"
      });
      onReady();
    }, 3000);

    loadAndDecodePhoto(src, isHero)
      .then(function (result) {
        settled = true;
        clearTimeout(slowTimer);

        const built = buildSmartPhotoDOM(result.resolvedSrc, photoConfig, durationSec, isHero || slowTimeoutTriggered);
        container.innerHTML = "";
        container.appendChild(built.wrapper);
        requestAnimationFrame(function () {
          evaluateSmartFit(built.stageEntry);
        });

        if (!slowTimeoutTriggered) {
          onReady();
        }
      })
      .catch(function () {
        settled = true;
        clearTimeout(slowTimer);
        if (!slowTimeoutTriggered) {
          fallback();
        }
      });
  }

  function preloadChapterPhotos(chapter, maxScenes) {
    if (!chapter) return;
    if (chapter.backgroundPhoto) {
      preloadPhoto(chapter.backgroundPhoto, false);
    }
    if (Array.isArray(chapter.scenes)) {
      const limit = typeof maxScenes === "number" ? maxScenes : chapter.scenes.length;
      chapter.scenes.slice(0, limit).forEach(function (scene, idx) {
        if (scene.type !== "video" && scene.photo) {
          preloadPhoto(scene.photo, idx === 0);
        }
      });
    }
  }

  /* ------------------------------------------------------------------------
     4. AUDIO CONTROLLER (Real Piano + Live Web Audio Fallback + Ducking)
     ------------------------------------------------------------------------ */

  class AudioDirector {
    constructor(audioConfig) {
      this.cfg = Object.assign({
        pianoSrc: "assets/audio/piano.mp3",
        singingSrc: "assets/audio/mam-singing.mp3",
        pianoNormalVolume: 0.55,
        pianoDuckedVolume: 0.10,
        pianoLetterVolume: 0.42,
        singingVolume: 0.92,
        singingStartDelaySec: 4,
        singingSeekStartSec: 0,
        fadeDurationMs: 2200
      }, audioConfig || {});

      this.isMuted = false;
      this.isPaused = false;
      this.usingDemoPiano = false;
      this.singingFileAvailable = false;
      this.isSingingActive = false;

      this.targetPianoVolume = this.cfg.pianoNormalVolume;
      this.currentPianoVolume = this.cfg.pianoNormalVolume;

      this.pianoAudio = null;
      this.singingAudio = null;

      this.audioCtx = null;
      this.masterGain = null;
      this.chordTimer = null;
      this.chordIndex = 0;

      this.fadeRaf = null;
      this.placeholderDuckTimer = null;
    }

    unlockAndStartPiano(onStatusChange) {
      this.onStatusChange = onStatusChange || function () {};

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass && !this.audioCtx) {
        try {
          this.audioCtx = new AudioContextClass();
          if (this.audioCtx.state === "suspended") {
            this.audioCtx.resume().catch(function () {});
          }
        } catch (e) {
          this.audioCtx = null;
        }
      }

      const piano = new Audio();
      piano.loop = true;
      piano.preload = "auto";
      piano.volume = this.isMuted ? 0 : this.cfg.pianoNormalVolume;

      let settled = false;

      const fallbackToWebAudio = () => {
        if (settled) return;
        settled = true;
        this.pianoAudio = null;
        this.usingDemoPiano = true;
        this.startWebAudioFallbackPiano();
        this.onStatusChange({ usingDemoPiano: true });
      };

      piano.addEventListener("canplaythrough", () => {
        if (settled) return;
        settled = true;
        this.pianoAudio = piano;
        this.usingDemoPiano = false;
        piano.play().catch(function () {});
        this.onStatusChange({ usingDemoPiano: false });
      }, { once: true });

      piano.addEventListener("error", fallbackToWebAudio, { once: true });

      piano.src = this.cfg.pianoSrc;
      piano.load();

      setTimeout(() => {
        if (!settled && piano.readyState < 2) {
          fallbackToWebAudio();
        }
      }, 1400);
    }

    startWebAudioFallbackPiano() {
      if (!this.audioCtx) return;
      try {
        if (this.audioCtx.state === "suspended") {
          this.audioCtx.resume().catch(function () {});
        }

        this.masterGain = this.audioCtx.createGain();
        const initialVol = (this.isMuted || this.isPaused) ? 0 : this.currentPianoVolume * 0.24;
        this.masterGain.gain.setValueAtTime(initialVol, this.audioCtx.currentTime);
        this.masterGain.connect(this.audioCtx.destination);

        const chords = [
          [155.56, 233.08, 311.13, 392.00], // Eb3, Bb3, Eb4, G4
          [130.81, 196.00, 261.63, 311.13], // C3, G3, C4, Eb4
          [207.65, 261.63, 311.13, 392.00], // Ab3, C4, Eb4, G4
          [233.08, 293.66, 349.23, 466.16]  // Bb3, D4, F4, Bb4
        ];

        const playGentleChord = () => {
          if (!this.audioCtx || !this.masterGain || this.isPaused) return;
          const now = this.audioCtx.currentTime;
          const notes = chords[this.chordIndex % chords.length];
          this.chordIndex += 1;

          notes.forEach((freq, idx) => {
            const osc = this.audioCtx.createOscillator();
            const noteGain = this.audioCtx.createGain();
            const filter = this.audioCtx.createBiquadFilter();

            osc.type = idx === 0 ? "sine" : "triangle";
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);

            filter.type = "lowpass";
            filter.frequency.setValueAtTime(680, now);

            noteGain.gain.setValueAtTime(0.0001, now + idx * 0.08);
            noteGain.gain.linearRampToValueAtTime(0.16, now + idx * 0.08 + 0.55);
            noteGain.gain.exponentialRampToValueAtTime(0.04, now + 3.2);
            noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 5.6);

            osc.connect(filter);
            filter.connect(noteGain);
            noteGain.connect(this.masterGain);

            osc.start(now + idx * 0.08);
            osc.stop(now + 5.7);
          });
        };

        playGentleChord();
        if (this.chordTimer) clearInterval(this.chordTimer);
        this.chordTimer = setInterval(playGentleChord, 4800);
      } catch (e) {}
    }

    applyPianoVolumeImmediate(vol) {
      this.currentPianoVolume = Math.max(0, Math.min(1, vol));
      const effectiveVol = (this.isMuted || this.isPaused) ? 0 : this.currentPianoVolume;

      if (this.pianoAudio) {
        this.pianoAudio.volume = effectiveVol;
      }
      if (this.masterGain && this.audioCtx) {
        try {
          this.masterGain.gain.setTargetAtTime(effectiveVol * 0.24, this.audioCtx.currentTime, 0.15);
        } catch (e) {}
      }
    }

    fadePianoTo(targetVol, durationMs) {
      this.targetPianoVolume = Math.max(0, Math.min(1, targetVol));
      const dur = durationMs || this.cfg.fadeDurationMs || 2000;
      const startVol = this.currentPianoVolume;
      const diff = this.targetPianoVolume - startVol;
      const startTime = performance.now();

      if (this.fadeRaf) cancelAnimationFrame(this.fadeRaf);

      const step = (now) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / dur);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        this.applyPianoVolumeImmediate(startVol + diff * eased);
        if (t < 1) {
          this.fadeRaf = requestAnimationFrame(step);
        }
      };

      this.fadeRaf = requestAnimationFrame(step);
    }

    duckPiano(durationMs) {
      this.fadePianoTo(this.cfg.pianoDuckedVolume, durationMs || 1400);
    }

    restorePiano(durationMs) {
      this.fadePianoTo(this.cfg.pianoNormalVolume, durationMs || 1600);
    }

    startChapterTwoWorship(chapterDurationSec, callbacks) {
      const cb = callbacks || {};
      this.stopChapterTwoWorship(false);
      this.duckPiano(this.cfg.fadeDurationMs);

      const singing = new Audio();
      singing.preload = "auto";
      singing.volume = this.isMuted ? 0 : this.cfg.singingVolume;

      let settled = false;

      const handleMissingRecording = () => {
        if (settled) return;
        settled = true;
        this.singingAudio = null;
        this.singingFileAvailable = false;
        this.isSingingActive = true;

        if (cb.onPlaceholder) cb.onPlaceholder();

        const restoreAfterMs = Math.max(8000, ((chapterDurationSec || 70) - 8) * 1000);
        this.placeholderDuckTimer = setTimeout(() => {
          if (this.isSingingActive) {
            this.restorePiano(this.cfg.fadeDurationMs);
          }
        }, restoreAfterMs);
      };

      singing.addEventListener("canplaythrough", () => {
        if (settled) return;
        settled = true;
        this.singingAudio = singing;
        this.singingFileAvailable = true;
        this.isSingingActive = true;

        if (this.cfg.singingSeekStartSec > 0) {
          try {
            singing.currentTime = this.cfg.singingSeekStartSec;
          } catch (e) {}
        }

        if (!this.isPaused) {
          singing.play().catch(function () {});
        }

        if (cb.onPlayingReal) cb.onPlayingReal();
      }, { once: true });

      singing.addEventListener("ended", () => {
        this.isSingingActive = false;
        this.restorePiano(this.cfg.fadeDurationMs);
        if (cb.onEnded) cb.onEnded();
      });

      singing.addEventListener("error", handleMissingRecording, { once: true });

      singing.src = this.cfg.singingSrc;
      singing.load();

      setTimeout(() => {
        if (!settled && singing.readyState < 2) {
          handleMissingRecording();
        }
      }, 1300);
    }

    stopChapterTwoWorship(restorePiano = true) {
      if (this.placeholderDuckTimer) {
        clearTimeout(this.placeholderDuckTimer);
        this.placeholderDuckTimer = null;
      }
      this.isSingingActive = false;
      if (this.singingAudio) {
        try {
          this.singingAudio.pause();
          this.singingAudio.currentTime = 0;
        } catch (e) {}
        this.singingAudio = null;
      }
      if (restorePiano) {
        this.restorePiano(1400);
      }
    }

    setPaused(paused) {
      this.isPaused = paused;
      if (paused) {
        if (this.pianoAudio) this.pianoAudio.pause();
        if (this.singingAudio) this.singingAudio.pause();
        this.applyPianoVolumeImmediate(this.currentPianoVolume);
      } else {
        if (this.pianoAudio) this.pianoAudio.play().catch(function () {});
        if (this.singingAudio && this.isSingingActive) {
          this.singingAudio.play().catch(function () {});
        }
        this.applyPianoVolumeImmediate(this.currentPianoVolume);
      }
    }

    toggleMute() {
      this.isMuted = !this.isMuted;
      this.applyPianoVolumeImmediate(this.currentPianoVolume);
      if (this.singingAudio) {
        this.singingAudio.volume = this.isMuted ? 0 : this.cfg.singingVolume;
      }
      return this.isMuted;
    }
  }

  /* ------------------------------------------------------------------------
     5. AMBIENT PARTICLES INITIALIZER (24 soft dots, pauses on hidden tab)
     ------------------------------------------------------------------------ */

  function initAmbientParticles() {
    const container = document.getElementById("particles-container");
    if (!container) return;

    const count = 24;
    const frag = document.createDocumentFragment();

    for (let i = 0; i < count; i++) {
      const dot = document.createElement("span");
      dot.className = "ambient-particle";
      const size = (2.5 + (i % 4) * 1.4).toFixed(1);
      const left = ((i * 37) % 96) + 2;
      const top = ((i * 53) % 92) + 4;
      const dur = 15 + (i % 7) * 2.5;
      const delay = -((i * 1.9) % dur);
      const alpha = (0.14 + (i % 4) * 0.06).toFixed(2);
      const drift = ((i % 2 === 0 ? 1 : -1) * (10 + (i % 5) * 4)) + "px";

      dot.style.width = size + "px";
      dot.style.height = size + "px";
      dot.style.left = left + "%";
      dot.style.top = top + "%";
      dot.style.setProperty("--p-dur", dur + "s");
      dot.style.setProperty("--p-delay", delay + "s");
      dot.style.setProperty("--p-alpha", alpha);
      dot.style.setProperty("--p-drift", drift);
      frag.appendChild(dot);
    }

    container.appendChild(frag);

    document.addEventListener("visibilitychange", function () {
      document.body.classList.toggle("tab-hidden", document.hidden);
    });
  }

  /* ------------------------------------------------------------------------
     6. MAIN DOCUMENTARY APPLICATION & TIMELINE ENGINE
     ------------------------------------------------------------------------ */

  const audioDirector = new AudioDirector(CONTENT.audio);

  const dom = {
    screenPassword: document.getElementById("screen-password"),
    passwordForm: document.getElementById("password-form"),
    passwordInput: document.getElementById("password-input"),
    passwordError: document.getElementById("password-error"),
    pwTitle: document.getElementById("pw-title"),
    pwSubtitle: document.getElementById("pw-subtitle"),

    screenGate: document.getElementById("screen-gate"),
    btnBegin: document.getElementById("btn-begin"),

    screenHome: document.getElementById("screen-home"),
    heroMediaFrame: document.getElementById("hero-media-frame"),
    heroBrandLabel: document.getElementById("hero-brand-label"),
    heroEditionLabel: document.getElementById("hero-edition-label"),
    heroTitle: document.getElementById("hero-title"),
    heroHonoree: document.getElementById("hero-honoree"),
    heroTagline: document.getElementById("hero-tagline"),
    heroMetadata: document.getElementById("hero-metadata"),
    heroDescription: document.getElementById("hero-description"),
    homeAudioStatus: document.getElementById("home-audio-status"),
    btnHomeChapters: document.getElementById("btn-home-chapters"),
    btnHomeMute: document.getElementById("btn-home-mute"),
    iconHomeUnmuted: document.getElementById("icon-home-unmuted"),
    iconHomeMuted: document.getElementById("icon-home-muted"),
    btnPlayFilm: document.getElementById("btn-play-film"),
    btnExploreStory: document.getElementById("btn-explore-story"),

    chapterModal: document.getElementById("chapter-modal"),
    chapterModalBackdrop: document.getElementById("chapter-modal-backdrop"),
    btnCloseChapters: document.getElementById("btn-close-chapters"),
    chapterTilesGrid: document.getElementById("chapter-tiles-grid"),
    wallOfWishesSection: document.getElementById("wall-of-wishes-section"),
    wallOfWishesGrid: document.getElementById("wall-of-wishes-grid"),

    wishLightbox: document.getElementById("wish-lightbox"),
    wishLightboxStage: document.getElementById("wish-lightbox-stage"),
    wishLightboxCounter: document.getElementById("wish-lightbox-counter"),
    btnCloseWishLightbox: document.getElementById("btn-close-wish-lightbox"),
    wishLightboxName: document.getElementById("wish-lightbox-name"),
    wishLightboxRel: document.getElementById("wish-lightbox-rel"),
    wishLightboxDemo: document.getElementById("wish-lightbox-demo"),
    wishLightboxMsg: document.getElementById("wish-lightbox-msg"),
    btnPrevWallWish: document.getElementById("btn-prev-wall-wish"),
    btnNextWallWish: document.getElementById("btn-next-wall-wish"),

    screenPlayer: document.getElementById("screen-player"),
    playerStage: document.getElementById("player-stage"),
    slideLayerA: document.getElementById("slide-layer-a"),
    slideLayerB: document.getElementById("slide-layer-b"),

    titleCardOverlay: document.getElementById("title-card-overlay"),
    titleCardEyebrow: document.getElementById("title-card-eyebrow"),
    titleCardHeading: document.getElementById("title-card-heading"),
    titleCardEpigraph: document.getElementById("title-card-epigraph"),

    topZoneOverlay: document.getElementById("top-zone-overlay"),
    topDemoPill: document.getElementById("top-demo-pill"),
    timelineTopPill: document.getElementById("timeline-top-pill"),
    letterTopProgress: document.getElementById("letter-top-progress"),
    btnSkipToCredits: document.getElementById("btn-skip-to-credits"),

    worshipStatusCard: document.getElementById("worship-status-card"),
    worshipStatusTitle: document.getElementById("worship-status-title"),
    worshipStatusNote: document.getElementById("worship-status-note"),

    videoCaptionOverlay: document.getElementById("video-caption-overlay"),
    videoCaptionText: document.getElementById("video-caption-text"),
    videoCaptionDemo: document.getElementById("video-caption-demo"),

    wishFilmOverlay: document.getElementById("wish-film-overlay"),
    wishFilmCounter: document.getElementById("wish-film-counter"),
    wishFilmDemo: document.getElementById("wish-film-demo"),
    wishFilmName: document.getElementById("wish-film-name"),
    wishFilmRel: document.getElementById("wish-film-rel"),
    wishFilmMsg: document.getElementById("wish-film-msg"),
    btnPrevFilmWish: document.getElementById("btn-prev-film-wish"),
    btnNextFilmWish: document.getElementById("btn-next-film-wish"),

    quoteOverlay: document.getElementById("quote-overlay"),
    quoteDemoBadge: document.getElementById("quote-demo-badge"),
    quoteText: document.getElementById("quote-text"),
    quoteAuthor: document.getElementById("quote-author"),

    timelineOverlay: document.getElementById("timeline-overlay"),
    timelineYear: document.getElementById("timeline-year"),
    timelineDemoBadge: document.getElementById("timeline-demo-badge"),
    timelineMilestone: document.getElementById("timeline-milestone"),
    timelineCaption: document.getElementById("timeline-caption"),
    timelineSteps: document.getElementById("timeline-steps"),

    lettersOverlay: document.getElementById("letters-overlay"),
    letterTapHint: document.getElementById("letter-tap-hint"),
    letterStageWrap: document.getElementById("letter-stage-wrap"),
    letterPaper: document.getElementById("letter-paper"),
    letterAvatarRing: document.getElementById("letter-avatar-ring"),
    letterAvatarInitials: document.getElementById("letter-avatar-initials"),
    letterAvatarImg: document.getElementById("letter-avatar-img"),
    letterCounter: document.getElementById("letter-counter"),
    letterDemoBadge: document.getElementById("letter-demo-badge"),
    letterSalutation: document.getElementById("letter-salutation"),
    letterBody: document.getElementById("letter-body"),
    letterClosing: document.getElementById("letter-closing"),
    letterSender: document.getElementById("letter-sender"),
    letterRole: document.getElementById("letter-role"),
    btnPrevLetter: document.getElementById("btn-prev-letter"),
    btnLetterReadMore: document.getElementById("btn-letter-read-more"),
    btnNextLetter: document.getElementById("btn-next-letter"),
    letterDots: document.getElementById("letter-dots"),

    subtitleBar: document.getElementById("subtitle-bar"),
    subtitleInner: document.getElementById("subtitle-inner"),
    subtitleLabel: document.getElementById("subtitle-label"),
    subtitleTimelineSteps: document.getElementById("subtitle-timeline-steps"),
    subtitleLines: document.getElementById("subtitle-lines"),
    subtitleDemoBadge: document.getElementById("subtitle-demo-badge"),

    creditsOverlay: document.getElementById("credits-overlay"),
    creditLeadLabel: document.getElementById("credit-lead-label"),
    creditLeadName: document.getElementById("credit-lead-name"),
    creditLoveLabel: document.getElementById("credit-love-label"),
    creditLoveDemo: document.getElementById("credit-love-demo"),
    creditLoveNames: document.getElementById("credit-love-names"),
    creditDirectorLabel: document.getElementById("credit-director-label"),
    creditDirectorDemo: document.getElementById("credit-director-demo"),
    creditDirectorName: document.getElementById("credit-director-name"),
    creditsBlessing: document.getElementById("credits-blessing"),
    creditsSubline: document.getElementById("credits-subline"),
    btnReplayFilm: document.getElementById("btn-replay-film"),
    btnCreditsLetters: document.getElementById("btn-credits-letters"),
    btnCreditsHome: document.getElementById("btn-credits-home"),

    playerChrome: document.getElementById("player-chrome"),
    btnPlayerHome: document.getElementById("btn-player-home"),
    playerChapterBadge: document.getElementById("player-chapter-badge"),
    playerChapterTitle: document.getElementById("player-chapter-title"),
    playerAudioStatus: document.getElementById("player-audio-status"),
    btnSkipLetters: document.getElementById("btn-skip-letters"),
    btnPlayerChapters: document.getElementById("btn-player-chapters"),
    progressTrack: document.getElementById("progress-track"),
    progressChapterMarkers: document.getElementById("progress-chapter-markers"),
    progressFill: document.getElementById("progress-fill"),
    btnPrevChapter: document.getElementById("btn-prev-chapter"),
    btnPlayPause: document.getElementById("btn-play-pause"),
    iconPause: document.getElementById("icon-pause"),
    iconPlay: document.getElementById("icon-play"),
    btnNextChapter: document.getElementById("btn-next-chapter"),
    btnPlayerMute: document.getElementById("btn-player-mute"),
    iconPlayerUnmuted: document.getElementById("icon-player-unmuted"),
    iconPlayerMuted: document.getElementById("icon-player-muted"),
    playerTimeReadout: document.getElementById("player-time-readout"),
    pausedIndicator: document.getElementById("paused-indicator")
  };

  /* ------------------------------------------------------------------------
     7. POPULATE STATIC / CONFIGURABLE CONTENT & WALL OF WISHES
     ------------------------------------------------------------------------ */

  function hydrateHomepageAndCredits() {
    if (CONTENT.brandLabel) dom.heroBrandLabel.textContent = CONTENT.brandLabel;
    if (CONTENT.editionLabel) dom.heroEditionLabel.textContent = CONTENT.editionLabel;
    if (CONTENT.filmTitle) dom.heroTitle.textContent = CONTENT.filmTitle;
    if (CONTENT.honoreeName) {
      const endearment = CONTENT.honoreeEndearment ? ` · “${CONTENT.honoreeEndearment}”` : "";
      dom.heroHonoree.textContent = `Dedicated to ${CONTENT.honoreeName}${endearment}`;
    }
    if (CONTENT.tagline) dom.heroTagline.textContent = CONTENT.tagline;

    dom.heroMetadata.innerHTML = "";
    (CONTENT.metadata || []).forEach(function (item) {
      const li = document.createElement("li");
      li.textContent = item;
      dom.heroMetadata.appendChild(li);
    });

    dom.heroDescription.textContent = CONTENT.description || "";
    if (CONTENT.descriptionIsDemo && shouldShowDemoTags()) {
      const badge = document.createElement("span");
      badge.className = "demo-pill";
      badge.textContent = "DEMO";
      dom.heroDescription.appendChild(badge);
    }

    populateMediaStage(dom.heroMediaFrame, CONTENT.heroPhoto, 18, { isHero: true });

    const activeChapters = getActiveChapters();
    if (activeChapters[0]) {
      // Preload & decode only the first 2 scenes of Chapter 1 so the hero + opening load with highest priority
      preloadChapterPhotos(activeChapters[0], 2);
    }

    buildChapterMenuTiles();
    buildWallOfWishes();

    const cr = CONTENT.credits || {};
    dom.creditLeadLabel.textContent = cr.leadLabel || "Starring";
    dom.creditLeadName.textContent = cr.leadName || "Mam · Pastor Marita Mbae";

    dom.creditLoveLabel.textContent = cr.withLoveLabel || "With love from";
    dom.creditLoveNames.textContent = cr.withLoveFrom || "[Your names here]";
    dom.creditLoveDemo.classList.toggle("is-hidden", !(cr.withLoveIsDemo && shouldShowDemoTags()));

    dom.creditDirectorLabel.textContent = cr.directedByLabel || "Directed by";
    dom.creditDirectorName.textContent = cr.directedBy || "[Your name here]";
    dom.creditDirectorDemo.classList.toggle("is-hidden", !(cr.directedByIsDemo && shouldShowDemoTags()));

    dom.creditsBlessing.textContent = cr.closingBlessing || "Happy Birthday, Mam.";
    dom.creditsSubline.textContent = cr.closingSubline || CONTENT.tagline || "";
  }

  // Calculates dynamic letter duration based on word count: min 6s + 0.35s per word (or per-letter override `duration`)
  function getLetterDurationSec(letter, chapter) {
    if (letter && typeof letter.duration === "number" && letter.duration > 0) {
      return letter.duration;
    }
    const minSec =
      (chapter && typeof chapter.minDurationSec === "number" ? chapter.minDurationSec : null) ||
      (CONTENT.timing && typeof CONTENT.timing.letterMinDurationSec === "number" ? CONTENT.timing.letterMinDurationSec : 6);
    const secPerWord =
      (chapter && typeof chapter.secPerWord === "number" ? chapter.secPerWord : null) ||
      (CONTENT.timing && typeof CONTENT.timing.letterSecPerWord === "number" ? CONTENT.timing.letterSecPerWord : 0.35);

    let fullText = "";
    if (letter && typeof letter.message === "string") {
      fullText = letter.message;
    } else if (letter && Array.isArray(letter.paragraphs)) {
      fullText = letter.paragraphs.join(" ");
    }

    const words = fullText.trim() ? fullText.trim().split(/\s+/).length : 0;
    return Math.round((minSec + words * secPerWord) * 10) / 10;
  }

  // Collects all of Mam's scene photos across chapters to rotate behind letters if a letter doesn't specify backgroundPhoto
  function getMamPhotoRotationPool() {
    const pool = [];
    (CONTENT.chapters || []).forEach(function (ch) {
      if (Array.isArray(ch.scenes)) {
        ch.scenes.forEach(function (sc) {
          if (sc && sc.type !== "video" && sc.photo && pool.indexOf(sc.photo) === -1) {
            pool.push(sc.photo);
          }
        });
      }
    });
    if (pool.length === 0 && CONTENT.heroPhoto && CONTENT.heroPhoto.src) {
      pool.push(CONTENT.heroPhoto.src);
    }
    return pool;
  }

  function getInitialsFromName(name) {
    if (!name || typeof name !== "string") return "M";
    const cleaned = name.replace(/^from:\s*/i, "").trim();
    if (!cleaned) return "M";
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function getChapterDurationSec(chapter) {
    const cardDur = (CONTENT.timing && CONTENT.timing.chapterCardDurationSec) || 4.5;
    if (chapter.type === "letters") {
      const letters = chapter.letters || [];
      const lettersSum = letters.reduce(function (acc, ltr) {
        return acc + getLetterDurationSec(ltr, chapter);
      }, 0);
      return cardDur + lettersSum;
    }
    if (chapter.type === "wishes") {
      const wishes = getFeaturedWishes();
      const perWish = CONTENT.demoWishDurationSec || 14;
      return cardDur + Math.max(1, wishes.length) * perWish;
    }
    const scenesSum = (chapter.scenes || []).reduce(function (acc, sc) {
      return acc + getEffectiveSceneDurationSec(sc, chapter);
    }, 0);
    return cardDur + scenesSum;
  }

  function buildChapterMenuTiles() {
    dom.chapterTilesGrid.innerHTML = "";
    const activeChapters = getActiveChapters();

    activeChapters.forEach(function (chapter, idx) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chapter-tile";
      btn.setAttribute("role", "listitem");

      const approxSec = Math.round(getChapterDurationSec(chapter));

      const top = document.createElement("div");
      top.className = "chapter-tile-top";

      const numSpan = document.createElement("span");
      numSpan.className = "chapter-tile-num";
      numSpan.textContent = chapter.numberLabel || ("CHAPTER " + (idx + 1));
      top.appendChild(numSpan);

      const durSpan = document.createElement("span");
      durSpan.className = "chapter-tile-duration";
      durSpan.textContent = "~" + approxSec + "s";
      top.appendChild(durSpan);

      const body = document.createElement("div");

      const title = document.createElement("h3");
      title.className = "chapter-tile-title";
      title.textContent = chapter.title;
      body.appendChild(title);

      const epigraph = document.createElement("p");
      epigraph.className = "chapter-tile-epigraph";
      epigraph.textContent = chapter.epigraph || "";
      if (chapter.epigraphIsDemo && shouldShowDemoTags()) {
        const badge = document.createElement("span");
        badge.className = "demo-pill";
        badge.textContent = "DEMO";
        epigraph.appendChild(badge);
      }
      body.appendChild(epigraph);

      btn.appendChild(top);
      btn.appendChild(body);

      btn.addEventListener("click", function () {
        closeChapterModal();
        startFilmFromChapter(idx);
      });

      dom.chapterTilesGrid.appendChild(btn);
    });
  }

  /* ------------------------------------------------------------------------
     8. WALL OF WISHES GRID & STANDALONE FULL-SCREEN WISH LIGHTBOX
     ------------------------------------------------------------------------ */

  const lightboxState = {
    isOpen: false,
    currentIndex: 0,
    activeVideo: null,
    idleTimer: null
  };

  function wakeLightboxChrome() {
    if (!dom.wishLightbox) return;
    dom.wishLightbox.classList.remove("is-idle");
    if (lightboxState.idleTimer) clearTimeout(lightboxState.idleTimer);
    lightboxState.idleTimer = setTimeout(function () {
      if (lightboxState.isOpen && lightboxState.activeVideo && !lightboxState.activeVideo.paused) {
        dom.wishLightbox.classList.add("is-idle");
      }
    }, 3000);
  }

  // Builds a Smart Video Wrapper with a blurred static poster backdrop (never a second blurred video)
  // and a gentle gold loading shimmer until the first frame is ready.
  function createSmartVideoStage(options) {
    const opts = options || {};
    const wrapper = document.createElement("div");
    wrapper.className = "smart-video-wrapper";

    if (opts.poster) {
      const blurPoster = new Image();
      blurPoster.className = "video-backdrop-poster";
      blurPoster.alt = "";
      blurPoster.decoding = "async";
      blurPoster.setAttribute("aria-hidden", "true");
      let triedAlt = false;
      blurPoster.onerror = function () {
        if (!triedAlt) {
          triedAlt = true;
          const alt = getAlternateJpegPath(opts.poster);
          if (alt) blurPoster.src = alt;
        }
      };
      blurPoster.src = opts.poster;
      wrapper.appendChild(blurPoster);
    }

    const plumTint = document.createElement("div");
    plumTint.className = "video-backdrop-plum-tint";
    plumTint.setAttribute("aria-hidden", "true");
    wrapper.appendChild(plumTint);

    const shimmer = document.createElement("div");
    shimmer.className = "video-loading-shimmer";
    shimmer.setAttribute("aria-hidden", "true");
    wrapper.appendChild(shimmer);

    const video = document.createElement("video");
    video.className = "video-element";
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("disablePictureInPicture", "");
    video.preload = "metadata";
    if (opts.poster) {
      video.poster = opts.poster;
    }
    video.style.objectPosition = opts.focalPoint || "50% 30%";
    video.muted = audioDirector.isMuted;
    video.volume = Math.max(0, Math.min(1, opts.volume !== undefined ? Number(opts.volume) : 0.92));

    wrapper.appendChild(video);

    const videoEntry = {
      wrapper: wrapper,
      video: video,
      fit: opts.fit || "auto",
      isWish: Boolean(opts.isWish),
      // The Wall of Wishes player passes trackCaption:false so it never moves the film's caption card
      fitSeq: opts.trackCaption === false ? 0 : ++fitSeqLatest
    };
    activeSmartVideos.add(videoEntry);

    const hideShimmer = function () {
      shimmer.classList.add("is-ready");
      setTimeout(function () {
        if (shimmer.parentNode) shimmer.parentNode.removeChild(shimmer);
      }, 380);
    };

    video.addEventListener("loadeddata", hideShimmer, { once: true });
    video.addEventListener("playing", hideShimmer, { once: true });

    return {
      wrapper: wrapper,
      video: video,
      videoEntry: videoEntry,
      hideShimmer: hideShimmer
    };
  }

  function buildWallOfWishes() {
    const wishes = getAllWishes();

    // Hide the Wall of Wishes gracefully if wishes list is empty and demoMode is "off"
    if (wishes.length === 0 && !isDemoAuto()) {
      dom.wallOfWishesSection.classList.add("is-hidden");
      return;
    }

    dom.wallOfWishesSection.classList.remove("is-hidden");
    dom.wallOfWishesGrid.innerHTML = "";

    wishes.forEach(function (wish, idx) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "wish-wall-card";
      card.setAttribute("role", "listitem");

      // Optional poster image (falls back smoothly to the soft plum gradient card if missing)
      if (wish.poster) {
        const posterImg = new Image();
        posterImg.className = "wish-wall-poster";
        posterImg.alt = "";
        let triedAltPoster = false;
        posterImg.onload = function () {
          card.insertBefore(posterImg, card.firstChild);
        };
        posterImg.onerror = function () {
          if (!triedAltPoster) {
            triedAltPoster = true;
            const altPoster = getAlternateJpegPath(wish.poster);
            if (altPoster) {
              posterImg.src = altPoster;
            }
          }
        };
        posterImg.src = wish.poster;
      }

      const shade = document.createElement("div");
      shade.className = "wish-wall-shade";
      card.appendChild(shade);

      if (wish.isDemoText && shouldShowDemoTags()) {
        const demoTag = document.createElement("span");
        demoTag.className = "demo-pill wish-wall-demo-tag";
        demoTag.textContent = "DEMO WISH";
        card.appendChild(demoTag);
      }

      const playBadge = document.createElement("span");
      playBadge.className = "wish-wall-play-badge";
      playBadge.setAttribute("aria-hidden", "true");
      playBadge.innerHTML = '<svg class="icon-svg" viewBox="0 0 24 24"><polygon points="7,5 19,12 7,19" fill="currentColor"/></svg>';
      card.appendChild(playBadge);

      const content = document.createElement("div");
      content.className = "wish-wall-content";

      const nameEl = document.createElement("h4");
      nameEl.className = "wish-wall-name";
      nameEl.textContent = wish.name || ("Friend " + (idx + 1));
      content.appendChild(nameEl);

      if (wish.relationship) {
        const relEl = document.createElement("p");
        relEl.className = "wish-wall-rel";
        relEl.textContent = wish.relationship;
        content.appendChild(relEl);
      }

      if (wish.message) {
        const msgEl = document.createElement("p");
        msgEl.className = "wish-wall-msg";
        msgEl.textContent = "“" + wish.message + "”";
        content.appendChild(msgEl);
      }

      card.appendChild(content);

      card.addEventListener("click", function () {
        openWishLightbox(idx);
      });

      dom.wallOfWishesGrid.appendChild(card);
    });
  }

  function stopLightboxVideo() {
    if (lightboxState.activeVideo) {
      try {
        lightboxState.activeVideo.pause();
        lightboxState.activeVideo.removeAttribute("src");
        lightboxState.activeVideo.load();
      } catch (e) {}
      lightboxState.activeVideo = null;
    }
    dom.wishLightboxStage.innerHTML = "";
  }

  function openWishLightbox(index) {
    const wishes = getAllWishes();
    if (!wishes.length) return;

    lightboxState.isOpen = true;
    dom.wishLightbox.classList.remove("is-hidden", "is-idle");
    loadWishIntoLightbox(index);
    wakeLightboxChrome();
  }

  function closeWishLightbox() {
    lightboxState.isOpen = false;
    if (lightboxState.idleTimer) clearTimeout(lightboxState.idleTimer);
    stopLightboxVideo();
    audioDirector.restorePiano(1400);
    dom.wishLightbox.classList.add("is-hidden");
    dom.wishLightbox.classList.remove("is-idle");
  }

  function loadWishIntoLightbox(index) {
    const wishes = getAllWishes();
    if (!wishes.length) return;

    const safeIdx = ((index % wishes.length) + wishes.length) % wishes.length;
    lightboxState.currentIndex = safeIdx;
    const wish = wishes[safeIdx];

    stopLightboxVideo();
    audioDirector.duckPiano(1200);
    wakeLightboxChrome();

    dom.wishLightboxCounter.textContent = `WISH ${safeIdx + 1} OF ${wishes.length}`;
    dom.wishLightboxName.textContent = wish.name || "";
    dom.wishLightboxRel.textContent = wish.relationship || "";
    dom.wishLightboxMsg.textContent = wish.message ? `“${wish.message}”` : "";
    dom.wishLightboxDemo.classList.toggle("is-hidden", !(wish.isDemoText && shouldShowDemoTags()));

    const built = createSmartVideoStage({
      poster: wish.poster,
      focalPoint: wish.focalPoint || "50% 30%",
      fit: wish.fit || "auto",
      volume: wish.volume !== undefined ? wish.volume : 0.95,
      isWish: false,
      trackCaption: false
    });
    const video = built.video;

    // Tapping the video in the lightbox wakes controls and toggles pause/play (never advances scene)
    built.wrapper.addEventListener("click", function (e) {
      if (e.target.closest("button, a, .card, .controls")) return;
      wakeLightboxChrome();
      if (video.paused) {
        video.play().catch(function () {});
      } else {
        video.pause();
      }
    });

    dom.wishLightboxStage.innerHTML = "";
    dom.wishLightboxStage.appendChild(built.wrapper);

    let settled = false;

    const showFallback = function () {
      if (settled) return;
      settled = true;
      lightboxState.activeVideo = null;
      renderDemoFrame(dom.wishLightboxStage, {
        src: wish.file,
        kenBurns: "zoom-in",
        durationSec: 14,
        labelPrefix: "DEMO WISH",
        folderHint: "assets/videos/wishes/"
      });
    };

    video.addEventListener("error", showFallback, { once: true });

    video.addEventListener("loadedmetadata", function () {
      if (settled) return;
      settled = true;
      evaluateSmartVideoFit(built.videoEntry);
      lightboxState.activeVideo = video;
      video.play().catch(function () {});
    }, { once: true });

    video.addEventListener("ended", function () {
      audioDirector.restorePiano(1400);
      dom.wishLightbox.classList.remove("is-idle");
    });

    video.src = wish.file || "";
    video.load();
  }

  /* ------------------------------------------------------------------------
     9. PASSWORD GATE & WELCOME SCREEN NAVIGATION
     ------------------------------------------------------------------------ */

  function initGateFlow() {
    const pwCfg = CONTENT.passwordGate || {};
    if (pwCfg.enabled) {
      dom.pwTitle.textContent = pwCfg.promptTitle || "A Private Family Screening";
      dom.pwSubtitle.textContent = pwCfg.promptSubtitle || "Enter the invitation code to join the celebration.";
      dom.screenPassword.classList.remove("is-hidden");
      dom.screenGate.classList.add("is-hidden");

      dom.passwordForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const entered = (dom.passwordInput.value || "").trim().toLowerCase();
        const expected = (pwCfg.passcode || "").trim().toLowerCase();
        if (entered === expected) {
          dom.passwordError.classList.add("is-hidden");
          dom.screenPassword.classList.add("is-hidden");
          dom.screenGate.classList.remove("is-hidden");
        } else {
          dom.passwordError.classList.remove("is-hidden");
        }
      });
    }

    dom.btnBegin.addEventListener("click", function () {
      audioDirector.unlockAndStartPiano(function (status) {
        const showDemoMusicPill = status.usingDemoPiano && isDemoAuto();
        dom.homeAudioStatus.classList.toggle("is-hidden", !showDemoMusicPill);
        dom.playerAudioStatus.classList.toggle("is-hidden", !showDemoMusicPill);
      });

      dom.screenGate.classList.add("is-hidden");
      dom.screenHome.classList.remove("is-hidden");
    });
  }

  /* ------------------------------------------------------------------------
     10. UNIFIED FILM TIMELINE ENGINE (PHOTOS, MINISTRY VIDEOS, WISHES, LETTERS)
     ------------------------------------------------------------------------ */

  const playerState = {
    isActive: false,
    isPaused: false,
    activeChapters: [],
    segments: [],
    totalDurationSec: 0,
    currentSegmentIndex: 0,
    segmentElapsedSec: 0,
    lastFrameTime: 0,
    rafId: null,
    activeSlideSlot: "A",
    activeStageVideo: null,
    isWaitingOnRealVideoEnd: false,
    isLetterExpanded: false,
    hasShownLetterTapHint: false,
    worshipTriggeredForChapter2: false,
    idleTimer: null
  };

  // Determines smart card placement ("bottom" or "top") and group-photo compact mode
  // so the glass letter card never covers faces.
  function resolveLetterCardPlacement(letter) {
    const pos = ((letter && letter.cardPosition) || "auto").toLowerCase();
    const faces = ((letter && letter.faces) || "").toLowerCase();
    const fp = (letter && letter.backgroundFocalPoint) || "50% 25%";

    // Parse vertical percentage from focalPoint (e.g. "50% 60%" -> 60)
    let verticalPct = 30;
    const parts = fp.trim().split(/\s+/);
    if (parts.length >= 2) {
      const parsed = parseFloat(parts[1]);
      if (!isNaN(parsed)) verticalPct = parsed;
    }

    const isFacesBoth = faces === "both";

    if (pos === "top") {
      return { zone: "top", isFacesBoth: isFacesBoth };
    }
    if (pos === "bottom") {
      return { zone: "bottom", isFacesBoth: isFacesBoth };
    }

    // "auto" mode: check `faces` hint first, then focal point vertical position
    if (faces === "lower") {
      return { zone: "top", isFacesBoth: false };
    }
    if (faces === "upper") {
      return { zone: "bottom", isFacesBoth: false };
    }
    if (isFacesBoth) {
      // If faces are in both upper and lower zones, pick the lowest-contrast edge based on focal point
      // and shrink the card to its smallest compact height
      return { zone: verticalPct >= 55 ? "top" : "bottom", isFacesBoth: true };
    }

    // If vertical focal point is 55% or lower (people low in the frame), place card at TOP zone
    return {
      zone: verticalPct >= 55 ? "top" : "bottom",
      isFacesBoth: false
    };
  }

  function setLetterExpanded(expanded) {
    playerState.isLetterExpanded = Boolean(expanded);
    if (dom.letterPaper) {
      dom.letterPaper.classList.toggle("is-expanded", playerState.isLetterExpanded);
    }
    if (dom.btnLetterReadMore) {
      dom.btnLetterReadMore.textContent = playerState.isLetterExpanded ? "Show less" : "Read more";
      dom.btnLetterReadMore.setAttribute("aria-expanded", playerState.isLetterExpanded ? "true" : "false");
    }
    if (playerState.isLetterExpanded && dom.playerChrome) {
      dom.playerChrome.classList.remove("is-idle");
    }
    if (!playerState.isLetterExpanded && dom.letterBody) {
      dom.letterBody.scrollTop = 0;
      wakePlayerChrome();
    }
  }

  function evaluateLetterTruncation() {
    if (!dom.letterBody || !dom.btnLetterReadMore) return;
    // Measure whether the message overflows the compact 3-4 line container
    const isOverflowing = dom.letterBody.scrollHeight > dom.letterBody.clientHeight + 6;
    dom.letterBody.classList.toggle("is-truncated", isOverflowing && !playerState.isLetterExpanded);
    dom.btnLetterReadMore.classList.toggle("is-hidden", !isOverflowing && !playerState.isLetterExpanded);
  }

  function cleanupActiveStageVideo(restorePiano) {
    playerState.isWaitingOnRealVideoEnd = false;
    if (playerState.activeStageVideo) {
      try {
        playerState.activeStageVideo.pause();
        playerState.activeStageVideo.removeAttribute("src");
        playerState.activeStageVideo.load();
      } catch (e) {}
      playerState.activeStageVideo = null;
    }
    if (restorePiano && !playerState.worshipTriggeredForChapter2) {
      audioDirector.restorePiano(1400);
    }
  }

  function buildFilmSegments() {
    const segments = [];
    const activeChapters = getActiveChapters();
    playerState.activeChapters = activeChapters;

    const introDur = (CONTENT.timing && CONTENT.timing.introDurationSec) || 4.5;
    const cardDur = (CONTENT.timing && CONTENT.timing.chapterCardDurationSec) || 4.5;
    const creditsDur = (CONTENT.timing && CONTENT.timing.creditsDurationSec) || 18;
    const defaultWishDur = CONTENT.demoWishDurationSec || 14;

    segments.push({
      kind: "intro-card",
      chapterIndex: 0,
      durationSec: introDur
    });

    activeChapters.forEach(function (chapter, cIdx) {
      segments.push({
        kind: "chapter-card",
        chapterIndex: cIdx,
        chapter: chapter,
        durationSec: cardDur
      });

      if (chapter.type === "letters") {
        const letters = chapter.letters || [];
        const photoPool = getMamPhotoRotationPool();
        letters.forEach(function (letter, lIdx) {
          const perLetterDur = getLetterDurationSec(letter, chapter);
          const resolvedBg =
            letter.backgroundPhoto ||
            (photoPool.length > 0 ? photoPool[lIdx % photoPool.length] : (chapter.backgroundPhoto || "assets/photos/ch1-01.jpg"));
          segments.push({
            kind: "letter",
            chapterIndex: cIdx,
            chapter: chapter,
            letterIndex: lIdx,
            letter: letter,
            resolvedBgPhoto: resolvedBg,
            totalLetters: letters.length,
            durationSec: perLetterDur
          });
        });
      } else if (chapter.type === "wishes") {
        const featuredWishes = getFeaturedWishes();
        featuredWishes.forEach(function (wish, wIdx) {
          segments.push({
            kind: "wish-video",
            chapterIndex: cIdx,
            chapter: chapter,
            wishIndex: wIdx,
            wish: wish,
            totalWishes: featuredWishes.length,
            durationSec: wish.durationSec || defaultWishDur
          });
        });
      } else {
        const scenes = chapter.scenes || [];
        scenes.forEach(function (scene, sIdx) {
          segments.push({
            kind: scene.type === "video" ? "ministry-video" : "scene",
            chapterIndex: cIdx,
            chapter: chapter,
            sceneIndex: sIdx,
            scene: scene,
            totalScenes: scenes.length,
            durationSec: getEffectiveSceneDurationSec(scene, chapter)
          });
        });
      }
    });

    segments.push({
      kind: "credits",
      chapterIndex: Math.max(0, activeChapters.length - 1),
      durationSec: creditsDur
    });

    let runningTime = 0;
    segments.forEach(function (seg) {
      seg.startTimeSec = runningTime;
      runningTime += seg.durationSec;
    });

    playerState.segments = segments;
    playerState.totalDurationSec = runningTime;
    renderProgressChapterMarkers();
  }

  function renderProgressChapterMarkers() {
    dom.progressChapterMarkers.innerHTML = "";
    if (!playerState.totalDurationSec) return;

    playerState.segments.forEach(function (seg) {
      if (seg.kind === "chapter-card" && seg.chapterIndex > 0) {
        const pct = (seg.startTimeSec / playerState.totalDurationSec) * 100;
        const marker = document.createElement("span");
        marker.className = "progress-marker";
        marker.style.left = pct.toFixed(2) + "%";
        dom.progressChapterMarkers.appendChild(marker);
      }
    });
  }

  function getNextSlideLayers() {
    const nextSlot = playerState.activeSlideSlot === "A" ? "B" : "A";
    const incomingLayer = nextSlot === "A" ? dom.slideLayerA : dom.slideLayerB;
    const outgoingLayer = nextSlot === "A" ? dom.slideLayerB : dom.slideLayerA;
    playerState.activeSlideSlot = nextSlot;
    return { incomingLayer: incomingLayer, outgoingLayer: outgoingLayer };
  }

  function crossfadeToPhoto(photoConfig, durationSec) {
    cleanupActiveStageVideo(false);
    const layers = getNextSlideLayers();
    // Hold the cross-fade until populateMediaStage has decoded the photo
    // (or until the 3-second slow-network fallback fires)
    populateMediaStage(layers.incomingLayer, photoConfig, durationSec, {
      isHero: Boolean(photoConfig && photoConfig.isHero),
      onReady: function () {
        layers.incomingLayer.classList.add("is-active");
        layers.outgoingLayer.classList.remove("is-active");
      }
    });
  }

  // Preloads & decodes the next 1 to 2 upcoming photo scenes on the timeline
  function preloadUpcomingSegmentPhotos(currentIndex) {
    const segments = playerState.segments || [];
    let preloadedCount = 0;
    for (let i = currentIndex + 1; i < segments.length && preloadedCount < 2; i++) {
      const nextSeg = segments[i];
      if (!nextSeg) continue;
      if (nextSeg.kind === "scene" && nextSeg.scene && nextSeg.scene.photo) {
        preloadPhoto(nextSeg.scene.photo, preloadedCount === 0);
        preloadedCount += 1;
      } else if (nextSeg.kind === "chapter-card" && nextSeg.chapter) {
        const ch = nextSeg.chapter;
        const firstChPhoto =
          (ch.scenes && ch.scenes[0] && ch.scenes[0].photo) ||
          ch.backgroundPhoto;
        if (firstChPhoto) {
          preloadPhoto(firstChPhoto, false);
          preloadedCount += 1;
        }
      } else if (nextSeg.kind === "letter") {
        if (nextSeg.resolvedBgPhoto) {
          preloadPhoto(nextSeg.resolvedBgPhoto, preloadedCount === 0);
        }
        if (nextSeg.letter && nextSeg.letter.senderPhoto) {
          preloadPhoto(nextSeg.letter.senderPhoto, false);
        }
        preloadedCount += 1;
      }
    }
  }

  // Plays either a Ministry Video scene or a Featured Birthday Wish video on the main stage
  function crossfadeToStageVideo(videoConfig, segmentIndex) {
    cleanupActiveStageVideo(false);
    const layers = getNextSlideLayers();
    const container = layers.incomingLayer;
    container.innerHTML = "";

    layers.incomingLayer.classList.add("is-active");
    layers.outgoingLayer.classList.remove("is-active");

    // Duck ambient piano while video segment is active
    audioDirector.duckPiano(1300);

    const src = videoConfig.file || "";
    const focalPoint = videoConfig.focalPoint || "50% 30%";
    const fitSetting = videoConfig.fit || "auto";
    const startTime = Number(videoConfig.startTime) || 0;
    const clipVol = videoConfig.volume !== undefined ? Number(videoConfig.volume) : 0.92;
    const isWish = videoConfig.isWish === true;

    const handleMissingOrFailedVideo = function () {
      // Only handle if we are still on the same segment
      if (playerState.currentSegmentIndex !== segmentIndex) return;
      playerState.activeStageVideo = null;
      playerState.isWaitingOnRealVideoEnd = false;

      if (!isDemoAuto()) {
        // When demoMode is "off", gracefully skip missing/failed video and continue the film
        audioDirector.restorePiano(1200);
        if (segmentIndex + 1 < playerState.segments.length) {
          activateSegment(segmentIndex + 1);
        }
        return;
      }

      // In demoMode "auto", render an abstract plum-and-gold demo frame and hold for durationSec
      renderDemoFrame(container, {
        src: src,
        kenBurns: "zoom-in",
        durationSec: videoConfig.durationSec || 14,
        labelPrefix: isWish ? "DEMO WISH" : "DEMO VIDEO",
        folderHint: isWish ? "assets/videos/wishes/" : "assets/videos/ministry/"
      });
    };

    if (!src) {
      handleMissingOrFailedVideo();
      return;
    }

    const built = createSmartVideoStage({
      poster: videoConfig.poster,
      focalPoint: focalPoint,
      fit: fitSetting,
      volume: clipVol,
      isWish: isWish
    });
    const video = built.video;

    container.appendChild(built.wrapper);

    let settled = false;

    video.addEventListener("error", function () {
      if (settled) return;
      settled = true;
      handleMissingOrFailedVideo();
    }, { once: true });

    video.addEventListener("loadedmetadata", function () {
      if (settled || playerState.currentSegmentIndex !== segmentIndex) return;
      settled = true;

      evaluateSmartVideoFit(built.videoEntry);

      if (startTime > 0 && startTime < (video.duration || Infinity)) {
        try {
          video.currentTime = startTime;
        } catch (e) {}
      }

      // Sync segment duration with real video length if available
      if (video.duration && isFinite(video.duration) && video.duration > 0) {
        const remainingClipDur = Math.max(3, video.duration - startTime);
        playerState.segments[segmentIndex].durationSec = remainingClipDur;
      }

      playerState.activeStageVideo = video;
      playerState.isWaitingOnRealVideoEnd = true;

      if (!playerState.isPaused) {
        video.play().catch(function () {
          // If autoplay was blocked, fall back gracefully
          playerState.isWaitingOnRealVideoEnd = false;
        });
      }
    }, { once: true });

    video.addEventListener("ended", function () {
      if (playerState.currentSegmentIndex !== segmentIndex) return;
      playerState.isWaitingOnRealVideoEnd = false;
      audioDirector.restorePiano(1500);
      if (segmentIndex + 1 < playerState.segments.length) {
        activateSegment(segmentIndex + 1);
      }
    }, { once: true });

    video.src = src;
    video.load();
  }

  let statusPillTimer = null;
  let statusPillHideTimer = null;
  let subtitleBatchTimers = [];

  function clearSubtitleBatchTimers() {
    subtitleBatchTimers.forEach(function (t) {
      clearTimeout(t);
    });
    subtitleBatchTimers = [];
  }

  // Shows a slim top status pill (e.g. "Mam's worship recording" or ministry clip caption)
  // that fades in, stays ~4 seconds, and fades out completely so it never clutters the screen.
  function showTransientTopPill(pillElement, textElement, text) {
    if (!pillElement || !textElement) return;
    if (statusPillTimer) clearTimeout(statusPillTimer);
    if (statusPillHideTimer) clearTimeout(statusPillHideTimer);

    textElement.textContent = text || "";
    pillElement.classList.remove("is-hidden", "is-fading-out");

    statusPillTimer = setTimeout(function () {
      pillElement.classList.add("is-fading-out");
      statusPillHideTimer = setTimeout(function () {
        pillElement.classList.add("is-hidden");
        pillElement.classList.remove("is-fading-out");
      }, 680);
    }, 4000);
  }

  function setTopDemoBadgeVisible(isDemoItem) {
    if (!dom.topDemoPill) return;
    dom.topDemoPill.classList.toggle("is-hidden", !(isDemoItem && shouldShowDemoTags()));
  }

  function hideAllStageOverlays() {
    clearSubtitleBatchTimers();
    dom.titleCardOverlay.classList.add("is-hidden");
    dom.videoCaptionOverlay.classList.add("is-hidden");
    dom.videoCaptionOverlay.classList.remove("is-fading-out");
    if (dom.timelineTopPill) dom.timelineTopPill.classList.add("is-hidden");
    if (dom.letterTopProgress) dom.letterTopProgress.classList.add("is-hidden");
    if (dom.topDemoPill) dom.topDemoPill.classList.add("is-hidden");
    dom.wishFilmOverlay.classList.add("is-hidden");
    dom.quoteOverlay.classList.add("is-hidden");
    dom.timelineOverlay.classList.add("is-hidden");
    dom.lettersOverlay.classList.add("is-hidden");
    hideCaptionCard();
    dom.creditsOverlay.classList.add("is-hidden");
  }

  // ------------------------------------------------------------------------
  // FANCY COMPACT CAPTION CARD (film captions, Chapter 4 quotes, Chapter 5 timeline labels)
  // - js/content.js is the source of truth: each entry in `subtitles` is shown
  //   whole as ONE screen, never split mid-sentence or mid-word.
  // - Only if a scene has a single entry containing multiple full sentences that
  //   would exceed 5 lines may it split, and ONLY at sentence endings (. ? !),
  //   never leaving a one-word fragment.
  // - Each screen stays visible for 2.5s + 0.35s/word (editable in content.js,
  //   or per-line `{ text, duration }` override), with 0.5s fades and 0.8s
  //   clear-photo gaps ONLY between screens.
  // ------------------------------------------------------------------------
  const CAPTION_FADE_MS = 500;
  const CAPTION_GAP_MS = 800;
  const CAPTION_INITIAL_DELAY_MS = 400;

  function normalizeCaptionEntries(rawLines) {
    if (!Array.isArray(rawLines)) return [];
    const entries = [];
    rawLines.forEach(function (item) {
      if (typeof item === "string") {
        const t = item.trim();
        if (t) entries.push({ text: t, duration: null });
      } else if (item && typeof item === "object" && typeof item.text === "string") {
        const t = item.text.trim();
        if (t) {
          const dur = typeof item.duration === "number" && item.duration > 0 ? item.duration : null;
          entries.push({ text: t, duration: dur });
        }
      }
    });
    return entries;
  }

  function getFiveLineCharCapacity(sideWidthPx) {
    const vw = (typeof window !== "undefined" && window.innerWidth) ? window.innerWidth : 390;
    const cardW = (sideWidthPx ? Math.max(220, sideWidthPx - 24) : Math.min(vw * 0.9, 560)) - 28;
    // At minimum 0.9rem (14.4px), estimate conservative chars per line * 5 lines
    const charsPerLine = Math.max(18, Math.floor(cardW / (14.4 * 0.52)));
    return charsPerLine * 5;
  }

  // Splits a single overly-long caption ONLY at sentence endings (. ? !) and never leaves a 1-word fragment
  function splitSingleEntryAtSentences(entry, maxFiveLineChars) {
    const text = entry.text;
    if (text.length <= maxFiveLineChars) return [entry];

    const rawSentences = text.match(/[^.!?]+[.!?]+["'”’)]*(?=\s|$)|[^.!?]+$/g);
    if (!rawSentences) return [entry];

    const sentences = rawSentences.map(function (s) { return s.trim(); }).filter(Boolean);
    if (sentences.length <= 1) {
      // Single sentence: never split inside a sentence
      return [entry];
    }

    // Merge any 1-word sentence with its neighbor so no 1-word fragment ever stands alone
    const safeSentences = [];
    sentences.forEach(function (s) {
      const wc = s.split(/\s+/).filter(Boolean).length;
      if (wc <= 1 && safeSentences.length > 0) {
        safeSentences[safeSentences.length - 1] += " " + s;
      } else {
        safeSentences.push(s);
      }
    });
    if (safeSentences.length > 1 && safeSentences[0].split(/\s+/).filter(Boolean).length <= 1) {
      safeSentences[1] = safeSentences[0] + " " + safeSentences[1];
      safeSentences.shift();
    }

    const chunks = [];
    let current = "";
    safeSentences.forEach(function (s) {
      const candidate = current ? current + " " + s : s;
      if (candidate.length > maxFiveLineChars && current) {
        chunks.push(current);
        current = s;
      } else {
        current = candidate;
      }
    });
    if (current) chunks.push(current);

    if (chunks.length <= 1) return [entry];
    return chunks.map(function (chunkText) {
      return { text: chunkText, duration: null };
    });
  }

  function getCaptionScreenDurationSec(entry) {
    if (entry && typeof entry.duration === "number" && entry.duration > 0) {
      return entry.duration;
    }
    const base = (CONTENT.timing && typeof CONTENT.timing.captionBaseSec === "number")
      ? CONTENT.timing.captionBaseSec
      : 2.5;
    const perWord = (CONTENT.timing && typeof CONTENT.timing.captionSecPerWord === "number")
      ? CONTENT.timing.captionSecPerWord
      : 0.35;
    const words = entry && entry.text ? entry.text.trim().split(/\s+/).filter(Boolean).length : 0;
    return Math.round((base + words * perWord) * 10) / 10;
  }

  function buildCaptionSchedule(rawLines, sideWidthPx) {
    const entries = normalizeCaptionEntries(rawLines);
    if (entries.length === 0) {
      return { screens: [], totalRequiredSec: 0 };
    }
    const screens = entries.length === 1
      ? splitSingleEntryAtSentences(entries[0], getFiveLineCharCapacity(sideWidthPx))
      : entries;

    let totalMs = CAPTION_INITIAL_DELAY_MS;
    const timedScreens = screens.map(function (entry, idx) {
      const durSec = getCaptionScreenDurationSec(entry);
      const durMs = Math.max(2000, Math.round(durSec * 1000));
      const startAt = totalMs;
      totalMs += durMs;
      if (idx < screens.length - 1) {
        totalMs += CAPTION_GAP_MS;
      }
      return {
        text: entry.text,
        durationSec: durSec,
        startAtMs: startAt,
        durMs: durMs
      };
    });

    return {
      screens: timedScreens,
      totalRequiredSec: Math.ceil((totalMs + 400) / 100) / 10
    };
  }

  function getSceneRawCaptionLines(scene, chapter) {
    if (!scene) return [];
    if (chapter && chapter.type === "quotes" && scene.quote && scene.quote.text) {
      return ["“" + scene.quote.text + "”"];
    }
    if (chapter && chapter.type === "timeline" && scene.timeline) {
      return scene.timeline.caption ? [scene.timeline.caption] : [];
    }
    return Array.isArray(scene.subtitles) ? scene.subtitles : [];
  }

  function getEffectiveSceneDurationSec(scene, chapter) {
    const baseDur = scene && typeof scene.durationSec === "number" && scene.durationSec > 0
      ? scene.durationSec
      : (scene && scene.type === "video" ? 14 : 12);
    if (scene && (scene.captionPosition || "").toLowerCase() === "hidden") {
      return baseDur;
    }
    const rawLines = getSceneRawCaptionLines(scene, chapter);
    const schedule = buildCaptionSchedule(rawLines, 0);
    return Math.max(baseDur, schedule.totalRequiredSec);
  }

  function computeCaptionFontSizeCss(text) {
    const len = (text || "").length;
    if (len <= 85) return "";
    // Smoothly scale down from ~1.12rem towards minimum 0.9rem as length grows up to 240 chars
    const t = Math.min(1, (len - 85) / 155);
    const rem = 1.12 - t * (1.12 - 0.9);
    return rem.toFixed(3) + "rem";
  }

  function hideCaptionCard() {
    clearSubtitleBatchTimers();
    if (dom.subtitleInner) {
      dom.subtitleInner.classList.remove("is-shown", "is-tall");
      dom.subtitleInner.style.removeProperty("--caption-font-size");
    }
    if (dom.subtitleBar) dom.subtitleBar.classList.add("is-hidden");
  }

  // lines: array of strings or { text, duration } objects; isDemoText: shows the tiny DEMO tag in the top zone
  // options: { captionPosition, faces, focalPoint, durationSec, label, steps: {total, current} }
  function renderSubtitles(lines, isDemoText, options) {
    clearSubtitleBatchTimers();
    const opts = options || {};
    const captionPos = (opts.captionPosition || "auto").toLowerCase();

    setTopDemoBadgeVisible(isDemoText);

    if (captionPos === "hidden" || !Array.isArray(lines) || lines.length === 0) {
      hideCaptionCard();
      return;
    }

    // Placement inputs (read by applyCaptionPlacement)
    const fpParts = String(opts.focalPoint || "50% 30%").trim().split(/\s+/);
    dom.subtitleBar.dataset.reqPos = captionPos;
    dom.subtitleBar.dataset.faces = (opts.faces || "").toLowerCase();
    dom.subtitleBar.dataset.focalY = String(parseFloat(fpParts[1]) || 30);
    applyCaptionPlacement();

    const sideW = dom.subtitleBar.classList.contains("pos-side")
      ? parseFloat(dom.subtitleBar.dataset.sideSpace) || 0
      : 0;
    const schedule = buildCaptionSchedule(lines, sideW);
    const screens = schedule.screens;
    if (screens.length === 0) {
      hideCaptionCard();
      return;
    }

    // Optional small champagne-gold label (speaker name, year or chapter name)
    if (dom.subtitleLabel) {
      dom.subtitleLabel.textContent = opts.label || "";
      dom.subtitleLabel.classList.toggle("is-hidden", !opts.label);
    }

    // Optional Chapter 5 progress dots inside the card
    if (dom.subtitleTimelineSteps) {
      dom.subtitleTimelineSteps.innerHTML = "";
      if (opts.steps && opts.steps.total > 1) {
        for (let i = 0; i < opts.steps.total; i++) {
          const dot = document.createElement("span");
          dot.className = "timeline-step-dot" + (i <= opts.steps.current ? " is-current" : "");
          dom.subtitleTimelineSteps.appendChild(dot);
        }
        dom.subtitleTimelineSteps.classList.remove("is-hidden");
      } else {
        dom.subtitleTimelineSteps.classList.add("is-hidden");
      }
    }

    const showScreen = function (text) {
      dom.subtitleLines.innerHTML = "";
      dom.subtitleInner.classList.remove("is-tall");
      const customFont = computeCaptionFontSizeCss(text);
      if (customFont) {
        dom.subtitleInner.style.setProperty("--caption-font-size", customFont);
      } else {
        dom.subtitleInner.style.removeProperty("--caption-font-size");
      }

      const p = document.createElement("p");
      p.className = "subtitle-line";
      p.textContent = text;
      dom.subtitleLines.appendChild(p);
      dom.subtitleBar.classList.remove("is-hidden");

      // Next frame: fade in and allow card to grow to 40% height if needed rather than cutting text
      requestAnimationFrame(function () {
        if (dom.subtitleInner && typeof window !== "undefined") {
          const max34 = (window.innerHeight || 640) * 0.34;
          if (dom.subtitleInner.scrollHeight > max34) {
            dom.subtitleInner.classList.add("is-tall");
          }
          dom.subtitleInner.classList.add("is-shown");
        }
      });
    };

    const queue = function (fn, ms) {
      subtitleBatchTimers.push(setTimeout(fn, ms));
    };

    screens.forEach(function (scr, i) {
      queue(function () { showScreen(scr.text); }, scr.startAtMs);
      const isLast = i === screens.length - 1;
      if (!isLast) {
        const fadeOutAt = Math.max(scr.startAtMs + 600, scr.startAtMs + scr.durMs - CAPTION_FADE_MS);
        queue(function () {
          if (dom.subtitleInner) dom.subtitleInner.classList.remove("is-shown");
        }, fadeOutAt);
      }
    });
  }

  // One-time tiny hint explaining tap-to-hide (shared by captions and letters)
  function showTapHintOnce() {
    if (playerState.hasShownLetterTapHint || !dom.letterTapHint) return;
    playerState.hasShownLetterTapHint = true;
    dom.letterTapHint.classList.remove("is-hidden", "is-fading-out");
    setTimeout(function () {
      if (dom.letterTapHint) dom.letterTapHint.classList.add("is-fading-out");
      setTimeout(function () {
        if (dom.letterTapHint) dom.letterTapHint.classList.add("is-hidden");
      }, 550);
    }, 3800);
  }

  // Tap on an empty part of the photo/video toggles every card on/off (never changes the scene)
  function toggleCardsHidden() {
    dom.screenPlayer.classList.toggle("cards-hidden");
    if (dom.letterTapHint) dom.letterTapHint.classList.add("is-hidden");
  }

  function activateSegment(index) {
    if (index < 0 || index >= playerState.segments.length) return;

    cleanupActiveStageVideo(false);
    dom.screenPlayer.classList.remove("cards-hidden");

    playerState.currentSegmentIndex = index;
    playerState.segmentElapsedSec = 0;

    const seg = playerState.segments[index];
    const activeChapters = playerState.activeChapters;
    const chapter = activeChapters[seg.chapterIndex] || activeChapters[0];

    // Preload and decode the next 1 to 2 scenes' photos while the current scene plays
    preloadUpcomingSegmentPhotos(index);

    // Update top bar chapter indicator
    if (seg.kind === "intro-card") {
      dom.playerChapterBadge.textContent = CONTENT.brandLabel || "A MAMFLIX ORIGINAL";
      dom.playerChapterTitle.textContent = CONTENT.filmTitle || "The Story of Her";
      dom.playerTimeReadout.textContent = "Opening";
    } else if (seg.kind === "credits") {
      dom.playerChapterBadge.textContent = "FINALE";
      dom.playerChapterTitle.textContent = "Credits";
      dom.playerTimeReadout.textContent = "End Credits";
    } else {
      dom.playerChapterBadge.textContent = chapter.numberLabel || ("CHAPTER " + (seg.chapterIndex + 1));
      dom.playerChapterTitle.textContent = chapter.title || "";
      dom.playerTimeReadout.textContent = `Chapter ${seg.chapterIndex + 1} of ${activeChapters.length}`;
    }

    // Handle Chapter 2 Worship Audio transitions
    const isChapter2 = chapter && chapter.type === "worship";
    if (!isChapter2 && playerState.worshipTriggeredForChapter2) {
      playerState.worshipTriggeredForChapter2 = false;
      audioDirector.stopChapterTwoWorship(false);
      dom.worshipStatusCard.classList.add("is-hidden");
    }

    // Adjust piano volume for non-video / non-worship segments
    const isVideoSegment = seg.kind === "ministry-video" || seg.kind === "wish-video";
    if (chapter && chapter.type === "letters" && seg.kind === "letter") {
      audioDirector.fadePianoTo(CONTENT.audio.pianoLetterVolume || 0.42, 1600);
    } else if (!isChapter2 && !isVideoSegment) {
      audioDirector.restorePiano(1600);
    }

    hideAllStageOverlays();

    /* --- CASE 1: OPENING INTRO CARD (Plain plum/blurred background, NO photo behind) --- */
    if (seg.kind === "intro-card") {
      dom.slideLayerA.classList.remove("is-active");
      dom.slideLayerB.classList.remove("is-active");
      dom.titleCardEyebrow.textContent = CONTENT.brandLabel || "A MAMFLIX ORIGINAL";
      dom.titleCardHeading.textContent = CONTENT.filmTitle || "The Story of Her";
      dom.titleCardEpigraph.textContent = CONTENT.tagline || "";
      dom.titleCardOverlay.classList.remove("is-hidden");
      return;
    }

    /* --- CASE 2: CHAPTER TITLE CARD (Plain plum/blurred background, NO photo behind) --- */
    if (seg.kind === "chapter-card") {
      dom.slideLayerA.classList.remove("is-active");
      dom.slideLayerB.classList.remove("is-active");

      dom.titleCardEyebrow.textContent = chapter.numberLabel;
      dom.titleCardHeading.textContent = chapter.title;
      dom.titleCardEpigraph.textContent = chapter.epigraph || "";
      setTopDemoBadgeVisible(Boolean(chapter.epigraphIsDemo));
      dom.titleCardOverlay.classList.remove("is-hidden");
      return;
    }

    /* --- CASE 3A: MINISTRY VIDEO SCENE (type: "video" in Chapter 4 or any chapter) --- */
    if (seg.kind === "ministry-video") {
      const scene = seg.scene;
      crossfadeToStageVideo({
        file: scene.file,
        poster: scene.poster,
        focalPoint: scene.focalPoint || "50% 30%",
        fit: scene.fit || "auto",
        startTime: scene.startTime || 0,
        volume: scene.volume !== undefined ? scene.volume : 0.92,
        durationSec: scene.durationSec || 14,
        isWish: false
      }, index);

      if (scene.caption) {
        showTransientTopPill(dom.videoCaptionOverlay, dom.videoCaptionText, scene.caption);
      }

      // Videos: caption card sits in the bottom/top zone (or the blurred space beside/around a contained video)
      renderSubtitles(scene.subtitles, scene.isDemoText, {
        captionPosition: scene.captionPosition || "auto",
        faces: scene.faces,
        focalPoint: scene.focalPoint,
        durationSec: scene.durationSec || 14,
        label: ""
      });
      return;
    }

    /* --- CASE 3B: VOICES OF LOVE — FEATURED BIRTHDAY WISH VIDEO --- */
    if (seg.kind === "wish-video") {
      const wish = seg.wish;
      crossfadeToStageVideo({
        file: wish.file,
        poster: wish.poster,
        focalPoint: wish.focalPoint || "50% 30%",
        fit: wish.fit || "auto",
        startTime: wish.startTime || 0,
        volume: wish.volume !== undefined ? wish.volume : 0.95,
        durationSec: wish.durationSec || CONTENT.demoWishDurationSec || 14,
        isWish: true
      }, index);

      setTopDemoBadgeVisible(Boolean(wish.isDemoText));
      dom.wishFilmCounter.textContent = `VOICE OF LOVE ${seg.wishIndex + 1} / ${seg.totalWishes}`;
      dom.wishFilmName.textContent = wish.name || "";
      dom.wishFilmRel.textContent = wish.relationship || "";
      dom.wishFilmMsg.textContent = wish.message ? `“${wish.message}”` : "";

      dom.btnPrevFilmWish.disabled = seg.wishIndex === 0;
      dom.btnPrevFilmWish.style.opacity = seg.wishIndex === 0 ? "0.45" : "1";
      dom.btnNextFilmWish.textContent =
        seg.wishIndex === seg.totalWishes - 1 ? "Letters →" : "Next Wish →";

      dom.wishFilmOverlay.classList.remove("is-hidden");
      return;
    }

    /* --- CASE 3C: PHOTO SCENE (Chapters 1, 2, 3, 4, 5) --- */
    if (seg.kind === "scene") {
      const scene = seg.scene;
      crossfadeToPhoto({
        src: scene.photo,
        focalPoint: scene.focalPoint || "50% 30%",
        fit: scene.fit || "auto",
        kenBurns: scene.kenBurns || "zoom-in"
      }, seg.durationSec);

      if (chapter.type === "worship" && !playerState.worshipTriggeredForChapter2) {
        playerState.worshipTriggeredForChapter2 = true;
        const ch2TotalSec = getChapterDurationSec(chapter);
        audioDirector.startChapterTwoWorship(ch2TotalSec, {
          onPlayingReal: function () {
            showTransientTopPill(
              dom.worshipStatusCard,
              dom.worshipStatusTitle,
              chapter.recordingTitle || "Mam's worship recording"
            );
          },
          onPlaceholder: function () {
            if (isDemoAuto()) {
              showTransientTopPill(
                dom.worshipStatusCard,
                dom.worshipStatusTitle,
                "Mam's worship recording · demo"
              );
            }
          },
          onEnded: function () {
            dom.worshipStatusCard.classList.add("is-hidden");
          }
        });
      }

      // Chapter 4 quotes and Chapter 5 timeline labels use the same compact caption card (see below)
      let captionLines = scene.subtitles;
      let captionLabel = "";
      let captionSteps = null;

      if (chapter.type === "quotes" && scene.quote) {
        captionLines = ["“" + (scene.quote.text || "") + "”"];
        captionLabel = scene.quote.attribution || "";
      }

      if (chapter.type === "timeline" && scene.timeline) {
        const tl = scene.timeline;
        captionLabel = [tl.yearLabel, tl.milestoneTitle].filter(Boolean).join(" · ");
        captionLines = [tl.caption || ""];
        captionSteps = { total: seg.totalScenes, current: seg.sceneIndex };
      }

      renderSubtitles(captionLines, scene.isDemoText, {
        captionPosition: scene.captionPosition || "auto",
        faces: scene.faces,
        focalPoint: scene.focalPoint,
        durationSec: seg.durationSec,
        label: captionLabel,
        steps: captionSteps
      });
      showTapHintOnce();
      return;
    }

    /* --- CASE 4: CHAPTER 7 — LETTERS TO MAM (Smaller, Clearer Glass Card + Smart Placement) --- */
    if (seg.kind === "letter") {
      const letter = seg.letter;
      const kbMoves = ["zoom-in", "pan-right", "zoom-out", "pan-left"];
      const bgSrc = seg.resolvedBgPhoto || letter.backgroundPhoto || chapter.backgroundPhoto || "assets/photos/ch1-01.jpg";

      // Reset expanded state and unhide card on each new letter
      setLetterExpanded(false);

      // Show a tiny tap-to-hide hint the first time only
      showTapHintOnce();

      // Slowly crossfade to the background photo for this letter with Smart Fit & gentle Ken Burns
      crossfadeToPhoto({
        src: bgSrc,
        focalPoint: letter.backgroundFocalPoint || "50% 25%",
        fit: letter.backgroundFit || "auto",
        kenBurns: kbMoves[seg.letterIndex % kbMoves.length]
      }, seg.durationSec);

      setTopDemoBadgeVisible(Boolean(letter.isDemoText));

      // Top Zone Progress Indicator ("3 / 9" + dots + Skip to Credits)
      dom.letterCounter.textContent = `${seg.letterIndex + 1} / ${seg.totalLetters}`;
      if (dom.letterTopProgress) {
        dom.letterTopProgress.classList.remove("is-hidden");
      }

      // Smart Placement: "auto" reads focalPoint vertical position (>=55% -> top, otherwise bottom)
      // and optional `faces: "upper" | "lower" | "both"`
      const placement = resolveLetterCardPlacement(letter);
      if (dom.letterStageWrap) {
        dom.letterStageWrap.classList.remove("card-pos-bottom", "card-pos-center", "card-pos-top", "is-faces-both");
        dom.letterStageWrap.classList.add(placement.zone === "top" ? "card-pos-top" : "card-pos-bottom");
        if (placement.isFacesBoth) {
          dom.letterStageWrap.classList.add("is-faces-both");
        }
      }

      // Sender Name & Relationship (compact 1-line inline block)
      const displaySenderName = letter.senderName || (letter.sender ? letter.sender.replace(/^from:\s*/i, "") : "Dear Friend");
      const displayRel = letter.relationship || letter.role || "Birthday Blessing";
      dom.letterSender.textContent = displaySenderName;
      dom.letterRole.textContent = displayRel;

      // Optional small inline circular sender photo (38px): if there is no sender photo or it differs
      // only as a missing file, show no monogram at all (since the background already shows the sender).
      if (dom.letterAvatarRing && dom.letterAvatarImg) {
        dom.letterAvatarRing.classList.add("is-hidden");
        dom.letterAvatarImg.removeAttribute("src");

        if (letter.senderPhoto && letter.senderPhoto !== bgSrc) {
          dom.letterAvatarImg.style.objectPosition = letter.senderFocalPoint || "50% 30%";
          loadAndDecodePhoto(letter.senderPhoto, false)
            .then(function (res) {
              if (playerState.currentSegmentIndex === index && dom.letterAvatarRing && dom.letterAvatarImg) {
                dom.letterAvatarImg.src = res.resolvedSrc;
                dom.letterAvatarRing.classList.remove("is-hidden");
              }
            })
            .catch(function () {
              // No sender photo found -> keep avatar ring hidden (no monogram)
            });
        }
      }

      // Message Body (supports `message` string or legacy `paragraphs` array)
      dom.letterBody.innerHTML = "";
      dom.letterBody.scrollTop = 0;
      const bodyParas = [];
      if (typeof letter.message === "string" && letter.message.trim()) {
        letter.message.split(/\n+/).forEach(function (line) {
          if (line.trim()) bodyParas.push(line.trim());
        });
      } else if (Array.isArray(letter.paragraphs)) {
        letter.paragraphs.forEach(function (para) {
          if (para && para.trim()) bodyParas.push(para.trim());
        });
      }

      bodyParas.forEach(function (paraText) {
        const p = document.createElement("p");
        p.textContent = paraText;
        dom.letterBody.appendChild(p);
      });

      // Top Zone Dots
      dom.letterDots.innerHTML = "";
      for (let i = 0; i < seg.totalLetters; i++) {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "letter-dot" + (i === seg.letterIndex ? " is-active" : "");
        dot.setAttribute("aria-label", "Go to letter " + (i + 1));
        dot.addEventListener("click", function () {
          jumpToLetterIndex(i);
        });
        dom.letterDots.appendChild(dot);
      }

      dom.btnPrevLetter.disabled = seg.letterIndex === 0;
      dom.btnPrevLetter.style.opacity = seg.letterIndex === 0 ? "0.45" : "1";
      dom.btnNextLetter.textContent =
        seg.letterIndex === seg.totalLetters - 1 ? "Credits →" : "Next →";

      dom.lettersOverlay.classList.remove("is-hidden");

      // Check whether message exceeds 3-4 lines and needs the soft fade + "Read more" control
      requestAnimationFrame(function () {
        evaluateLetterTruncation();
      });
      return;
    }

    /* --- CASE 5: END CREDITS --- */
    if (seg.kind === "credits") {
      dom.worshipStatusCard.classList.add("is-hidden");
      dom.creditsOverlay.classList.remove("is-hidden");
      wakePlayerChrome();
    }
  }

  /* ------------------------------------------------------------------------
     11. MAIN PLAYBACK LOOP & TRANSPORT CONTROLS
     ------------------------------------------------------------------------ */

  function tickPlayback(now) {
    if (!playerState.isActive) return;

    if (!playerState.lastFrameTime) {
      playerState.lastFrameTime = now;
    }
    const deltaSec = Math.min(0.25, (now - playerState.lastFrameTime) / 1000);
    playerState.lastFrameTime = now;

    if (!playerState.isPaused) {
      const seg = playerState.segments[playerState.currentSegmentIndex];
      if (seg) {
        // In Play Film mode, pause auto-advance while a letter card is expanded via "Read more"
        const holdLetterForReadMore = seg.kind === "letter" && playerState.isLetterExpanded;
        if (!holdLetterForReadMore) {
          playerState.segmentElapsedSec += deltaSec;
        }

        const totalElapsed = seg.startTimeSec + Math.min(seg.durationSec, playerState.segmentElapsedSec);
        const pct = Math.min(100, (totalElapsed / playerState.totalDurationSec) * 100);
        dom.progressFill.style.width = pct.toFixed(2) + "%";
        dom.progressTrack.setAttribute("aria-valuenow", Math.round(pct));

        // If a real HTML5 video is currently playing, its `ended` event advances the segment;
        // otherwise the timer advances when segmentElapsedSec reaches seg.durationSec.
        if (!playerState.isWaitingOnRealVideoEnd && !holdLetterForReadMore && playerState.segmentElapsedSec >= seg.durationSec) {
          if (playerState.currentSegmentIndex + 1 < playerState.segments.length) {
            activateSegment(playerState.currentSegmentIndex + 1);
          } else {
            playerState.segmentElapsedSec = seg.durationSec;
          }
        }
      }
    }

    playerState.rafId = requestAnimationFrame(tickPlayback);
  }

  function startFullFilm() {
    buildFilmSegments();
    dom.screenHome.classList.add("is-hidden");
    dom.screenPlayer.classList.remove("is-hidden");

    playerState.isActive = true;
    setPlayerPaused(false);
    playerState.lastFrameTime = performance.now();

    activateSegment(0);
    wakePlayerChrome();

    if (playerState.rafId) cancelAnimationFrame(playerState.rafId);
    playerState.rafId = requestAnimationFrame(tickPlayback);
  }

  function startFilmFromChapter(chapterIndex) {
    buildFilmSegments();
    dom.screenHome.classList.add("is-hidden");
    dom.screenPlayer.classList.remove("is-hidden");

    playerState.isActive = true;
    setPlayerPaused(false);
    playerState.lastFrameTime = performance.now();

    const targetIndex = playerState.segments.findIndex(function (seg) {
      return seg.kind === "chapter-card" && seg.chapterIndex === chapterIndex;
    });

    activateSegment(targetIndex >= 0 ? targetIndex : 0);
    wakePlayerChrome();

    if (playerState.rafId) cancelAnimationFrame(playerState.rafId);
    playerState.rafId = requestAnimationFrame(tickPlayback);
  }

  function returnToHomepage() {
    playerState.isActive = false;
    if (playerState.rafId) cancelAnimationFrame(playerState.rafId);
    cleanupActiveStageVideo(false);
    audioDirector.stopChapterTwoWorship(true);
    setPlayerPaused(false);

    dom.worshipStatusCard.classList.add("is-hidden");
    dom.screenPlayer.classList.add("is-hidden");
    dom.screenHome.classList.remove("is-hidden");
  }

  function setPlayerPaused(paused) {
    playerState.isPaused = paused;
    document.body.classList.toggle("film-paused", paused);
    audioDirector.setPaused(paused);

    if (playerState.activeStageVideo) {
      try {
        if (paused) {
          playerState.activeStageVideo.pause();
        } else {
          playerState.activeStageVideo.play().catch(function () {});
        }
      } catch (e) {}
    }

    dom.iconPause.classList.toggle("is-hidden", paused);
    dom.iconPlay.classList.toggle("is-hidden", !paused);
    dom.pausedIndicator.classList.toggle("is-hidden", !paused);

    if (paused) {
      dom.playerChrome.classList.remove("is-idle");
    }
  }

  function togglePlayPause() {
    setPlayerPaused(!playerState.isPaused);
  }

  function skipToAdjacentChapter(direction) {
    const currentSeg = playerState.segments[playerState.currentSegmentIndex];
    if (!currentSeg) return;

    const currentChapter = currentSeg.chapterIndex;
    let targetChapter = currentChapter + direction;

    if (direction < 0 && playerState.segmentElapsedSec > 4 && currentSeg.kind !== "chapter-card") {
      targetChapter = currentChapter;
    }

    if (targetChapter < 0) targetChapter = 0;
    if (targetChapter >= playerState.activeChapters.length) {
      const creditsIdx = playerState.segments.findIndex(function (s) {
        return s.kind === "credits";
      });
      if (creditsIdx >= 0) activateSegment(creditsIdx);
      return;
    }

    const idx = playerState.segments.findIndex(function (s) {
      return s.kind === "chapter-card" && s.chapterIndex === targetChapter;
    });
    if (idx >= 0) activateSegment(idx);
  }

  function jumpToLetterIndex(letterIdx) {
    const idx = playerState.segments.findIndex(function (s) {
      return s.kind === "letter" && s.letterIndex === letterIdx;
    });
    if (idx >= 0) activateSegment(idx);
  }

  function stepLetter(delta) {
    const seg = playerState.segments[playerState.currentSegmentIndex];
    if (!seg || seg.kind !== "letter") return;

    const nextLetterIdx = seg.letterIndex + delta;
    if (nextLetterIdx < 0) return;
    if (nextLetterIdx >= seg.totalLetters) {
      const creditsIdx = playerState.segments.findIndex(function (s) {
        return s.kind === "credits";
      });
      if (creditsIdx >= 0) activateSegment(creditsIdx);
      return;
    }
    jumpToLetterIndex(nextLetterIdx);
  }

  function stepFilmWish(delta) {
    const seg = playerState.segments[playerState.currentSegmentIndex];
    if (!seg || seg.kind !== "wish-video") return;

    const nextWishIdx = seg.wishIndex + delta;
    if (nextWishIdx < 0) return;
    if (nextWishIdx >= seg.totalWishes) {
      // Move to next chapter (Letters to Mam)
      skipToAdjacentChapter(1);
      return;
    }
    const idx = playerState.segments.findIndex(function (s) {
      return s.kind === "wish-video" && s.wishIndex === nextWishIdx;
    });
    if (idx >= 0) activateSegment(idx);
  }

  /* ------------------------------------------------------------------------
     12. AUTO-HIDING CONTROLS, CHAPTER MODAL, KEYBOARD & SWIPE GESTURES
     ------------------------------------------------------------------------ */

  function wakePlayerChrome() {
    dom.playerChrome.classList.remove("is-idle");
    if (playerState.idleTimer) clearTimeout(playerState.idleTimer);
    playerState.idleTimer = setTimeout(function () {
      const seg = playerState.segments[playerState.currentSegmentIndex];
      const isCredits = seg && seg.kind === "credits";
      if (playerState.isActive && !playerState.isPaused && !playerState.isLetterExpanded && !isCredits) {
        dom.playerChrome.classList.add("is-idle");
      }
    }, 3000);
  }

  function openChapterModal() {
    dom.chapterModal.classList.remove("is-hidden");
    if (playerState.isActive && !playerState.isPaused) {
      playerState.wasPlayingBeforeModal = true;
      setPlayerPaused(true);
    } else {
      playerState.wasPlayingBeforeModal = false;
    }
  }

  function closeChapterModal() {
    dom.chapterModal.classList.add("is-hidden");
    if (playerState.isActive && playerState.wasPlayingBeforeModal && !lightboxState.isOpen) {
      setPlayerPaused(false);
    }
  }

  function syncMuteButtons(isMuted) {
    dom.iconHomeUnmuted.classList.toggle("is-hidden", isMuted);
    dom.iconHomeMuted.classList.toggle("is-hidden", !isMuted);
    dom.iconPlayerUnmuted.classList.toggle("is-hidden", isMuted);
    dom.iconPlayerMuted.classList.toggle("is-hidden", !isMuted);

    if (playerState.activeStageVideo) {
      playerState.activeStageVideo.muted = isMuted;
    }
    if (lightboxState.activeVideo) {
      lightboxState.activeVideo.muted = isMuted;
    }
  }

  function bindEventListeners() {
    // Homepage Actions
    dom.btnPlayFilm.addEventListener("click", startFullFilm);
    dom.btnExploreStory.addEventListener("click", openChapterModal);
    dom.btnHomeChapters.addEventListener("click", openChapterModal);

    dom.btnHomeMute.addEventListener("click", function () {
      syncMuteButtons(audioDirector.toggleMute());
    });

    // Chapter & Wall of Wishes Modal
    dom.btnCloseChapters.addEventListener("click", closeChapterModal);
    dom.chapterModalBackdrop.addEventListener("click", closeChapterModal);

    // Standalone Wish Lightbox Controls
    dom.btnCloseWishLightbox.addEventListener("click", function (e) {
      e.stopPropagation();
      closeWishLightbox();
    });
    dom.btnPrevWallWish.addEventListener("click", function (e) {
      e.stopPropagation();
      loadWishIntoLightbox(lightboxState.currentIndex - 1);
    });
    dom.btnNextWallWish.addEventListener("click", function (e) {
      e.stopPropagation();
      loadWishIntoLightbox(lightboxState.currentIndex + 1);
    });

    // Swipe down to close (or swipe left/right to navigate) on Wall of Wishes Lightbox
    if (dom.wishLightboxStage) {
      let lbStartX = 0;
      let lbStartY = 0;
      dom.wishLightboxStage.addEventListener("touchstart", function (e) {
        if (e.target.closest("button, a, .card, .controls")) return;
        if (!e.touches || !e.touches[0]) return;
        lbStartX = e.touches[0].clientX;
        lbStartY = e.touches[0].clientY;
      }, { passive: true });
      dom.wishLightboxStage.addEventListener("touchend", function (e) {
        if (e.target.closest("button, a, .card, .controls")) return;
        if (!e.changedTouches || !e.changedTouches[0]) return;
        const dx = e.changedTouches[0].clientX - lbStartX;
        const dy = e.changedTouches[0].clientY - lbStartY;
        if (dy > 60 && Math.abs(dy) > Math.abs(dx) * 1.4) {
          closeWishLightbox();
        } else if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4) {
          loadWishIntoLightbox(lightboxState.currentIndex + (dx < 0 ? 1 : -1));
        }
      }, { passive: true });
    }

    // Player Controls
    dom.btnPlayerHome.addEventListener("click", function (e) {
      e.stopPropagation();
      returnToHomepage();
    });
    dom.btnPlayerChapters.addEventListener("click", function (e) {
      e.stopPropagation();
      openChapterModal();
    });
    dom.btnSkipLetters.addEventListener("click", function (e) {
      e.stopPropagation();
      const activeChapters = getActiveChapters();
      const lettersChapterIdx = activeChapters.findIndex(function (c) {
        return c.type === "letters";
      });
      if (lettersChapterIdx >= 0) {
        startFilmFromChapter(lettersChapterIdx);
      }
    });

    dom.btnPlayPause.addEventListener("click", function (e) {
      e.stopPropagation();
      togglePlayPause();
    });
    dom.btnPrevChapter.addEventListener("click", function (e) {
      e.stopPropagation();
      skipToAdjacentChapter(-1);
    });
    dom.btnNextChapter.addEventListener("click", function (e) {
      e.stopPropagation();
      skipToAdjacentChapter(1);
    });
    dom.btnPlayerMute.addEventListener("click", function (e) {
      e.stopPropagation();
      syncMuteButtons(audioDirector.toggleMute());
    });

    // Featured Wish Navigation Inside Film
    dom.btnPrevFilmWish.addEventListener("click", function (e) {
      e.stopPropagation();
      stepFilmWish(-1);
    });
    dom.btnNextFilmWish.addEventListener("click", function (e) {
      e.stopPropagation();
      stepFilmWish(1);
    });

    // Letter Buttons
    dom.btnPrevLetter.addEventListener("click", function (e) {
      e.stopPropagation();
      stepLetter(-1);
    });
    dom.btnNextLetter.addEventListener("click", function (e) {
      e.stopPropagation();
      stepLetter(1);
    });
    if (dom.btnLetterReadMore) {
      dom.btnLetterReadMore.addEventListener("click", function (e) {
        e.stopPropagation();
        setLetterExpanded(!playerState.isLetterExpanded);
      });
    }
    if (dom.btnSkipToCredits) {
      dom.btnSkipToCredits.addEventListener("click", function (e) {
        e.stopPropagation();
        const creditsIdx = playerState.segments.findIndex(function (s) {
          return s.kind === "credits";
        });
        if (creditsIdx >= 0) activateSegment(creditsIdx);
      });
    }

    // Credits Buttons
    dom.btnReplayFilm.addEventListener("click", function (e) {
      e.stopPropagation();
      startFullFilm();
    });
    dom.btnCreditsLetters.addEventListener("click", function (e) {
      e.stopPropagation();
      jumpToLetterIndex(0);
    });
    dom.btnCreditsHome.addEventListener("click", function (e) {
      e.stopPropagation();
      returnToHomepage();
    });

    // Wake player controls on mouse move or touch
    ["mousemove", "pointerdown", "touchstart"].forEach(function (evt) {
      dom.screenPlayer.addEventListener(evt, wakePlayerChrome, { passive: true });
      if (dom.wishLightbox) {
        dom.wishLightbox.addEventListener(evt, wakeLightboxChrome, { passive: true });
      }
    });

    // Keyboard Shortcuts
    document.addEventListener("keydown", function (e) {
      if (lightboxState.isOpen) {
        if (e.key === "Escape") closeWishLightbox();
        if (e.key === "ArrowRight") loadWishIntoLightbox(lightboxState.currentIndex + 1);
        if (e.key === "ArrowLeft") loadWishIntoLightbox(lightboxState.currentIndex - 1);
        return;
      }

      if (!dom.chapterModal.classList.contains("is-hidden")) {
        if (e.key === "Escape") closeChapterModal();
        return;
      }

      if (!playerState.isActive) return;

      const seg = playerState.segments[playerState.currentSegmentIndex];
      const inLetters = seg && seg.kind === "letter";
      const inWishes = seg && seg.kind === "wish-video";

      if (e.code === "Space") {
        e.preventDefault();
        togglePlayPause();
        wakePlayerChrome();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (inLetters) {
          stepLetter(1);
        } else if (inWishes) {
          stepFilmWish(1);
        } else {
          skipToAdjacentChapter(1);
        }
        wakePlayerChrome();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (inLetters) {
          stepLetter(-1);
        } else if (inWishes) {
          stepFilmWish(-1);
        } else {
          skipToAdjacentChapter(-1);
        }
        wakePlayerChrome();
      } else if (e.key === "m" || e.key === "M") {
        syncMuteButtons(audioDirector.toggleMute());
        wakePlayerChrome();
      }
    });

    // Mobile Swipe & Tap-to-Hide on the Photo/Video Background Stage Only
    // Ignores gestures starting inside any button, link, card, or control bar.
    let touchStartX = 0;
    let touchStartY = 0;
    let suppressNextStageClick = false;

    if (dom.playerStage) {
      dom.playerStage.addEventListener("touchstart", function (e) {
        if (e.target.closest("button, a, .card, .controls")) return;
        if (!e.touches || !e.touches[0]) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }, { passive: true });

      dom.playerStage.addEventListener("touchend", function (e) {
        if (e.target.closest("button, a, .card, .controls")) return;
        if (!e.changedTouches || !e.changedTouches[0]) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;

        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4) {
          suppressNextStageClick = true;
          const seg = playerState.segments[playerState.currentSegmentIndex];
          const inLetters = seg && seg.kind === "letter";
          const inWishes = seg && seg.kind === "wish-video";

          if (dx < 0) {
            if (inLetters) stepLetter(1);
            else if (inWishes) stepFilmWish(1);
            else skipToAdjacentChapter(1);
          } else {
            if (inLetters) stepLetter(-1);
            else if (inWishes) stepFilmWish(-1);
            else skipToAdjacentChapter(-1);
          }
        }
      }, { passive: true });

      // Tap on empty photo/video only toggles cards and controls; it NEVER changes the scene
      dom.playerStage.addEventListener("click", function (e) {
        if (suppressNextStageClick) {
          suppressNextStageClick = false;
          return;
        }
        if (e.target.closest("button, a, .card, .controls")) return;
        const seg = playerState.segments[playerState.currentSegmentIndex];
        if (!seg || seg.kind === "intro-card" || seg.kind === "chapter-card" || seg.kind === "credits") {
          return;
        }
        toggleCardsHidden();
        wakePlayerChrome();
      });
    }
  }

  /* ------------------------------------------------------------------------
     13. BOOTSTRAP
     ------------------------------------------------------------------------ */

  function init() {
    initAmbientParticles();
    hydrateHomepageAndCredits();
    initGateFlow();
    bindEventListeners();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
