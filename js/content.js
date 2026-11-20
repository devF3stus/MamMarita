/* ==========================================================================
   MAMFLIX — THE STORY OF HER
   Content Configuration File (js/content.js)
   ==========================================================================
   EVERY editable piece of text, photo filename, video clip, birthday wish,
   audio setting, timing, quote, timeline milestone, and letter lives in this
   single file. You never need to edit index.html, style.css, or main.js.
   ========================================================================== */

window.MAMFLIX_CONTENT = {

  /* ------------------------------------------------------------------------
     1. DEMO & PRIVACY SETTINGS
     ------------------------------------------------------------------------ */

  // demoMode: Controls how missing photos, videos, audio, and demo tags behave.
  // - "auto" (default): Shows elegant placeholder frames ONLY where real files
  //   are not yet in assets/photos/, assets/videos/, or assets/audio/. As soon
  //   as you drop a matching file into the folder, the real file takes over!
  // - "off": Final release mode. Hides all "DEMO" badges, demo placeholders,
  //   and gracefully skips any missing video or empty wishes list.
  //   Set this to "off" right before you send the link to Mam.
  demoMode: "auto",

  // showDemoTags: Set to false to hide the small gold "DEMO" badges on sample
  // text while still keeping demo photo/video frames active.
  showDemoTags: true,

  // passwordGate: Optional light privacy screen before the "Press to Begin" gate.
  // NOTE: Because GitHub Pages sites are public code, this is a polite privacy
  // curtain for family & friends rather than bank-grade encryption.
  passwordGate: {
    enabled: false,                // Change to true to ask for a passcode first
    passcode: "MAM2026",           // The passcode viewers must enter (not case-sensitive)
    promptTitle: "A Private Family Screening",
    promptSubtitle: "Enter the invitation code to join the celebration."
  },

  /* ------------------------------------------------------------------------
     2. FILM IDENTITY & HERO HOMEPAGE
     ------------------------------------------------------------------------ */

  // Brand header shown above the title
  brandLabel: "A MAMFLIX ORIGINAL",

  // Edition sub-header
  editionLabel: "A SPECIAL BIRTHDAY EDITION",

  // Main documentary title
  filmTitle: "The Story of Her",

  // Dedicated honoree name
  honoreeName: "Pastor Marita Mbae",
  honoreeEndearment: "Mam",

  // Tagline shown under the main title
  tagline: "A beautiful life. A remarkable woman. A song that continues.",

  // DEMO: Sample homepage description — replace with your own 1–2 sentence summary
  description: "An intimate portrait of grace, devotion, motherhood, and a voice lifted in worship — told through the moments, photographs, voices, and lives touched along the way.",
  descriptionIsDemo: true, // Set to false once you write your final description

  // Metadata row shown on the Netflix-style hero page
  metadata: [
    "2026",
    "7 Chapters",
    "About 6 Minutes",
    "A Birthday Edition",
    "HD"
  ],

  // Hero background photograph (placed in assets/photos/hero.jpg)
  // Recommended size: around 2560px on the long edge, JPEG (.jpg) format, quality 82-85%.
  // Until assets/photos/hero.jpg exists, an elegant plum & gold demo backdrop appears.
  heroPhoto: {
    src: "assets/photos/hero.jpg",
    focalPoint: "50% 22%", // "left% top%" — extra-safe framing so her face is never cut off
    fit: "auto",           // "auto" uses cover on matching screens, or blurred-fill if portrait on a wide screen
    kenBurns: "zoom-in"    // Subtle movement: "zoom-in", "zoom-out", "pan-left", "pan-right"
  },

  /* ------------------------------------------------------------------------
     3. AUDIO & MUSIC SETTINGS
     ------------------------------------------------------------------------ */

  audio: {
    // Main ambient piano loop (place a real licensed/royalty-free MP3 here).
    // While this file is missing, the site generates a gentle live Web Audio
    // ambient chord loop so you can test fades, pause, and mute right away.
    pianoSrc: "assets/audio/piano.mp3",

    // Mam's real singing recording played during Chapter 2.
    // NEVER faked: if this file is not yet in assets/audio/, Chapter 2 shows
    // a respectful "Her recording goes here" card while still testing the piano ducking.
    singingSrc: "assets/audio/mam-singing.mp3",

    // Volumes (0.0 to 1.0)
    pianoNormalVolume: 0.55,       // Standard volume for ambient piano
    pianoDuckedVolume: 0.10,       // Quiet background volume while Mam's recording or any video plays
    pianoLetterVolume: 0.42,       // Warm volume during Letters to Mam
    singingVolume: 0.92,           // Volume for Mam's singing recording in Chapter 2

    // Timing in seconds within Chapter 2 for Mam's singing recording
    singingStartDelaySec: 4,       // Seconds after Chapter 2 title card before recording starts
    singingSeekStartSec: 0,        // If you want to start her MP3 partway in (e.g. 12 seconds in), change 0 to 12
    fadeDurationMs: 2200           // Smooth fade duration (in milliseconds) when ducking/restoring piano
  },

  /* ------------------------------------------------------------------------
     4. TIMING & PACING (in seconds)
     ------------------------------------------------------------------------ */

  timing: {
    introDurationSec: 5,           // Opening "A Mamflix Original" credit card before Chapter 1
    chapterCardDurationSec: 4.5,   // How long each "CHAPTER X" title card stays on screen
    creditsDurationSec: 18,        // End credits roll duration
    captionBaseSec: 2.5,           // Base reading time per caption screen (seconds)
    captionSecPerWord: 0.35,       // Extra reading time per word per caption screen (seconds)
    letterMinDurationSec: 6,       // Minimum display time for a letter in Play Film mode
    letterSecPerWord: 0.35         // Extra seconds added per word in Play Film mode (~8-12s per letter)
  },

  /* ------------------------------------------------------------------------
     5. END CREDITS
     ------------------------------------------------------------------------ */

  credits: {
    leadLabel: "Starring",
    leadName: "Mam · Pastor Marita Mbae",

    // DEMO: Replace with the real names of family and friends
    withLoveLabel: "With love from",
    withLoveFrom: "[Your names here]",
    withLoveIsDemo: true,

    // DEMO: Replace with your name
    directedByLabel: "Directed by",
    directedBy: "[Your name here]",
    directedByIsDemo: true,

    closingBlessing: "Happy Birthday, Mam.",
    closingSubline: "A beautiful life. A remarkable woman. A song that continues."
  },

  /* ------------------------------------------------------------------------
     6. VOICES OF LOVE — BIRTHDAY WISH VIDEOS (Owner-Managed, No Backend)
     ------------------------------------------------------------------------
     Place birthday wish video clips (.mp4) inside: assets/videos/wishes/
     Place optional poster thumbnails (.jpg) inside: assets/videos/posters/

     HOW THIS WORKS:
     - The documentary chapter "VOICES OF LOVE" plays ONLY the wishes marked
       `featured: true` (up to `maxFeaturedWishesInFilm`, default 8), one after
       another, ducking the ambient piano during each video and restoring it after.
     - ALL wishes in this list (both `featured: true` and `featured: false`)
       appear in the "Wall of Wishes" grid inside "Explore Her Story", where
       anyone can tap a card to watch it full-screen.
     - In Demo Mode ("auto"), missing video files show an abstract plum-and-gold
       "DEMO WISH · replace with <filename>" screen so you can test the flow now.
     - When `demoMode: "off"`, if a video file is missing it is skipped gracefully,
       and if the wishes list is empty, the chapter and Wall of Wishes hide automatically.
     ------------------------------------------------------------------------ */

  // Maximum number of featured wish videos to play automatically in the main film
  maxFeaturedWishesInFilm: 8,

  // Default duration (in seconds) used ONLY when previewing a missing demo wish clip
  demoWishDurationSec: 14,

  wishes: [
    {
      // DEMO WISH 1: Drop assets/videos/wishes/wish-01-name.mp4 to replace automatically
      file: "assets/videos/wishes/wish-01-name.mp4",
      name: "Grace",                      // Sender's name shown in champagne gold
      relationship: "Church Family",           // Relationship / role shown next to name
      message: "Thank you for your prayers, warmth, and unfailing encouragement.", // Optional short quote/note
      poster: "assets/videos/posters/wish-01-poster.jpg", // Optional thumbnail image (.jpg)
      focalPoint: "50% 30%",                   // Framing for video ("50% 30%" keeps faces centered)
      fit: "auto",                             // "auto" (default: smart video fit), "cover", or "contain"
      volume: 0.95,                            // Video audio volume (0.0 to 1.0)
      featured: true,                          // true = plays in the film AND shows on Wall of Wishes
      isDemoText: true                         // DEMO: Set to false when you enter a real person's details
    },
    {
      // DEMO WISH 2: Drop assets/videos/wishes/wish-02-name.mp4 to replace automatically
      file: "assets/videos/wishes/wish-02-name.mp4",
      name: "Minister Seijah",
      relationship: "Church family and friend",
      message: "You are so beautiful mama! I love you so much! Happy birthday to you.",
      poster: "assets/videos/posters/wish-02-poster.jpg",
      focalPoint: "50% 30%",
      fit: "auto",
      volume: 0.95,
      featured: true,
      isDemoText: true
    },
    {
      // DEMO WISH 3: Drop assets/videos/wishes/wish-03-name.mp4 to replace automatically
      file: "assets/videos/wishes/wish-03-name.mp4",
      name: "Friend Three",
      relationship: "Dear Friend",
      message: "Wishing you a birthday filled with the same joy you bring to everyone around you.",
      poster: "assets/videos/posters/wish-03-poster.jpg",
      focalPoint: "50% 30%",
      fit: "auto",
      volume: 0.95,
      featured: true,                          // Set to false if you want a wish ONLY on the Wall of Wishes
      isDemoText: true
    }
  ],

  /* ------------------------------------------------------------------------
     7. THE SEVEN DOCUMENTARY CHAPTERS
     ------------------------------------------------------------------------
     Any chapter's `scenes` list can include:
     - Photo scenes (default):
         {
           photo: "assets/photos/ch1-01.jpg",
           focalPoint: "50% 30%",      // Keeps faces framed when using cover fit
           fit: "auto",                // "auto" (default: smart-fit compares photo & screen aspect ratio),
                                       // "cover" (always fill screen), or "contain" (always show full photo with blurred backdrop)
           captionPosition: "auto",    // "auto" (default: bottom zone if focal point Y <= 55%, top zone if Y > 55%, or inside blurred space),
                                       // "bottom", "top", "side" (places card in empty side space on wide screens), or "hidden"
           faces: "upper",             // Optional group photo hint: "upper" (forces card to bottom),
                                       // "lower" (forces card to top), or "both" (smallest compact card)
           kenBurns: "zoom-in",
           durationSec: 11,
           subtitles: [...]
         }
     - Video scenes:
         { type: "video", file: "assets/videos/ministry/ministry-01.mp4", caption: "...", focalPoint: "50% 30%", fit: "auto", startTime: 0, volume: 0.92, poster: "...", durationSec: 16, subtitles: [...] }
     ======================================================================== */

  chapters: [

    /* ======================================================================
       CHAPTER 1: THE WOMAN (Suggested total: ~45 seconds)
       Her personality, identity, presence, the woman behind the ministry.
       ====================================================================== */
    {
      id: 1,
      numberLabel: "CHAPTER 1",
      title: "The Woman",
      // DEMO: Sample chapter epigraph — edit freely
      epigraph: "Before the title, before the pulpit — the unmistakable warmth of her presence.",
      epigraphIsDemo: true,
      type: "standard",
      menuThumb: "assets/photos/ch1-01.jpg",
      scenes: [
        {
          // Drop ch1-01.jpg into assets/photos/ to replace this demo frame automatically
          photo: "assets/photos/ch1-01.jpg",
          focalPoint: "50% 30%",
          // fit: "auto" (default) automatically fills the screen when the photo & screen
          // shapes are close, or shows the whole photo over a soft blurred backdrop if
          // a portrait photo is viewed on a wide laptop screen. Set to "cover" or "contain" to override.
          fit: "auto",
          // captionPosition: "auto" (default) places the compact caption card in the bottom zone
          // (or top zone if focalPoint Y > 55%, or inside the blurred space when contained).
          // Options: "auto" | "bottom" | "top" | "side" | "hidden"
          captionPosition: "auto",
          // faces: Optional group-photo hint ("upper" | "lower" | "both") to keep cards off faces
          faces: "upper",
          kenBurns: "zoom-in",
          durationSec: 11,
          isDemoText: true, // DEMO: Set to false when you write your real subtitles
          subtitles: [
            "Every life leaves a signature upon the rooms it enters.",
            "Hers has always been written in grace, quiet strength, and unmistakable warmth."
          ]
        },
        {
          photo: "assets/photos/ch1-02.jpg",
          focalPoint: "50% 25%",
          kenBurns: "pan-right",
          durationSec: 11,
          isDemoText: true, // DEMO: Sample subtitle lines
          subtitles: [
            "Behind the title and the calling stands a woman of deep conviction —",
            "gentle in spirit, radiant in laughter, steadfast in every season."
          ]
        },
        {
          photo: "assets/photos/ch1-03.jpg",
          focalPoint: "50% 30%",
          kenBurns: "zoom-out",
          durationSec: 11,
          isDemoText: true, // DEMO: Sample subtitle lines
          subtitles: [
            "She carries wisdom without noise, and dignity without distance.",
            "To know her is to feel immediately welcomed and genuinely seen."
          ]
        },
        {
          photo: "assets/photos/ch1-04.jpg",
          focalPoint: "50% 35%",
          kenBurns: "pan-left",
          durationSec: 12,
          isDemoText: true, // DEMO: Replace with her own words or favourite scripture
          subtitles: [
            "“Strength and honour are her clothing; and she shall rejoice in time to come.”",
            "— Proverbs 31:25 · A life anchored in faith"
          ]
        }
      ]
    },

    /* ======================================================================
       CHAPTER 2: A HEART OF WORSHIP (Suggested total: ~80 seconds)
       The emotional centre of the film. Plays assets/audio/mam-singing.mp3
       while the ambient piano fades down gently and restores at the end.
       ====================================================================== */
    {
      id: 2,
      numberLabel: "CHAPTER 2",
      title: "A Heart of Worship",
      // DEMO: Sample chapter epigraph
      epigraph: "Where words end, her song begins — a life poured out in devotion.",
      epigraphIsDemo: true,
      type: "worship",
      menuThumb: "assets/photos/ch2-01.jpg",
      recordingTitle: "Mam's Worship Recording",
      recordingPlaceholderNote: "Her recording goes here · Place assets/audio/mam-singing.mp3 to hear her voice while the piano gently ducks underneath.",
      scenes: [
        {
          photo: "assets/photos/ch2-01.jpg",
          focalPoint: "50% 28%",
          kenBurns: "zoom-in",
          durationSec: 20,
          isDemoText: true, // DEMO: Sample worship tribute lines
          subtitles: [
            "There are songs that are merely sung, and songs that are lived.",
            "For Mam, worship has never been a performance — it is the air she breathes."
          ]
        },
        {
          photo: "assets/photos/ch2-02.jpg",
          focalPoint: "50% 30%",
          kenBurns: "pan-left",
          durationSec: 20,
          isDemoText: true, // DEMO: Sample worship tribute lines
          subtitles: [
            "In quiet mornings of prayer and before gathered congregations alike,",
            "her voice has always pointed beyond herself toward heaven."
          ]
        },
        {
          photo: "assets/photos/ch2-03.jpg",
          focalPoint: "50% 25%",
          kenBurns: "zoom-out",
          durationSec: 20,
          isDemoText: true, // DEMO: Sample worship tribute lines
          subtitles: [
            "Listen closely to the devotion in every note —",
            "the sound of a heart consecrated through every chapter of life."
          ]
        },
        {
          photo: "assets/photos/ch2-04.jpg",
          focalPoint: "50% 30%",
          kenBurns: "pan-right",
          durationSec: 20,
          isDemoText: true, // DEMO: Sample worship tribute lines
          subtitles: [
            "A melody of gratitude that continues to echo",
            "in every life drawn closer to God through her song."
          ]
        }
      ]
    },

    /* ======================================================================
       CHAPTER 3: A MOTHER'S HEART (Suggested total: ~45 seconds)
       FEWER photos held LONGER. Stillness over variety.
       ====================================================================== */
    {
      id: 3,
      numberLabel: "CHAPTER 3",
      title: "A Mother's Heart",
      // DEMO: Sample chapter epigraph
      epigraph: "Stillness, devotion, and a love that anchors every room like home.",
      epigraphIsDemo: true,
      type: "standard",
      menuThumb: "assets/photos/ch3-01.jpg",
      scenes: [
        {
          // Held longer (15 seconds) for stillness and emotional weight
          photo: "assets/photos/ch3-01.jpg",
          focalPoint: "50% 30%",
          kenBurns: "zoom-in",
          durationSec: 15,
          isDemoText: true, // DEMO: Generic tribute to motherhood — personalize as desired
          subtitles: [
            "Of all the callings she carries with grace,",
            "none is held closer or more tenderly than motherhood."
          ]
        },
        {
          photo: "assets/photos/ch3-02.jpg",
          focalPoint: "50% 28%",
          kenBurns: "zoom-out",
          durationSec: 15,
          isDemoText: true, // DEMO: Generic tribute to motherhood
          subtitles: [
            "A mother's love is measured in quiet prayers whispered at dawn,",
            "in unwavering belief, and in arms that always feel like home."
          ]
        },
        {
          photo: "assets/photos/ch3-03.jpg",
          focalPoint: "50% 32%",
          kenBurns: "pan-right",
          durationSec: 15,
          isDemoText: true, // DEMO: Generic tribute to motherhood
          subtitles: [
            "A bond built on laughter, wisdom, and fierce devotion —",
            "a shelter through every season of growing and becoming."
          ]
        }
      ]
    },

    /* ======================================================================
       CHAPTER 4: A LIFE THAT TOUCHES LIVES (Photos, Quotes & Ministry Videos)
       Her ministry, influence and service, shown through real quotes and
       ministry video clips (`type: "video"`). You can add `type: "video"`
       scenes to Chapter 4 or any other chapter!
       ====================================================================== */
    {
      id: 4,
      numberLabel: "CHAPTER 4",
      title: "A Life That Touches Lives",
      // DEMO: Sample chapter epigraph
      epigraph: "The truest measure of ministry is written in the hearts of others.",
      epigraphIsDemo: true,
      type: "quotes",
      menuThumb: "assets/photos/ch4-01.jpg",
      scenes: [
        {
          photo: "assets/photos/ch4-01.jpg",
          focalPoint: "50% 30%",
          kenBurns: "zoom-in",
          durationSec: 10,
          isDemoText: true, // DEMO: Sample Quote 1 — replace with real words & name
          quote: {
            text: "Her counsel and prayers carried light into a season when we needed hope most. She leads with both truth and extraordinary compassion.",
            attribution: "Community Member One"
          },
          subtitles: [
            "Spoken by those whose paths have been brightened by her faithfulness."
          ]
        },
        {
          // MINISTRY VIDEO SCENE EXAMPLE (type: "video")
          // Drop assets/videos/ministry/ministry-01.mp4 to play this video automatically.
          // While the file is missing, an elegant "DEMO VIDEO · replace with ministry-01.mp4"
          // frame appears for `durationSec` seconds and tests the piano volume ducking.
          type: "video",
          file: "assets/videos/ministry/ministry-01.mp4",
          poster: "assets/videos/posters/ministry-01-poster.jpg", // Optional poster image (.jpg)
          caption: "Thank you for your influence on women's ministry", // Gold caption that fades in
          focalPoint: "50% 30%",   // Keeps subjects framed properly
          fit: "auto",             // "auto" (default: smart video fit), "cover", or "contain"
          startTime: 0,            // Start playing at 0 seconds into the video clip
          volume: 0.92,            // Video audio volume (piano ducks automatically while playing)
          durationSec: 14,         // Fallback duration for demo mode (real video plays to its natural end)
          isDemoText: true,        // DEMO: Set to false once you customize caption/subtitles
          subtitles: [
            "A moment from ministry — serving with joy, conviction, and grace."
          ]
        },
        {
          photo: "assets/photos/ch4-02.jpg",
          focalPoint: "50% 25%",
          kenBurns: "pan-left",
          durationSec: 10,
          isDemoText: true, // DEMO: Sample Quote 2 — replace with real words & name
          quote: {
            text: "When she welcomes you, you never feel like a face in a crowd. She remembers your story and lifts it up with genuine love.",
            attribution: false 
          },
          subtitles: [
            "A shepherd's care, offered quietly and consistently."
          ]
        },
        {
          photo: "assets/photos/ch4-03.jpg",
          focalPoint: "50% 30%",
          kenBurns: "zoom-out",
          durationSec: 10,
          isDemoText: true, // DEMO: Sample Quote 3 — replace with real words & name
          quote: {
            text: "Watching her worship and serve taught us what steadfast grace looks like in everyday life.",
            attribution: false 
          },
          subtitles: [
            "An example that speaks even louder than words."
          ]
        },
        {
          photo: "assets/photos/ch4-04.jpg",
          focalPoint: "50% 35%",
          kenBurns: "pan-right",
          durationSec: 10,
          isDemoText: true, // DEMO: Sample Quote 4 — replace with real words & name
          quote: {
            text: "Every conversation with Mam leaves you encouraged, grounded, and reminded of God's goodness.",
            attribution: false
          },
          subtitles: [
            "Lives uplifted, one sincere moment at a time."
          ]
        }
      ]
    },

    /* ======================================================================
       CHAPTER 5: THE BEAUTY OF HER JOURNEY (Suggested total: ~35 seconds)
       A simple "then to now" timeline by year or season with gold labels.
       Visually distinct layout from Chapter 1.
       ====================================================================== */
    {
      id: 5,
      numberLabel: "CHAPTER 5",
      title: "The Beauty of Her Journey",
      // DEMO: Sample chapter epigraph
      epigraph: "From early beginnings to this radiant milestone — every season crowned with grace.",
      epigraphIsDemo: true,
      type: "timeline",
      menuThumb: "assets/photos/ch5-01.jpg",
      scenes: [
        {
          photo: "assets/photos/ch5-01.jpg",
          focalPoint: "50% 30%",
          kenBurns: "zoom-in",
          durationSec: 7,
          isDemoText: true, // DEMO: Sample Timeline Entry 1 — edit year/season & caption
          timeline: {
            yearLabel: "EARLY FOUNDATIONS",
            milestoneTitle: "Roots of Faith & Promise",
            caption: "The early chapters where kindness, curiosity, and a deep love for music first took root."
          }
        },
        {
          photo: "assets/photos/ch5-02.jpg",
          focalPoint: "50% 28%",
          kenBurns: "pan-right",
          durationSec: 7,
          isDemoText: true, // DEMO: Sample Timeline Entry 2 — edit year/season & caption
          timeline: {
            yearLabel: "A GROWING CALLING",
            milestoneTitle: "Stepping Into Purpose",
            caption: "Years of learning, dedication, and answering the call to lift others through song and service."
          }
        },
        {
          photo: "assets/photos/ch5-03.jpg",
          focalPoint: "50% 30%",
          kenBurns: "zoom-out",
          durationSec: 7,
          isDemoText: true, // DEMO: Sample Timeline Entry 3 — edit year/season & caption
          timeline: {
            yearLabel: "FAMILY & HOME",
            milestoneTitle: "Building a Sanctuary of Love",
            caption: "Cherished years of motherhood, hospitality, and creating a home filled with peace and laughter."
          }
        },
        {
          photo: "assets/photos/ch5-04.jpg",
          focalPoint: "50% 25%",
          kenBurns: "pan-left",
          durationSec: 7,
          isDemoText: true, // DEMO: Sample Timeline Entry 4 — edit year/season & caption
          timeline: {
            yearLabel: "SEASONS OF MINISTRY",
            milestoneTitle: "Walking Beside Many",
            caption: "Standing faithfully in leadership, prayer, and worship through every shared milestone."
          }
        },
        {
          photo: "assets/photos/ch5-05.jpg",
          focalPoint: "50% 30%",
          kenBurns: "zoom-in",
          durationSec: 7,
          isDemoText: true, // DEMO: Sample Timeline Entry 5 — edit year/season & caption
          timeline: {
            yearLabel: "TODAY · A NEW CHAPTER",
            milestoneTitle: "Radiant in Grace",
            caption: "Celebrating the beauty of who she is today — and all the promise that still lies ahead."
          }
        }
      ]
    },

    /* ======================================================================
       CHAPTER 6: VOICES OF LOVE (Birthday Wish Videos)
       Placed right before "Letters to Mam".
       Plays the featured entries from `wishes` above (up to maxFeaturedWishesInFilm)
       one at a time with the sender's name and relationship in champagne gold.
       Ambient piano ducks during each clip and returns afterwards.
       ====================================================================== */
    {
      id: 6,
      numberLabel: "CHAPTER 6",
      title: "Voices of Love",
      // DEMO: Sample chapter epigraph
      epigraph: "Faces and voices gathered from near and far to celebrate your day.",
      epigraphIsDemo: true,
      type: "wishes",
      menuThumb: "assets/videos/posters/wish-01-poster.jpg"
    },

    /* ======================================================================
       CHAPTER 7: LETTERS TO MAM (9 Sample Letters — Add or remove freely)
       The written finale. One letter at a time in a compact, crystal-clear
       glassmorphism card over full-screen photographs so faces in the background
       remain bright and recognisable.
       - cardPosition: "auto" (default) | "bottom" | "top"
           In "auto", reads backgroundFocalPoint: if vertical focal point is 55%
           or lower (people low in frame), places the card at the TOP zone;
           otherwise places it at the BOTTOM zone. Never in the middle.
       - faces: Optional per-letter hint for group photos:
           "upper" (forces card to bottom), "lower" (forces card to top), or
           "both" (uses the smallest compact card size in the lowest-contrast zone).
       - Tap any empty area of the photo to toggle the card off/on and view
         the full photograph unhindered.
       ====================================================================== */
    {
      id: 7,
      numberLabel: "CHAPTER 7",
      title: "Letters to Mam",
      // DEMO: Sample chapter epigraph
      epigraph: "Words written from the heart, gathered for this day.",
      epigraphIsDemo: true,
      type: "letters",
      menuThumb: "assets/photos/ch1-01.jpg",
      backgroundPhoto: "assets/photos/ch1-01.jpg",
      minDurationSec: 6,     // Minimum seconds a letter stays on screen in Play Film mode
      secPerWord: 0.35,      // Seconds added per word in Play Film mode (editable)
      letters: [
        {
          // DEMO LETTER 1 — replace with real sender details and message
          isDemoText: true,                                   // DEMO: Set to false once edited
          senderName: "Tabz",                                 // Sender's name in champagne gold
          relationship: "Personal Tribute",                   // Small Manrope label beside/beneath name
          message: "Happiest Birthday, Mummy T! ❤️❤️ I love you and celebrate you enormously. You are such a blessing to me, and need I mention, to this generation! Well, I am here, behind you, as Gods creation, waiting for your full manifestation. My gift from God, what a blessing! Happy Happy Happy Birthday, Mum Tehilla! 😘🥰.",
          senderPhoto: "assets/photos/letters/friend-01.jpg", // Optional small inline circular sender photo (36-44px; hidden if omitted)
          senderFocalPoint: "50% 30%",                        // Optional focal point for sender photo
          backgroundPhoto: "assets/photos/letters/friend-01.jpg", // Background photo (rotates through Mam's photos if omitted)
          backgroundFocalPoint: "50% 25%",                    // Focal point of background photo ("left% top%")
          faces: "upper",                                     // Optional group photo hint: "upper" | "lower" | "both"
          cardPosition: "auto",                               // "auto" (default: reads focal point/faces), "bottom", or "top"
          duration: null                                      // Optional fixed duration in seconds (leave null for automatic word-count timing)
        },
        {
          // DEMO LETTER 2 — replace with real sender details and message
          isDemoText: true,
          senderName: "Chris J.",
          relationship: "Personal Tribute",
          message: "Mom, your such a warm mother. I love the love I experience from you. The love that is represented by laying down for another. Thank you for the extra mile you went to gift me. I see your sacrifices, I see your labours and I just wanna say I love you mom, deeply and dearly. Happiest birthday mom.",
          senderPhoto: "assets/photos/letters/friend-02.jpg",
          senderFocalPoint: "50% 30%",
          backgroundPhoto: "assets/photos/letters/friend-02.jpg",
          backgroundFocalPoint: "50% 25%",
          faces: "upper",
          cardPosition: "auto",
          duration: null
        },
        {
          // DEMO LETTER 3 — replace with real sender details and message
          isDemoText: true,
          senderName: "Melvin",
          relationship: "Personal Tribute",
          message: "Happy birthday mummy ! You are sweet, loving and you gracefully carry all your children according to their differentiated needs! What a rare Grace! Achomin mama.",
          senderPhoto: "assets/photos/letters/friend-03.jpg",
          senderFocalPoint: "50% 30%",
          backgroundPhoto: "assets/photos/letters/friend-03.jpg",
          backgroundFocalPoint: "50% 30%",
          faces: "upper",
          cardPosition: "auto",
          duration: null
        },
        {
          // DEMO LETTER 4 — replace with real sender details and message
          isDemoText: true,
          senderName: "Minister Seijah",
          relationship: "Personal Tribute",
          message: "You’re so beautiful mama! I love you so much! Happy birthday to you.",
          senderPhoto: "assets/photos/letters/friend-04.jpg",
          senderFocalPoint: "50% 30%",
          backgroundPhoto: "assets/photos/letters/friend-04.jpg",
          backgroundFocalPoint: "50% 28%",
          faces: "upper",
          cardPosition: "auto",
          duration: null
        },
        {
          // DEMO LETTER 5 — replace with real sender details and message
          isDemoText: true,
          senderName: "Festus😎",
          relationship: "Personal Tribute",
          message: "Through every season, your laughter and quiet confidence have brightened our paths. Wishing you a year ahead overflowing with peace, good health, and fresh inspiration.",
          senderPhoto: "assets/photos/letters/friend-05.jpg",
          senderFocalPoint: "50% 30%",
          backgroundPhoto: "assets/photos/letters/friend-05.jpg",
          backgroundFocalPoint: "50% 30%",
          faces: "upper",
          cardPosition: "auto",
          duration: null
        },
        {
          // DEMO LETTER 6 — replace with real sender details and message
          isDemoText: true,
          senderName: "Grace",
          relationship: "Personal Tribute",
          message: "Happy birthday to my Beautiful Momma. Thank you for being a loving, nurturing and empowering Mother. May God replenish you and may your life overflow with the love that you freely pour unto others.",
          senderPhoto: "assets/photos/letters/friend-06.jpg",
          senderFocalPoint: "50% 30%",
          backgroundPhoto: "assets/photos/letters/friend-06.jpg",
          backgroundFocalPoint: "50% 30%",
          faces: "upper",
          cardPosition: "auto",
          duration: null
        },
        {
          // DEMO LETTER 7 — replace with real sender details and message
          isDemoText: true,
          senderName: "Marie Mutei",
          relationship: "Personal Tribute",
          message: 
          `Today I celebrate the woman God used to change my life. You are not just my spiritual parent, you are a mother, a teacher, a prayer warrior, and a true gift from God 
          Through your ministry, many lives have been transformed. People who were broken have been healed. People who were lost have found purpose. Families that were falling apart have stood up again Children have found direction. I am one of them 
          Thank you for your love, your sacrifices, your late-night prayers, your corrections, and your encouragement. You carry many children in your heart, and you love us all like your own.
          You are loved. You are honored. You are celebrated.
          Happy Birthday, Mum ! I love you so much.`,

      
          senderPhoto: "assets/photos/letters/friend-07.jpg",
          senderFocalPoint: "50% 30%",
          backgroundPhoto: "assets/photos/letters/friend-07.jpg",
          backgroundFocalPoint: "50% 30%",
          faces: "upper",
          cardPosition: "auto",
          duration: null 
        },
        {
          // DEMO LETTER 8 — replace with real sender details and message
          isDemoText: true,
          senderName: "Jeff.M",
          relationship: "Personal Tribute",
          message: "happy birthday mum I pray that your  influence continues to reach and impact more lives !!",
          senderPhoto: "assets/photos/letters/friend-08.jpg",
          senderFocalPoint: "50% 30%",
          backgroundPhoto: "assets/photos/letters/friend-08.jpg",
          backgroundFocalPoint: "50% 30%",
          faces: "upper",
          cardPosition: "auto",
          duration: null
        },
        {
          // DEMO LETTER 9 — replace with real sender details and message
          isDemoText: true,
          senderName: "Family & Friends",
          relationship: "Birthday Blessing",
          message: "Looking back across the journey, what shines brightest is your faithfulness — in family, in friendship, and in devotion to God. Happy, happy birthday, Mam!",
          senderPhoto: "assets/photos/letters/friend-09.jpg",
          senderFocalPoint: "50% 30%",
          backgroundPhoto: "assets/photos/letters/friend-09.jpg",
          backgroundFocalPoint: "50% 30%",
          faces: "upper",
          cardPosition: "auto",
          duration: null
        }
      ]
    }

  ]
};
