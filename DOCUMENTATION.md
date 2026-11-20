# MAMFLIX — Complete Step-by-Step Owner's Guide

Welcome to **MAMFLIX: The Story of Her** — a custom birthday documentary website dedicated to **Pastor Marita Mbae ("Mam")**.

This guide is written in plain, friendly language for a complete beginner. **You do not need any coding experience, and there is no complicated database or login system.** Nobody except you can add or change anything on the site. You will only ever do two things:
1. Drop your photo, video, and audio files into the `assets/` folders.
2. Edit simple sentences and filenames inside one file: `js/content.js`.

---

## 1. What the Project Is & Folder Map

Instead of exporting one giant video file, this website plays like an interactive Netflix documentary in real time. It moves gently through **7 Chapters** (photos, subtitles, her worship singing, quotes, ministry video moments, a "Then to Now" timeline, *Voices of Love* birthday wish videos, and 9 personal letters in compact, crystal-clear glassmorphism cards over photos of Mam and her loved ones) before rolling end credits. It also includes a **Wall of Wishes** under *Explore Her Story* so Mam can watch every single video wish sent for her.

Here is every file and folder in your project (one line per item):

```text
mamflix/
├── index.html               # The webpage frame — open this in your browser to watch the film.
├── css/
│   └── style.css            # The visual design (colors, fonts, gentle animations). You never edit this.
├── js/
│   ├── content.js           # YOUR EDITING FILE — every subtitle, video clip, wish, letter, and filename lives here.
│   └── main.js              # The film projector engine — runs the timeline, videos, and audio automatically.
├── assets/
│   ├── photos/              # Drop Mam's real JPEG photographs here (e.g. hero.jpg, ch1-01.jpg).
│   │   └── letters/         # Photos for Chapter 7 letters (e.g. friend-01.jpg).
│   ├── audio/               # Drop your background piano (piano.mp3) and Mam's singing (mam-singing.mp3) here.
│   ├── videos/
│   │   ├── ministry/        # Drop short ministry video clips here (e.g. ministry-01.mp4).
│   │   ├── wishes/          # Drop birthday wish videos from family/friends here (e.g. wish-01-name.mp4).
│   │   └── posters/         # Optional JPEG thumbnail preview images for videos (e.g. wish-01-poster.jpg).
│   └── fonts/               # Optional folder for offline .woff2 font files; Google Fonts loads them automatically.
├── README.md                # A short welcome card pointing to this guide.
└── DOCUMENTATION.md         # This complete step-by-step guide.
```

---

## 2. How the Screen Is Laid Out (Screen Zones, Caption Cards & Placement)

Because most people will open Mam's documentary from a WhatsApp link on their phones, every scene is strictly divided into **3 Screen Zones** so that **faces are never covered**:

```text
+------------------------------------------+
| TOP ZONE (top ~8%, below phone notch)    |
|  [Mam's worship recording]   [1/9] [DEMO]|  <-- Slim pills; status pills fade out after 4s
+------------------------------------------+
|                                          |
|                                          |
| MIDDLE ZONE (about 60% of the screen)    |
|                                          |
|          100% PURE PHOTO / VIDEO         |  <-- NEVER any cards, boxes, or text here
|      (Faces stay bright & clear)         |
|                                          |
|                                          |
+------------------------------------------+
| BOTTOM ZONE (bottom ~24% + safe area)    |
|  +------------------------------------+  |
|  |  Compact gold-bordered caption or  |  |  <-- Each entry in content.js is one
|  |  clear glass letter card (26% max) |  |      screen; 0.8s clear-photo gap between
|  +------------------------------------+  |
|  [ || ]  ========================        |  <-- Controls auto-hide after 3 seconds
+------------------------------------------+
```

