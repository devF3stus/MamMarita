# MAMFLIX — The Story of Her

**A Special Birthday Documentary Edition Dedicated to Pastor Marita Mbae ("Mam")**

> *"A beautiful life. A remarkable woman. A song that continues."*

`MAMFLIX` is a custom interactive birthday documentary built entirely with HTML, CSS, and vanilla JavaScript. There is no backend, database, or public upload form: the site itself plays Mam's photographs, ministry video moments, birthday wish videos (*Voices of Love*), compact fancy caption cards, chapter title cards, clear glassmorphism letters (*Letters to Mam*), ambient piano, and her worship singing recording on a timeline.

---

## Quick Start

1. **Preview right now (Demo Mode):** Double-click `index.html` to open it in your browser. Everything plays immediately using your photos/videos (or elegant demo frames where files aren't added yet), live browser-generated ambient piano (until `piano.mp3` is added), 9 letters, and clearly labeled `DEMO` tags.
2. **Add your real photos, videos, music, and letters:** Follow the step-by-step beginner's guide in **[DOCUMENTATION.md](DOCUMENTATION.md)**.

---

## Highlights: Compact Caption Cards, Clear Glass Letters & Smart Video Fit

- **Fancy Compact Caption Cards:** Film subtitles, Chapter 4 quotes, Chapter 5 timeline labels, and *Voices of Love* cards use a compact translucent plum card (`4px` blur, `rgba(30, 12, 40, 0.38)`), thin gold border, and at most **2 lines per screen**. Long captions automatically split into short 2-line screens with a brief `0.8s` clear-photo pause between them, and automatically sit in the **bottom**, **top**, or **side** blurred space (`captionPosition: "auto" | "bottom" | "top" | "side" | "hidden"`) so faces are never covered.
- **Smaller, Clearer Chapter 7 Glass Cards:** Each letter sits in a compact `5px`-blur glass card (`max-height: 26%` of phone screen) showing 3–4 lines with a **"Read more"** button (which pauses auto-advance while expanded), **`cardPosition: "auto"`** + **`faces: "upper" | "lower" | "both"`**, and **tap-to-hide** (tap any empty area of the photo to toggle cards off and on).
- **Smart Video Fit (`100dvh` & `playsinline`):** Every video is compared against the screen shape. Matching shapes fill the screen (`cover` with `focalPoint`); mismatched shapes show the full uncropped video (`contain`) centered over a darkened plum + blurred poster backdrop (no second video copy).

---

## Folder Map

```text
mamflix/
├── index.html               # Main documentary page
├── css/
│   └── style.css            # Deep plum, blush & champagne-gold styling and animations
├── js/
│   ├── content.js           # ALL editable text, photos, videos, wishes, quotes, and letters
│   └── main.js              # Documentary timeline player & audio/video engine (no edits needed)
├── assets/
│   ├── photos/              # Drop hero.jpg, ch1-01.jpg, etc. here
│   │   └── letters/         # Background/sender photos for Chapter 7 letters (e.g. friend-01.jpg)
│   ├── audio/               # Drop piano.mp3 and mam-singing.mp3 here
│   ├── videos/
│   │   ├── ministry/        # Drop ministry moment video clips here (e.g. ministry-01.mp4)
│   │   ├── wishes/          # Drop birthday wish videos here (e.g. wish-01-name.mp4)
│   │   └── posters/         # Optional poster thumbnail images for videos (.jpg)
│   └── fonts/               # Optional folder for offline .woff2 font files
├── README.md                # This quick overview
└── DOCUMENTATION.md         # Complete, beginner-friendly step-by-step owner's guide
```

For full instructions, troubleshooting, and the pre-send checklist, open **[DOCUMENTATION.md](DOCUMENTATION.md)**.
