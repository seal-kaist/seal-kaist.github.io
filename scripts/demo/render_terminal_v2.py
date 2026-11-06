"""Polished ResidualQuant terminal comparison video from the recorded xterm takes.

Inputs are the untouched screen recordings and token-event JSON under
data/residualquant-terminal/b2-b8-16k. Only the chrome around the recordings is
rendered here (Pillow -> raw RGBA frames piped into ffmpeg); the terminal pixels
and the 1x timeline are the originals. Structure: title card -> live comparison
(decode starts simultaneously on both) -> completion states -> result card.
"""
import argparse
import bisect
import json
import math
import subprocess
import sys
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

p = argparse.ArgumentParser(description=__doc__)
p.add_argument("--takes", type=Path, required=True)
p.add_argument("--fonts", type=Path, required=True)
p.add_argument("--output", type=Path, required=True)
p.add_argument("--name", default="residualquant-terminal-v2")
p.add_argument("--fps", type=int, default=24)
p.add_argument("--skip-webm", action="store_true")
p.add_argument("--dump-frame", type=int)
args = p.parse_args()

TAKES, FONTS, OUT = args.takes.resolve(), args.fonts.resolve(), args.output.resolve()
OUT.mkdir(parents=True, exist_ok=True)
BASE = OUT / args.name
FPS = args.fps

rows = {m: json.loads((TAKES / f"{m}.json").read_text()) for m in ("bf16", "residual")}
caps = {m: json.loads((TAKES / f"{m}.capture.json").read_text()) for m in rows}
assert rows["bf16"]["batch"] == 2 and rows["residual"]["batch"] == 8
assert rows["bf16"]["gpu_uuid"] == rows["residual"]["gpu_uuid"]
END = {m: rows[m]["seconds"] for m in rows}
FINAL_RATIO = rows["residual"]["tokens_per_second"] / rows["bf16"]["tokens_per_second"]

# ------------------------------------------------------------- timing ------
TITLE_HOLD = 1.5        # title card fully visible
TITLE_MOVE = 0.7        # wordmark travels to the header while the layout fades in
READY = 2.2             # layout settled; big side labels identify BF16 (left) vs ResidualQuant (right)
PRE = TITLE_HOLD + TITLE_MOVE + READY          # decode starts (video offset origin)
HOLD_AFTER = 1.4        # both finished, hold the live view
OUTRO_MOVE = 0.9        # dim and bring in the result card
OUTRO_HOLD = 3.2
FADE_IN, FADE_OUT = 0.6, 0.8
OUTRO_START = PRE + max(END.values()) + HOLD_AFTER
DURATION = OUTRO_START + OUTRO_MOVE + OUTRO_HOLD
FRAMES = int(round(DURATION * FPS))

# ----------------------------------------------------------------- layout --
W, H = 1920, 1080
SCALE = 0.875
CROP_TOP, CROP_H = 110, 830  # drop the 4 redundant header lines; keep TOTAL/ELAPSED rows
TB, FT = 48, 104
VID_H = round(CROP_H * SCALE)
CARD_Y = 108
CARD_H = TB + VID_H + FT
CARDS = {
    "bf16": dict(x=84, w=round(630 * SCALE), src_w=630, accent=(120, 170, 235),
                 title="vLLM  ·  BF16", batch="Batch 2"),
    "residual": dict(x=720, w=round(1270 * SCALE), src_w=1270, accent=(94, 224, 168),
                     title="ResidualQuant  ·  INT2 residual + INT4 anchor", batch="Batch 8"),
}
for c in CARDS.values():
    c["vid_y"] = CARD_Y + TB
    c["foot_y"] = CARD_Y + TB + VID_H
    c["bottom"] = CARD_Y + CARD_H
TL_Y = CARD_Y + CARD_H + 40
HEADER_XY, HEADER_SIZE = (84, 30), 30

BG = (9, 11, 15)
CARD = (12, 15, 20)
BORDER = (28, 34, 44)
BORDER_HI = (40, 47, 59)
TEXT = (232, 236, 241)
SOFT = (176, 184, 196)
MUTED = (118, 128, 142)
DIM = (62, 70, 82)
TRACK = (24, 29, 37)