### How the Fancy Compact Caption Card Works:
- Film subtitles, Chapter 4 quotes, Chapter 5 timeline labels, and *Voices of Love* sender cards all share a compact, translucent plum card (`4px` blur, thin champagne-gold border).
- **Shown Exactly As Written:** Captions are **never** cut in the middle of a sentence, clause, or word. Every entry in a scene's `subtitles` array in `js/content.js` is shown whole as **one screen**, one after another, with a **0.5s** fade and a **0.8s** clear-photo gap between screens.
- **Card Fits the Text:** The card grows naturally to fit the text (up to ~5 lines / `34%` of screen height, or `40%` if needed), gently scaling the font size down to `0.9rem` for longer lines so nothing is ever cut off.
- **Automatic Reading Time:** Each screen stays visible for `2.5s + 0.35s` per word (editable via `captionBaseSec` and `captionSecPerWord` in `js/content.js`), and the scene timer extends automatically if needed so no caption is ever cut short. You can also give any line a custom `{ text: "...", duration: 6 }` override.
- **Tap-to-Hide:** Tapping any empty area of the photo or video toggles cards off and on (a tiny hint appears once on the first view). Tapping empty photo/video **never** skips the scene—only Next/Prev buttons, swiping, or keyboard arrows change scenes.

**Copy-and-paste example of a scene with three caption lines (`js/content.js`):**
```js
{
  photo: "assets/photos/ch1-02.jpg",
  focalPoint: "50% 25%",
  captionPosition: "auto",
  faces: "upper",
  kenBurns: "pan-right",
  durationSec: 12,
  isDemoText: false,
  subtitles: [
    "Every room she enters feels warmer the moment she arrives.",
    "Her laughter carries the kind of joy that stays with you for days.",
    { text: "Today we honour a life poured out in love and faithfulness.", duration: 6 }
  ]
}
```

### How to Move a Caption (`captionPosition`, `cardPosition` & `faces`)
- **`captionPosition`** (on photo/video scenes in `js/content.js`):
  - `"auto"` *(default)*: If the scene's `focalPoint` is in the upper 55% (e.g. `"50% 30%"`), the card sits in the **bottom** zone. If the focal point is lower than 55% (people low in the frame), it sits in the **top** zone. On wide screens with at least `220px` of blurred side space beside a portrait photo, it sits neatly in that **side** space!
  - `"bottom"` / `"top"` / `"side"` / `"hidden"`: Force a specific position or hide the caption on a specific scene.
- **`cardPosition`** (on letters in Chapter 7): `"auto"` *(default)*, `"bottom"`, or `"top"`.
- **`faces`** (optional hint for group photos):
  - `"upper"` → Forces the card to the **bottom** zone.
  - `"lower"` → Forces the card to the **top** zone.
  - `"both"` → Uses the smallest compact card height (`22%` on phones) in the least intrusive zone.

---

## 3. What "Demo Mode" Is (And How It Works)

Right now, the site is in **Demo Mode** (`demoMode: "auto"`). That means you can click **Begin → Play Film** today and preview the entire documentary from start to finish even if some photo, video, or MP3 files are still missing.

- **Missing files show an abstract plum-and-gold demo frame** (`DEMO PHOTO · replace with ch4-01.jpg`, etc.). As soon as you drop the real file into the matching folder, the real file takes over automatically!
- **Note on `.jpg` vs `.jpeg`:** Your project currently has several photos saved with `.jpeg` extensions (e.g. `ch1-01.jpeg`, `friend-01.jpeg`). The site's loader automatically checks both `.jpg` and `.jpeg`, so those work seamlessly! For consistency on GitHub Pages, naming new photo files lowercase `.jpg` is recommended.
- **Turning Demo Mode off before sending:** At the top of `js/content.js`, change `demoMode: "auto"` to `demoMode: "off"`. All `DEMO` pills and placeholder cards will disappear cleanly.

---

## 4. Getting the Sharpest Photos & How Smart Photo Fit Works

### Step 1: Always Use Original Photos
- **Never use screenshots** or standard WhatsApp chat photos (WhatsApp compresses standard chat photos heavily).
- Ask family and friends to send photos on WhatsApp as a **Document** (**`+` or Paperclip → Document → Choose from Gallery/Photos**), or tap the **`HD`** button, or upload to **Google Drive / iCloud / AirDrop**.

