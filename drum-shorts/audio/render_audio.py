"""
장르 폴더(config.json + 미디 + 원샷)를 읽어서
  1) 장면 순서대로 원샷을 배치한 오디오(audio.wav)
  2) 화면이 소리에 맞춰 움직이도록 시간표(timeline.json)
를 만든다.

사용: python render_audio.py <장르 폴더> <출력 폴더>
"""
import json
import math
import sys
from pathlib import Path

import mido
import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parent))
from textfit import Metrics, fit_caption, fit_cta  # noqa: E402

SR = 48000
FPS = 30
WIDTH, HEIGHT = 720, 1280
STEPS_PER_BAR = 16


def fail(msg):
    print(f"\n[오류] {msg}\n")
    sys.exit(1)


def warn(msg):
    print(f"[주의] {msg}")


# ---------------------------------------------------------------- 읽기

def load_sample(path: Path) -> np.ndarray:
    if not path.exists():
        fail(f"샘플 파일이 없어요: {path}")
    x, sr = sf.read(str(path), always_2d=True, dtype="float32")
    if x.shape[1] == 1:
        x = np.repeat(x, 2, axis=1)
    x = x[:, :2]
    if sr != SR:  # 간단한 리샘플
        n = int(round(len(x) * SR / sr))
        src = np.linspace(0, len(x) - 1, n)
        x = np.stack([np.interp(src, np.arange(len(x)), x[:, c]) for c in range(2)], 1).astype("float32")
    return x


def read_pattern(path: Path, note, bars: int):
    """미디에서 16분음표 단위 스텝 목록 [(step, velocity)]을 뽑는다 (패턴 길이만큼)."""
    if not path.exists():
        fail(f"미디 파일이 없어요: {path}")
    mid = mido.MidiFile(str(path))
    t16 = mid.ticks_per_beat / 4
    total = bars * STEPS_PER_BAR
    hits, extra, tick = {}, {}, 0
    for msg in mido.merge_tracks(mid.tracks):
        tick += msg.time
        if msg.type != "note_on" or msg.velocity == 0:
            continue
        if note is not None and msg.note != note:
            continue
        step = int(round(tick / t16))
        target = hits if step < total else extra
        key = step if step < total else step % total
        target[key] = max(target.get(key, 0), msg.velocity)
    if not hits:
        fail(f"{path.name} 의 앞 {bars}마디에서 음표를 찾지 못했어요.")
    if extra and set(extra) != set(hits):
        warn(f"{path.name}: {bars}마디 뒤에 다른 패턴이 있어요. 앞 {bars}마디만 사용합니다.")
    return sorted(hits.items())


# ---------------------------------------------------------------- 배치

def place(events, samples, gains, length):
    out = np.zeros((length, 2), dtype="float64")
    for ev in events:
        s = samples[ev["track"]]
        i = int(round(ev["time"] * SR))
        if i >= length:
            continue
        n = min(len(s), length - i)
        out[i:i + n] += s[:n] * gains[ev["track"]] * (ev["vel"] / 127) ** 2
    return out