@lru_cache(maxsize=None)
def font(name, size):
    return ImageFont.truetype(str(FONTS / name), size)


LIGHT, MEDIUM = "Geist-Light.ttf", "Geist-Medium.ttf"


def ease_out(k):
    return 1 - (1 - k) ** 3


def ease_in_out(k):
    return 3 * k * k - 2 * k * k * k


def clamp01(x):
    return max(0.0, min(1.0, x))


def mix(a, b, k):
    return tuple(int(round(a[i] + (b[i] - a[i]) * k)) for i in range(3))


def tabular(draw, xy, text, fnt, fill, align="left"):
    """Digits on a fixed advance so live numbers don't jitter."""
    x, y = xy
    adv = fnt.getlength("0")
    widths = [adv if ch.isdigit() else fnt.getlength(ch) for ch in text]
    total = sum(widths)
    if align == "right":
        x -= total
    elif align == "center":
        x -= total / 2
    for ch, w in zip(text, widths):
        draw.text((x + (w - fnt.getlength(ch)) / 2, y), ch, font=fnt, fill=fill)
        x += w
    return total


def tracked(draw, xy, text, fnt, fill, tracking=2.0, align="left"):
    """Letter-spaced micro label."""
    x, y = xy
    total = sum(fnt.getlength(ch) for ch in text) + tracking * (len(text) - 1)
    if align == "right":
        x -= total
    elif align == "center":
        x -= total / 2
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += fnt.getlength(ch) + tracking
    return total


def fmt_time(sec):
    cs = int(round(sec * 10))
    return f"{cs // 600:02d}:{cs // 10 % 60:02d}.{cs % 10}"


# ------------------------------------------------------- static chrome -----
def build_static():
    img = Image.new("RGBA", (W, H), BG + (255,))
    # ambient glow behind each card in its accent, very faint
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for c in CARDS.values():
        cx, cy = c["x"] + c["w"] / 2, CARD_Y + CARD_H * 0.55
        rx, ry = c["w"] * 0.62, CARD_H * 0.5
        gd.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=c["accent"] + (26,))
    glow = glow.filter(ImageFilter.GaussianBlur(160))
    img = Image.alpha_composite(img, glow)
    d = ImageDraw.Draw(img)

    # header (wordmark drawn per frame)
    d.text((84, 70), "Real terminal recordings  ·  1× speed  ·  separate runs on the same GPU", font=font(LIGHT, 17), fill=MUTED)
    meta1 = "Ouro-1.4B  ·  NVIDIA RTX 5090  ·  vLLM 0.10.2"
    meta2 = "16,384 input  /  512 output tokens per request"
    d.text((W - 84 - font(LIGHT, 17).getlength(meta1), 36), meta1, font=font(LIGHT, 17), fill=SOFT)
    d.text((W - 84 - font(LIGHT, 17).getlength(meta2), 64), meta2, font=font(LIGHT, 17), fill=MUTED)

    for c in CARDS.values():
        x0, x1 = c["x"], c["x"] + c["w"]
        d.rounded_rectangle([x0, CARD_Y, x1, c["bottom"]], radius=10, fill=CARD, outline=BORDER, width=1)
        d.line([(x0 + 10, CARD_Y), (x1 - 10, CARD_Y)], fill=BORDER_HI)  # inner top highlight
        d.text((x0 + 24, CARD_Y + 15), c["title"], font=font(MEDIUM, 17), fill=TEXT)
        d.line([(x0 + 1, CARD_Y + TB), (x1 - 1, CARD_Y + TB)], fill=BORDER)
        d.line([(x0 + 1, c["foot_y"]), (x1 - 1, c["foot_y"])], fill=BORDER)
        d.rectangle([x0 + 1, c["vid_y"] + 1, x1 - 1, c["foot_y"] - 1], fill=(0, 0, 0, 0))  # video hole
    d.rectangle([84, TL_Y, W - 84, TL_Y + 2], fill=TRACK)
    return img


STATIC = build_static()
PLAIN = Image.new("RGBA", (W, H), BG + (255,))

# ----------------------------------------------------------- live state ---
times = {m: [e["seconds"] for e in rows[m]["events"]] for m in rows}


