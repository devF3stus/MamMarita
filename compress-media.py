#!/usr/bin/env python3
"""
MAMFLIX — Safe Media Compression Helper (compress-media.py)
===========================================================
Finds oversized videos, photos, and audio in assets/ and compresses them
in-place (keeping exact filenames and extensions) after backing up each
original to ./originals/ (which is excluded from Git via .gitignore).

Safe to run multiple times: files already under the target sizes are skipped.
"""

import json
import os
import platform
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(ROOT, "assets")
ORIGINALS_DIR = os.path.join(ROOT, "originals")

# Size thresholds (bytes)
VIDEO_MAX_BYTES = 15 * 1024 * 1024       # Skip videos <= 15 MB
VIDEO_TARGET_BYTES = 10 * 1024 * 1024    # Try CRF 28 if CRF 26 output > 10 MB
PHOTO_MAX_BYTES = 1 * 1024 * 1024        # Skip photos <= 1 MB
PHOTO_TARGET_BYTES = 700 * 1024          # Aim for 400-700 KB
AUDIO_PIANO_MAX = 5 * 1024 * 1024        # 5 MB
AUDIO_SINGING_MAX = 6 * 1024 * 1024      # 6 MB

VIDEO_EXTS = {".mp4", ".mov", ".m4v", ".webm", ".avi", ".mkv"}
PHOTO_EXTS = {".jpg", ".jpeg", ".png"}
AUDIO_EXTS = {".mp3", ".wav", ".m4a", ".aac", ".ogg"}


def print_install_help(missing_ffmpeg, missing_pillow):
    system = platform.system().lower()
    print("\n[MISSING TOOLS] Please install the required tool(s) first:\n")
    if missing_ffmpeg:
        print("1. ffmpeg & ffprobe:")
        if "windows" in system:
            print("   Run in PowerShell:  winget install Gyan.FFmpeg")
            print("   Then close and reopen your terminal.")
        elif "darwin" in system:
            print("   Run in Terminal:    brew install ffmpeg")
        else:
            print("   Run in Terminal:    sudo apt update && sudo apt install -y ffmpeg")
    if missing_pillow:
        print("2. Python Pillow (for JPEG photo compression):")
        print("   Run in Terminal:    python -m pip install pillow")
    print()


def check_dependencies():
    has_ffmpeg = shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None
    has_pillow = False
    try:
        from PIL import Image, ImageOps  # noqa: F401
        has_pillow = True
    except ImportError:
        pass
    if not has_ffmpeg or not has_pillow:
        print_install_help(not has_ffmpeg, not has_pillow)
        sys.exit(1)


def fmt_size(num_bytes):
    if num_bytes >= 1024 * 1024:
        return f"{num_bytes / (1024 * 1024):.2f} MB"
    return f"{num_bytes / 1024:.1f} KB"


def backup_original(full_path):
    rel = os.path.relpath(full_path, ROOT)
    backup_path = os.path.join(ORIGINALS_DIR, rel)
    os.makedirs(os.path.dirname(backup_path), exist_ok=True)
    if not os.path.exists(backup_path):
        shutil.copy2(full_path, backup_path)
    return backup_path


def ffprobe_info(path):
    cmd = ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", path]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        return None
    return json.loads(res.stdout)