### Step 2: Recommended Size, Quality & Free Tools to Resize
- **Format:** JPEG (`.jpg`)
- **Size:** About **`2400px` on the long edge** (**`2560px` on the long edge** for `hero.jpg`).
- **Quality:** **`82%` to `85%`** (ideally **`400 KB` to `700 KB` each**).
- **Free tools:** [Squoosh.app](https://squoosh.app) (MozJPEG at 82–85), [Photopea.com](https://www.photopea.com), or built-in Windows Photos / Mac Preview.

### Step 3: How Smart Photo Fit Works (`fit: "auto" | "cover" | "contain"`)
- **Close aspect ratios (under ~25% difference):** Uses `cover` with your `focalPoint` so the photo fills 100% of the screen.
- **Very different aspect ratios (e.g. a portrait photo on a wide laptop):** Uses `contain` to show the **entire uncropped photo** centered over a softly blurred, darkened copy of the same photo behind it.

---

## 5. Chapter 7: Letters to Mam (Smaller, Clearer Glass Cards)

Chapter 7 displays personal birthday letters over full-screen background photographs (such as photos of Mam with each sender).

1. **Small & Clear (`26%` max height on phones, `5px` blur):** The card shows **3 to 4 lines** with compact padding (`12–14px`), a light plum tint (`rgba(30, 12, 40, 0.28)`), and a subtle `5px` blur so the people in the background photo are immediately recognisable.
2. **"Read more" (Pauses Auto-Advance):** Longer messages softly fade at the bottom edge with a **`Read more`** button. Tapping **`Read more`** expands the card up to `45%` of the screen height with smooth internal scrolling and **pauses auto-advance** until you tap **`Show less`** or **`Next →`**.
3. **1-Line Sender Header:** Sender name (champagne gold) and relationship sit on one compact line. If you provide a separate circular `senderPhoto` (different from `backgroundPhoto`), a small `38px` circular avatar sits inline to the left of the name. If there is no separate sender photo, nothing extra is shown—because the background photo already shows the sender.
4. **Tap-to-Hide:** Tap any empty part of the photo outside the card to hide or show the card.

---

## 6. How Smart Video Fit Works (Ministry Clips, Voices of Love & Wall of Wishes)

Every video in `MAMFLIX`—whether in Chapter 4 (*Ministry Videos*), Chapter 6 (*Voices of Love*), or the full-screen *Wall of Wishes* player—uses **Smart Video Fit**:

1. **Why bars or a blurred background appear around some videos:**
   - When a video's shape matches the viewer's screen (e.g. a vertical phone video on a phone), it fills the entire screen (`object-fit: cover`) using your `focalPoint` (default `"50% 30%"` so heads stay in frame).
   - When a video has a different shape (e.g. a horizontal video on a vertical phone, or a vertical video on a laptop), cropping it to fill the screen would cut off the speaker's face or shoulders. Instead, Smart Video Fit shows the **entire uncropped video** (`object-fit: contain`) centered over a darkened plum + blurred poster backdrop (never running a second heavy video copy). On phones, the sender's name and relationship sit in that empty blurred space below the video.
2. **How to override (`fit` and `focalPoint`):**
   - Set `fit: "cover"` on a video in `js/content.js` to always fill the screen edge-to-edge, or `fit: "contain"` to always show the entire video rectangle. Adjust `focalPoint: "50% 25%"` to shift framing higher or lower.
3. **Important Note About Videos:**
   - Any buttons, text, or graphics **drawn inside a video file** (for example, exported inside a screen recording) are just flat pixels in the video and **can never be clicked**. Only the website's own buttons (`Read more`, `← Prev`, `Next →`, `Close`, etc.) are interactive!

### Filming Tip to Send to Friends & Family (Copy & Paste into WhatsApp!)
> *"Please record your birthday wish holding your phone **vertically (portrait)**, hold steady at eye level with **your face in the middle of the frame**, face good light in a quiet spot, and keep it around **30 to 45 seconds**!"*

---

## 7. How to Compress & Add Ministry Clips and Birthday Wish Videos

### Step 1: Compress every video in HandBrake (Free at [https://handbrake.fr](https://handbrake.fr))
1. Drag the video into HandBrake.
2. Choose the **Fast 720p30** (or **Web → Creator 720p30**) preset.
3. On the **Summary** tab: set **Format** to **MP4** and check **"Web Optimized"**.
4. On the **Video** tab: make sure **Video Encoder** is **H.264 (x264)** *(never HEVC/H.265)*.
5. Click **Start Encode**. Aim for **5 MB to 10 MB** per clip (never over 15 MB).

### Step 2: Place the files and update `js/content.js`
- **Ministry Clips:** Place in `assets/videos/ministry/ministry-01.mp4` and list in Chapter 4 with `type: "video"`.
- **Birthday Wishes:** Place in `assets/videos/wishes/wish-01-name.mp4` and list in `wishes: [ ... ]` in `js/content.js`. Set `featured: true` to play in Chapter 6 (*Voices of Love*) AND show on the 2-column *Wall of Wishes*, or `featured: false` to show on the *Wall of Wishes* only.

---

## 8. Troubleshooting

- **"A caption covers a face":**
  In `js/content.js`, set `captionPosition: "top"` (or `cardPosition: "top"` for a letter), or add `faces: "lower"` / `faces: "both"`. Remember viewers can also tap any empty area of the photo to toggle cards off and on.
- **"The text is hard to read":**
  Both the caption card (`rgba(30, 12, 40, 0.38)` with `4px` blur) and the letter card (`rgba(30, 12, 40, 0.28)` with `5px` blur) include a dark text-shadow and a `55–60%` plum fallback for devices without backdrop blur. If a specific photo is extremely bright, adjust `focalPoint` or `cardPosition` so the card sits over a calmer area.
- **"A caption is cut or broken":**
  Check the text in `js/content.js` and the scene's `subtitles` array. Each string in `subtitles: [ ... ]` is shown as its own whole screen, so make sure a sentence isn't accidentally broken across two array items or cut off inside `js/content.js` itself.
- **"The card is too big":**
  Letter cards are capped at `26%` of phone screen height (`22%` when `faces: "both"` is set) and expand to `45%` only when **"Read more"** is tapped. Caption cards grow only as needed to fit the text without cutting off any sentence.
- **"A button inside a card doesn't respond":**
  All interactive cards and buttons (`Read more`, `Prev`, `Next`, `Skip`, `Close`, `Replay`) sit above decorative overlays with `min 44×44px` touch targets, and hidden/auto-hidden controls use `visibility: hidden` so they never block taps. If a button still appears unresponsive on a video, make sure it isn't a graphic baked into the video pixels itself, and do a hard refresh (**Ctrl + Shift + R** / clear mobile browser cache) so you are running the latest `style.css` and `main.js`.
- **"My video has bars (or blurred space)":**
  This is **Smart Video Fit** showing the entire uncropped video without cutting off anyone's face when the video shape differs from the screen shape. Set `fit: "cover"` on that video in `js/content.js` if you want it to fill the screen instead.
- **"My video is cropped":**
  Set `fit: "contain"` on that video in `js/content.js`, or adjust `focalPoint: "50% 20%"` to keep heads in frame.
- **"My video won't play on iPhone":**
  Check that the file is compressed in **HandBrake** as **MP4 (H.264 / 720p / Web Optimized)** under 15 MB, and check that the lowercase filename in `assets/videos/` matches `js/content.js` exactly.
- **"Controls disappeared":**
  Playback controls automatically hide after **3 seconds** so Mam's photos and videos stay clean. Tap anywhere on the screen, move the mouse, or press any key to bring them right back! (Controls stay visible automatically while paused or while a letter is expanded with **Read more**).

---

## 9. "Before I Send It" Final Checklist

Go through this checklist right before you share the link with Mam:

- [ ] **`demoMode: "off"`** is set at the top of `js/content.js`, and **all `DEMO` badges and demo placeholders are gone**.
- [ ] **Tap `Read more`, `← Prev`, `Next →`, `Skip`, `Close`, and `Replay` on BOTH a real iPhone and a real Android phone** — test during a playing video AND during a letter, including after controls fade and reappear.
- [ ] **Every video checked on both a real iPhone and a real Android phone** — starts quickly, plays with sound, and fits without cropped heads (`ministry-01.mp4` compressed from 72 MB down to ~8 MB in HandBrake!).
- [ ] **No card or caption covers a face** across Chapters 1 to 7 on a real phone.
- [ ] **All text is clearly readable** on both bright and dark background photos.
- [ ] **All 9 letters (or your custom list of letters) are proofread and approved by their senders**, with permission for all photos used.
- [ ] **All real photos are in `assets/photos/`** (including `hero.jpg` and Chapter 4 photos `ch4-01.jpg`–`ch4-04.jpg`), exported from original photos at ~`2400px` (`2560px` hero).
- [ ] **Licensed / royalty-free real piano** placed at `assets/audio/piano.mp3` (alongside `assets/audio/mam-singing.mp3`).
- [ ] **Total project folder size checked** (each video under 15 MB, total repository well under 1 GB).