def state(m, t):
    """Cumulative throughput and tokens at decode time t, interpolated between events."""
    r = rows[m]
    if t <= 0:
        return 0.0, 0, 0.0
    t = min(t, r["seconds"])
    i = max(0, bisect.bisect_right(times[m], t) - 1)
    e0 = r["events"][i]
    e1 = r["events"][min(i + 1, len(r["events"]) - 1)]

    def rate(e):
        return sum(s["tokens"] - 1 for s in e["requests"]) / e["seconds"] if e["seconds"] > 0 else 0.0

    k = (t - e0["seconds"]) / (e1["seconds"] - e0["seconds"]) if e1["seconds"] > e0["seconds"] else 0.0
    rt = rate(e0) + (rate(e1) - rate(e0)) * clamp01(k)
    toks = sum(s["tokens"] for s in e0["requests"])
    return rt, toks, t


smooth = {m: 0.0 for m in rows}


def render(frame):
    T = frame / FPS
    t = T - PRE
    d_live = clamp01((T - TITLE_HOLD) / TITLE_MOVE)          # wordmark travel
    mv = ease_in_out(d_live)
    lay = ease_in_out(clamp01((d_live - 0.45) / 0.55))        # layout fades in during the second half
    img = Image.blend(PLAIN, STATIC, lay) if lay < 1 else STATIC.copy()
    d = ImageDraw.Draw(img)

    # wordmark: centred title -> header position (Light throughout)
    if mv < 1:
        size = round(84 + (HEADER_SIZE - 84) * mv)
        fl = font(LIGHT, size)
        tw = fl.getlength("ResidualQuant")
        x = (W - tw) / 2 + (HEADER_XY[0] - (W - tw) / 2) * mv
        y = (H / 2 - 70) + (HEADER_XY[1] - (H / 2 - 70)) * mv
        d.text((x, y), "ResidualQuant", font=fl, fill=TEXT)
        sub_a = clamp01((T - 0.35) / 0.6) * (1 - clamp01(d_live / 0.4))
        if sub_a > 0:
            sub = "Low-bit KV cache for looped Transformers"
            f2 = font(LIGHT, 24)
            d.text(((W - f2.getlength(sub)) / 2, H / 2 + 48), sub, font=f2, fill=mix(BG, SOFT, sub_a))
    else:
        d.text(HEADER_XY, "ResidualQuant", font=font(LIGHT, HEADER_SIZE), fill=TEXT)

    if lay > 0:
        st = {m: state(m, t) for m in rows}
        for m in rows:
            target = st[m][0]
            smooth[m] += (target - smooth[m]) * (0.3 if t > 0.6 else 0.6)
        disp = {m: smooth[m] for m in rows}
        ratio = disp["residual"] / disp["bf16"] if disp["bf16"] > 1 else None
        pulse = 0.55 + 0.45 * math.sin(T * 2 * math.pi / 1.4)

        for m, c in CARDS.items():
            x0, x1, fy = c["x"], c["x"] + c["w"], c["foot_y"]
            acc = c["accent"]
            rate, toks, el = st[m]
            total = rows[m]["batch"] * rows[m]["output_tokens"]
            done = t >= END[m]
            # status, right aligned in the title bar
            if done:
                status, col = f"Completed  ·  {END[m]:.2f} s", acc
            elif t < 0:
                status, col = c["batch"] + "  ·  ready", MUTED
            else:
                status, col = c["batch"] + "  ·  decoding", SOFT
            f = font(LIGHT, 16)
            sw = f.getlength(status)
            d.text((x1 - 24 - sw, CARD_Y + 15), status, font=f, fill=mix(CARD, col, lay))
            if not done and t >= 0:
                dot = mix(CARD, acc, pulse)
                d.ellipse([x1 - 24 - sw - 18, CARD_Y + 23, x1 - 24 - sw - 11, CARD_Y + 30], fill=dot)
            # progress hairline with soft glow
            if toks:
                px = x0 + 1 + (x1 - x0 - 2) * toks / total
                d.rectangle([x0 + 1, fy - 2, px, fy + 2], fill=mix(CARD, acc, 0.25))
                d.rectangle([x0 + 1, fy - 1, px, fy + 1], fill=acc)
            # footer: throughput
            fx = x0 + 24
            tracked(d, (fx, fy + 16), "THROUGHPUT", font(MEDIUM, 12), mix(CARD, DIM, lay), 2.2)
            nw = tabular(d, (fx, fy + 30), f"{disp[m]:,.1f}", font(LIGHT, 58), mix(CARD, TEXT, lay))
            d.text((fx + nw + 12, fy + 66), "tokens / s", font=font(LIGHT, 18), fill=mix(CARD, MUTED, lay))
            # footer: output tokens
            tx = x1 - 24 if m == "bf16" else x0 + 24 + 440
            al = "right" if m == "bf16" else "left"
            tracked(d, (tx, fy + 16), "OUTPUT TOKENS", font(MEDIUM, 12), mix(CARD, DIM, lay), 2.2, align=al)
            tabular(d, (tx, fy + 36), f"{toks:,}", font(LIGHT, 18), mix(CARD, SOFT, lay), align=al)
            sub = f"of {total:,}  ·  {rows[m]['batch']} × 512"
            d.text((tx - (font(LIGHT, 15).getlength(sub) if al == "right" else 0), fy + 64), sub, font=font(LIGHT, 15), fill=mix(CARD, DIM, lay))
            # ratio (residual only): number in Light 58, × smaller
            if m == "residual":
                tracked(d, (x1 - 24, fy + 16), "VS BF16", font(MEDIUM, 12), mix(CARD, DIM, lay), 2.2, align="right")
                if ratio:
                    xw = font(LIGHT, 34).getlength("×")
                    d.text((x1 - 24 - xw, fy + 50), "×", font=font(LIGHT, 34), fill=mix(CARD, acc, lay))
                    tabular(d, (x1 - 24 - xw - 4, fy + 30), f"{ratio:.2f}", font(LIGHT, 58), mix(CARD, acc, lay), align="right")
                else:
                    d.text((x1 - 24 - font(LIGHT, 58).getlength("—"), fy + 30), "—", font=font(LIGHT, 58), fill=mix(CARD, DIM, lay))
            # intro labels over each terminal while waiting for decode
            if t < 0:
                v = lay * ease_in_out(clamp01(-t / 0.5))
                if v > 0:
                    d.rectangle([x0 + 1, c["vid_y"] + 1, x1 - 1, fy - 1], fill=(9, 11, 15, int(215 * v)))
                    cx = (x0 + x1) / 2
                    cy = (c["vid_y"] + fy) / 2
                    tag = "BASELINE" if m == "bf16" else "PROPOSED"
                    name = "BF16" if m == "bf16" else "ResidualQuant"
                    sub = ("vLLM  ·  BF16 KV cache  ·  batch 2" if m == "bf16"
                           else "INT2 residual + INT4 anchor KV cache  ·  batch 8")
                    tracked(d, (cx, cy - 92), tag, font(MEDIUM, 13), mix(BG, DIM, v), 3.0, align="center")
                    fn = font(LIGHT, 76)
                    d.text((cx - fn.getlength(name) / 2, cy - 64), name, font=fn, fill=mix(BG, acc, v))
                    d.text((cx - font(LIGHT, 20).getlength(sub) / 2, cy + 38), sub, font=font(LIGHT, 20), fill=mix(BG, SOFT, v))
            # completion: ease the terminal down, bring the time up
            if done:
                a = ease_out(clamp01((t - END[m]) / 0.7))
                d.rectangle([x0 + 1, c["vid_y"] + 1, x1 - 1, fy - 1], fill=(9, 11, 15, int(246 * a)))
                k = ease_out(clamp01((t - END[m] - 0.25) / 0.6))
                if k > 0:
                    cx = (x0 + x1) / 2
                    cy = (c["vid_y"] + fy) / 2 + 16 * (1 - k)
                    col = mix(BG, TEXT, k)
                    tabular(d, (cx, cy - 56), f"{END[m]:.2f} s", font(LIGHT, 64), col, align="center")
                    sub = f"{total:,} tokens  ·  {rows[m]['tokens_per_second']:.1f} tokens / s"
                    d.text((cx - font(LIGHT, 18).getlength(sub) / 2, cy + 30), sub, font=font(LIGHT, 18), fill=mix(BG, MUTED, k))

        # timeline
        tl0, tl1 = 84, W - 84
        span = max(END.values())
        prog = clamp01(t / span)
        d.rectangle([tl0, TL_Y, tl0 + (tl1 - tl0) * prog, TL_Y + 2], fill=mix(BG, (150, 160, 175), lay))
        for m, c in CARDS.items():
            mx = tl0 + (tl1 - tl0) * END[m] / span
            col = mix(BG, c["accent"] if t >= END[m] else DIM, lay)
            d.rectangle([mx - 1, TL_Y - 6, mx + 1, TL_Y + 8], fill=col)
            lab = f"{END[m]:.1f} s"
            lw = font(LIGHT, 15).getlength(lab)
            d.text((mx - lw / 2 if m == "residual" else mx - lw, TL_Y + 16), lab, font=font(LIGHT, 15), fill=col)
        tabular(d, (tl1, TL_Y - 40), fmt_time(clamp01(t / span) * span), font(LIGHT, 22), mix(BG, SOFT, lay), align="right")

    # outro: dim everything, bring in the result card
    if T >= OUTRO_START:
        o = ease_in_out(clamp01((T - OUTRO_START) / OUTRO_MOVE))
        img = Image.alpha_composite(img, Image.new("RGBA", (W, H), BG + (int(255 * o),)))
        d = ImageDraw.Draw(img)
        k = ease_out(clamp01((T - OUTRO_START - 0.3) / 1.3))
        if k > 0:
            cy = H / 2 + 20 * (1 - k)
            val = FINAL_RATIO * ease_out(clamp01((T - OUTRO_START - 0.3) / 1.6))
            big, xs = font(LIGHT, 190), font(LIGHT, 96)
            num = f"{val:.1f}"
            nw = big.getlength("0") * sum(ch.isdigit() for ch in num) + big.getlength(".")
            xw = xs.getlength("×")
            left = W / 2 - (nw + 8 + xw) / 2
            tabular(d, (left, cy - 190), num, big, mix(BG, TEXT, k))
            d.text((left + nw + 8, cy - 98), "×", font=xs, fill=mix(BG, TEXT, k))
            cap = "decode throughput  ·  ResidualQuant vs. BF16"
            d.text(((W - font(LIGHT, 24).getlength(cap)) / 2, cy + 36), cap, font=font(LIGHT, 24), fill=mix(BG, SOFT, k))
            cols = [("BATCH", "8  vs  2"),
                    ("TOKENS / S", f"{rows['residual']['tokens_per_second']:.1f}  vs  {rows['bf16']['tokens_per_second']:.1f}"),
                    ("WALL TIME", f"{END['residual']:.1f} s  vs  {END['bf16']:.1f} s")]
            k2 = ease_out(clamp01((T - OUTRO_START - 0.8) / 0.9))
            if k2 > 0:
                y = cy + 118 + 14 * (1 - k2)
                for (lab, val_), x in zip(cols, (W / 2 - 330, W / 2, W / 2 + 330)):
                    tracked(d, (x, y), lab, font(MEDIUM, 12), mix(BG, DIM, k2), 2.4, align="center")
                    tabular(d, (x, y + 22), val_, font(LIGHT, 26), mix(BG, SOFT, k2), align="center")
                for x in (W / 2 - 165, W / 2 + 165):
                    d.rectangle([x, y + 4, x, y + 52], fill=mix(BG, BORDER_HI, k2))
                foot = "Ouro-1.4B  ·  NVIDIA RTX 5090  ·  16,384-token context  ·  real terminal recordings at 1× speed"
                d.text(((W - font(LIGHT, 15).getlength(foot)) / 2, y + 96), foot, font=font(LIGHT, 15), fill=mix(BG, DIM, k2))

    # global fades
    fade = 1.0
    if T < FADE_IN:
        fade = ease_in_out(T / FADE_IN)
    elif T > DURATION - FADE_OUT:
        fade = ease_in_out(clamp01((DURATION - T) / FADE_OUT))
    if fade < 1.0:
        img = Image.alpha_composite(img, Image.new("RGBA", (W, H), BG + (int(255 * (1 - fade)),)))
    return img