def compress_video(full_path, rel_path):
    old_size = os.path.getsize(full_path)
    if old_size <= VIDEO_MAX_BYTES:
        return None

    info = ffprobe_info(full_path)
    dur = float(info.get("format", {}).get("duration", 0) or 0) if info else 0
    if dur > 60:
        print(f"  [WARNING] {rel_path} is {dur:.1f}s (> 60s). Consider trimming to 30-45s in a video editor.")

    backup_original(full_path)

    # Scale so the SHORT side is at most 720px, never upscaling, keeping aspect ratio & even dimensions
    vf_scale = "scale='if(lte(iw,ih),min(720,iw),-2)':'if(lte(iw,ih),-2,min(720,ih))'"

    def encode_crf(crf_val, out_file):
        cmd = [
            "ffmpeg", "-y", "-i", full_path,
            "-vf", vf_scale,
            "-c:v", "libx264", "-preset", "slow", "-crf", str(crf_val),
            "-pix_fmt", "yuv420p",
            "-r", "30", "-fps_mode", "cfr",
            "-c:a", "aac", "-b:a", "112k",
            "-movflags", "+faststart",
            out_file
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        return res.returncode == 0

    fd, tmp_out = tempfile.mkstemp(suffix=".mp4", dir=os.path.dirname(full_path))
    os.close(fd)
    try:
        if not encode_crf(26, tmp_out):
            print(f"  [ERROR] ffmpeg failed on {rel_path}")
            return None

        new_size = os.path.getsize(tmp_out)
        if new_size > VIDEO_TARGET_BYTES:
            # Retry once with CRF 28 to bring it under 10 MB
            fd2, tmp_out2 = tempfile.mkstemp(suffix=".mp4", dir=os.path.dirname(full_path))
            os.close(fd2)
            if encode_crf(28, tmp_out2):
                if os.path.getsize(tmp_out2) < new_size:
                    os.replace(tmp_out2, tmp_out)
                    new_size = os.path.getsize(tmp_out)
                else:
                    os.remove(tmp_out2)
            elif os.path.exists(tmp_out2):
                os.remove(tmp_out2)

        shutil.move(tmp_out, full_path)

        if new_size > VIDEO_MAX_BYTES:
            print(f"  [STILL >15MB] {rel_path} is {fmt_size(new_size)}. Options:")
            print("    (a) Trim clip to 30-45s in a video editor")
            print("    (b) Re-encode at CRF 30, 540p short side")
            print("    (c) Host externally (unlisted YouTube / Cloudflare R2) and paste URL in js/content.js")

        return (rel_path, old_size, new_size)
    finally:
        if os.path.exists(tmp_out):
            os.remove(tmp_out)


def compress_photo(full_path, rel_path):
    from PIL import Image, ImageOps

    old_size = os.path.getsize(full_path)
    if old_size <= PHOTO_MAX_BYTES:
        return None

    backup_original(full_path)
    is_hero = os.path.basename(full_path).lower().startswith("hero.")
    max_edge = 2560 if is_hero else 2400

    with Image.open(full_path) as im:
        im = ImageOps.exif_transpose(im)
        if im.mode != "RGB":
            im = im.convert("RGB")
        w, h = im.size
        long_edge = max(w, h)
        if long_edge > max_edge:
            scale = max_edge / float(long_edge)
            new_w = max(1, int(round(w * scale)))
            new_h = max(1, int(round(h * scale)))
            im = im.resize((new_w, new_h), Image.Resampling.LANCZOS)

        fd, tmp_out = tempfile.mkstemp(suffix=".jpg", dir=os.path.dirname(full_path))
        os.close(fd)
        try:
            # Save without EXIF/GPS metadata, progressive JPEG, quality 84 -> 82 if > 700KB
            for q in (84, 82):
                im.save(tmp_out, format="JPEG", quality=q, optimize=True, progressive=True)
                if os.path.getsize(tmp_out) <= PHOTO_TARGET_BYTES:
                    break
            new_size = os.path.getsize(tmp_out)
            shutil.move(tmp_out, full_path)
            return (rel_path, old_size, new_size)
        finally:
            if os.path.exists(tmp_out):
                os.remove(tmp_out)


def compress_audio(full_path, rel_path):
    old_size = os.path.getsize(full_path)
    name_lower = os.path.basename(full_path).lower()
    is_singing = "singing" in name_lower
    max_bytes = AUDIO_SINGING_MAX if is_singing else AUDIO_PIANO_MAX
    if old_size <= max_bytes:
        return None

    backup_original(full_path)
    bitrate = "160k" if is_singing else "128k"
    fd, tmp_out = tempfile.mkstemp(suffix=".mp3", dir=os.path.dirname(full_path))
    os.close(fd)
    try:
        cmd = [
            "ffmpeg", "-y", "-i", full_path,
            "-vn", "-c:a", "libmp3lame", "-b:a", bitrate,
            tmp_out
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            print(f"  [ERROR] ffmpeg audio failed on {rel_path}")
            return None
        new_size = os.path.getsize(tmp_out)
        shutil.move(tmp_out, full_path)
        return (rel_path, old_size, new_size)
    finally:
        if os.path.exists(tmp_out):
            os.remove(tmp_out)


def main():
    check_dependencies()
    if not os.path.exists(ASSETS_DIR):
        print("No assets/ directory found.")
        return

    results = []
    for dirpath, _, filenames in os.walk(ASSETS_DIR):
        for fn in sorted(filenames):
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, ROOT).replace("\\", "/")
            ext = os.path.splitext(fn)[1].lower()
            res = None
            if ext in VIDEO_EXTS:
                res = compress_video(full, rel)
            elif ext in PHOTO_EXTS:
                res = compress_photo(full, rel)
            elif ext in AUDIO_EXTS:
                res = compress_audio(full, rel)
            if res:
                results.append(res)

    print("\n=== MAMFLIX COMPRESSION REPORT ===")
    if not results:
        print("All media files are already within target size limits. Nothing changed.")
        return

    print(f"{'File':<44} {'Old Size':>10} {'New Size':>10} {'Saved':>8}")
    print("-" * 76)
    for rel, old_sz, new_sz in results:
        pct = ((old_sz - new_sz) / old_sz * 100.0) if old_sz else 0.0
        print(f"{rel:<44} {fmt_size(old_sz):>10} {fmt_size(new_sz):>10} {pct:>7.1f}%")
    print(f"\nOriginals safely backed up to: {ORIGINALS_DIR}")


if __name__ == "__main__":
    main()