def fit_gains(master_path, patterns, track_ids, samples, step_sec, total_steps):
    """마스터 wav와 같은 소리가 나도록 악기별 볼륨을 자동으로 맞춘다."""
    m = load_sample(master_path).astype("float64")
    cols = []
    for tid in track_ids:
        evs = []
        reps = max(1, int(len(m) / SR // (total_steps * step_sec)))  # 마스터에 온전히 들어간 반복 횟수
        for r in range(reps):
            for step, vel in patterns[tid]:
                evs.append({"track": tid, "time": (r * total_steps + step) * step_sec, "vel": vel})
        cols.append(place(evs, samples, {tid: 1.0}, len(m)).ravel())
    A = np.stack(cols, 1)
    g, *_ = np.linalg.lstsq(A, m.ravel(), rcond=None)
    resid = np.linalg.norm(m.ravel() - A @ g) / (np.linalg.norm(m.ravel()) + 1e-12)
    return {tid: float(v) for tid, v in zip(track_ids, g)}, float(resid)


# ---------------------------------------------------------------- 메인

def fill(text, cfg):
    if text is None:
        return None
    return text.replace("{bpm}", f"{cfg['bpm']:g}").replace("{swing_ms}", f"{cfg['swing_ms']:g}")


def main():
    if len(sys.argv) != 3:
        fail("사용법: python render_audio.py <장르 폴더> <출력 폴더>")
    gdir, outdir = Path(sys.argv[1]), Path(sys.argv[2])
    cfg_path = gdir / "config.json"
    if not cfg_path.exists():
        fail(f"config.json 이 없어요: {cfg_path}")
    try:
        cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        fail(f"config.json 문법 오류 ({e.lineno}번째 줄): {e.msg}  — 쉼표나 따옴표를 확인해 주세요.")

    bpm = float(cfg["bpm"])
    bars_in_pattern = int(cfg.get("bars_in_pattern", 1))
    swing_sec = float(cfg.get("swing_ms", 0)) / 1000
    bar_sec = 240 / bpm
    step_sec = bar_sec / STEPS_PER_BAR
    if swing_sec >= step_sec:
        fail("swing_ms 값이 16분음표 길이보다 커요.")

    tracks = cfg["tracks"]
    track_ids = [t["id"] for t in tracks]
    samples = {t["id"]: load_sample(gdir / t["sample"]) for t in tracks}
    patterns = {t["id"]: read_pattern(gdir / t["midi"], t.get("note"), bars_in_pattern) for t in tracks}

    # 볼륨: 마스터가 있으면 자동으로 맞추고, 없으면 config의 gain(기본 1.0)
    gains = {t["id"]: float(t.get("gain", 1.0)) for t in tracks}
    master = cfg.get("master")
    if master and (gdir / master).exists():
        fitted, resid = fit_gains(gdir / master, patterns, track_ids, samples, step_sec,
                                  bars_in_pattern * STEPS_PER_BAR)
        if resid < 0.2 and all(v > 0 for v in fitted.values()):
            gains = fitted
            print(f"마스터 wav 기준으로 볼륨을 맞췄어요 (차이 {resid * 100:.1f}%): "
                  + ", ".join(f"{k} x{v:.2f}" for k, v in gains.items()))
        else:
            warn(f"마스터 wav와 패턴이 잘 안 맞아서(차이 {resid * 100:.0f}%) 볼륨 자동 맞춤을 건너뜁니다.")

    # 장면 → 시간표 + 이벤트
    scenes_out, events, t0 = [], [], 0.0
    metrics = Metrics()
    max_progress = 0
    for i, sc in enumerate(cfg["scenes"]):
        bars = int(sc.get("bars", 1))
        start_bar = int(sc.get("start_bar", 1))
        play = sc.get("play", track_ids)
        for p in play:
            if p not in track_ids:
                fail(f"{i + 1}번째 장면의 play 에 없는 악기 이름이 있어요: {p}")
        swing = bool(sc.get("swing", False))
        for b in range(bars):
            pbar = (start_bar - 1 + b) % bars_in_pattern
            for tid in play:
                for step, vel in patterns[tid]:
                    if step // STEPS_PER_BAR != pbar:
                        continue
                    s = step % STEPS_PER_BAR
                    swung = swing and s % 2 == 1
                    events.append({
                        "track": tid, "vel": vel, "scene": i, "bar": b, "step": s, "swung": swung,
                        "time": round(t0 + b * bar_sec + s * step_sec + (swing_sec if swung else 0), 6),
                    })
        max_progress = max(max_progress, int(sc.get("progress", 0)))
        caption = fill(sc.get("caption"), cfg)
        cta = [fill(x, cfg) for x in sc["cta"]] if sc.get("cta") else None
        scenes_out.append({
            "name": sc.get("name", f"장면{i + 1}"),
            "start": round(t0, 6),
            "end": round(t0 + bars * bar_sec, 6),
            "bars": bars,
            "startBar": start_bar,
            "play": play,
            "swing": swing,
            "focus": sc.get("focus", []),
            "progress": int(sc.get("progress", 0)),
            "showSwingLabel": bool(sc.get("show_swing_label", False)),
            "caption": caption,
            "cta": cta,
            "captionSize": fit_caption(metrics, caption.split("\n")) if caption else None,
            "ctaSizes": fit_cta(metrics, cta) if cta else None,
        })
        t0 += bars * bar_sec

    total_sec = t0
    length = int(round(total_sec * SR))
    mix = place(events, samples, gains, length)
    if not master or not (gdir / master).exists():
        peak = np.abs(mix).max()
        if peak > 0:
            mix *= 0.63 / peak  # 약 -4dBFS
    peak = np.abs(mix).max()
    if peak > 0.99:
        warn(f"소리가 너무 커서 전체 볼륨을 낮췄어요 (피크 {peak:.2f})")
        mix *= 0.98 / peak
    fade = int(0.01 * SR)
    mix[-fade:] *= np.linspace(1, 0, fade)[:, None]

    outdir.mkdir(parents=True, exist_ok=True)
    sf.write(str(outdir / "audio.wav"), mix.astype("float32"), SR, subtype="PCM_24")

    timeline = {
        "fps": FPS, "width": WIDTH, "height": HEIGHT,
        "durationInFrames": int(math.ceil(total_sec * FPS)),
        "totalSec": total_sec,
        "bpm": bpm, "barSec": bar_sec, "stepSec": step_sec,
        "swingMs": float(cfg.get("swing_ms", 0)), "swingSec": swing_sec,
        "barsInPattern": bars_in_pattern,
        "style": cfg.get("style", "machine"),
        "title": cfg.get("title", ""),
        "site": cfg.get("site", ""),
        "info": [fill(x, cfg) for x in cfg.get("info", [])],
        "labels": {
            "bar": fill(cfg.get("labels", {}).get("bar", "bar {n} of {total}"), cfg),
            "swing": fill(cfg.get("labels", {}).get("swing", "+{swing_ms}ms late"), cfg),
        },
        "theme": cfg.get("theme", {}),
        "progressSegments": max_progress,
        "tracks": [{"id": t["id"], "label": t.get("label", t["id"]),
                    "steps": [{"step": s, "vel": v} for s, v in patterns[t["id"]]]} for t in tracks],
        "scenes": scenes_out,
        "events": events,
    }
    (outdir / "timeline.json").write_text(json.dumps(timeline, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"오디오 완성: {total_sec:.2f}초, 장면 {len(scenes_out)}개, 타격 {len(events)}개 → {outdir}")


if __name__ == "__main__":
    main()