# --------------------------------------------------------------- ffmpeg ----
if args.dump_frame is not None:
    for f in range(args.dump_frame + 1):
        im = render(f)
    im.save(OUT / f"dump-{args.dump_frame}.png")
    sys.exit(0)


def vid_chain(i, m):
    c = CARDS[m]
    off = caps[m]["decode_video_offset_seconds"]
    return (f"[{i}:v]trim=start={off},setpts=PTS-STARTPTS,"
            f"crop={c['src_w']}:{CROP_H}:0:{CROP_TOP},scale={c['w'] - 2}:{VID_H - 2}:flags=lanczos,"
            f"tpad=start_mode=clone:start_duration={PRE},tpad=stop_mode=clone:stop_duration={DURATION},"
            f"trim=duration={DURATION},setpts=PTS-STARTPTS,fps={FPS},setsar=1[v{i}]")


filters = [vid_chain(0, "bf16"), vid_chain(1, "residual"),
           f"color=c=0x{BG[0]:02x}{BG[1]:02x}{BG[2]:02x}:s={W}x{H}:r={FPS}:d={DURATION}[bg]",
           f"[bg][v0]overlay=x={CARDS['bf16']['x'] + 1}:y={CARDS['bf16']['vid_y'] + 1}:shortest=1[b1]",
           f"[b1][v1]overlay=x={CARDS['residual']['x'] + 1}:y={CARDS['residual']['vid_y'] + 1}[b2]",
           "[2:v]format=rgba[ov]",
           "[b2][ov]overlay=0:0:format=auto,format=yuv420p[out]"]
cmd = ["ffmpeg", "-y", "-loglevel", "error",
       "-i", str(TAKES / "bf16-screen.mp4"), "-i", str(TAKES / "residual-screen.mp4"),
       "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "pipe:0",
       "-filter_complex", ";".join(filters), "-map", "[out]", "-frames:v", str(FRAMES), "-an",
       "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
       f"{BASE}.mp4"]
proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
for f in range(FRAMES):
    proc.stdin.write(render(f).tobytes())
    if f % 48 == 0:
        print(f"\rframe {f}/{FRAMES}", end="", file=sys.stderr, flush=True)
proc.stdin.close()
assert proc.wait() == 0, "ffmpeg failed"
print(f"\rrendered {FRAMES} frames ({DURATION:.2f}s)", file=sys.stderr)

for name, sec in [("-poster.png", PRE + 9.0), ("-final.png", DURATION - FADE_OUT - 0.4), ("-title.png", 1.1)]:
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(sec), "-i", f"{BASE}.mp4", "-frames:v", "1", f"{BASE}{name}"], check=True)
if not args.skip_webm:
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{BASE}.mp4", "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "31",
                    "-deadline", "good", "-cpu-used", "4", "-row-mt", "1", "-an", f"{BASE}.webm"], check=True)

summary = dict(
    model=rows["bf16"]["model"], gpu=rows["bf16"]["gpu"], gpu_uuid=rows["bf16"]["gpu_uuid"],
    canvas=f"{W}x{H}", fps=FPS, duration_seconds=DURATION, decode_start_seconds=PRE, outro_start_seconds=OUTRO_START,
    throughput_ratio=FINAL_RATIO,
    capture="Original xterm recordings (ffmpeg x11grab during inference); chrome, live counters, transitions and the result card rendered from the recorded token timestamps.",
    layout="Title card; framed terminal cards (BF16 batch 2 left, ResidualQuant batch 8 right) scaled 0.875 with the 4 redundant header lines cropped; per-card footer with cumulative tokens/s, output tokens and live ratio; progress hairline; shared decode timeline; completion states; result card.",
    methods=[{k: rows[m][k] for k in ["method", "batch", "seconds", "tokens_per_second", "config", "captured_cuda_graph_count", "cuda_graph", "prompt_sha256", "runtime_git", "script_sha256", "timing_scope", "vllm", "torch"]} for m in rows],
)
Path(f"{BASE}.json").write_text(json.dumps(summary, indent=2) + "\n")
print(json.dumps({k: summary[k] for k in ["throughput_ratio", "duration_seconds"]}))
