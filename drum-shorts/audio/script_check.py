"""
대본(자막) 확인 화면 만들기

  python script_check.py <장르 폴더> <timeline.json> <장면 캡처 폴더> <출력 html>

검사 항목
  1. 글자 넘침   : 자막 한 줄이 화면 폭을 넘는지 (주아 폰트 실제 글자 폭으로 계산)
  2. 폰트 글자   : 주아 폰트에 없는 글자(특수문자 등)가 있는지
  3. 미디 대조   : 자막의 "N박", "N박의 앤" 같은 표현이 실제 미디와 맞는지
  4. 읽기 시간   : 장면 길이에 비해 자막이 너무 긴지
"""
import base64
import html
import json
import re
import sys
from pathlib import Path

from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "video" / "public" / "fonts" / "Jua-Regular.ttf"

# 화면 위치·크기 (video/src 와 같은 값)
CAPTION_SIZE, CAPTION_MAX = 40, 640
CTA_SIZES, CTA_MAX = (38, 27), 506
TITLE_SIZE, TITLE_MAX = 118, 700
INFO_SIZE, INFO_MAX = 27, 680
READ_LIMIT = 7.0  # 초당 글자 수(공백·기호 제외) 이상이면 주의

SUB_NAMES = ["정박", "이", "앤", "어"]  # 한 박 안의 16분음표 4개
SUB_ALIAS = {"정박": 0, "이": 1, "앤": 2, "어": 3, "아": 3}
NEGATIVE = re.compile(r"비워|비어|비우|없|쉬")

OK, WARN, ERR = "ok", "warn", "err"


# ---------------------------------------------------------------- 글자 폭

class Metrics:
    def __init__(self, path):
        f = TTFont(str(path))
        self.cmap = f.getBestCmap()
        self.hmtx = f["hmtx"]
        self.upm = f["head"].unitsPerEm

    def width(self, text, size):
        w = 0
        for ch in text:
            g = self.cmap.get(ord(ch))
            w += self.hmtx[g][0] if g else self.upm * 0.6
        return w * size / self.upm

    def missing(self, text):
        return sorted({ch for ch in text if ch.strip() and ord(ch) not in self.cmap})


def plain(text):
    return text.replace("**", "")


# ---------------------------------------------------------------- 미디 표현

def pos_name(step):
    beat, sub = divmod(step % 16, 4)
    return f"{beat + 1}박" if sub == 0 else f"{beat + 1}박의 {SUB_NAMES[sub]}"


def parse_positions(segment):
    """문장에서 박자 위치 뽑기 → (특정 위치 집합, 박 번호 없는 세부 위치 집합)"""
    seg = plain(segment)
    exact = set()
    for m in re.finditer(r"([1-4])\s*박(?:\s*의)?(?:\s*(정박|이|앤|어|아)(?![가-힣]*박))?", seg):
        beat = int(m.group(1)) - 1
        sub = SUB_ALIAS.get(m.group(2) or "정박", 0)
        exact.add(beat * 4 + sub)
    generic = set()
    if not exact:
        toks = [re.sub(r"(이고|이랑|하고|과|와|에|은|는|을|를|도|만)$", "", t)
                for t in re.split(r"[\s,.:;!?·'\"()]+", seg)]
        strong = [t for t in toks if t in ("앤", "어")]
        # '이', '아'는 일상어로도 쓰여서 '앤'/'어'와 같이 나올 때만 박자로 본다
        weak = [t for t in toks if t in ("이", "아")] if strong else []
        for tok in strong + weak:
            generic.add(SUB_ALIAS[tok])
    return exact, generic


def check_midi(caption, track, bars_in_pattern):
    """자막 속 박자 표현을 미디와 비교"""
    hits_by_bar = [sorted(s["step"] % 16 for s in track["steps"] if s["step"] // 16 == b)
                   for b in range(bars_in_pattern)]
    any_bar = set(x for bar in hits_by_bar for x in bar)
    results, mentioned = [], set()
    for seg in re.split(r"[.\n!?]+", caption):
        if not seg.strip():
            continue
        exact, generic = parse_positions(seg)
        neg = bool(NEGATIVE.search(seg))
        for p in sorted(exact):
            mentioned.add(p)
            if neg and p in any_bar:
                results.append((ERR, f"자막은 '{pos_name(p)}'이 비어 있다고 했는데, 미디에는 {track['label']}가 있어요"))
            elif not neg and p not in any_bar:
                results.append((ERR, f"자막에는 '{pos_name(p)}'이 있는데, 미디에는 {track['label']}가 없어요"))
        for sub in sorted(generic):
            found = [p for p in any_bar if p % 4 == sub]
            mentioned.update(found)
            if not found:
                results.append((ERR, f"자막에는 '{SUB_NAMES[sub]}'이 있는데, 미디에는 그 위치에 {track['label']}가 없어요"))
    if mentioned and not any(r[0] == ERR for r in results):
        results.append((OK, "자막의 박자 표현이 미디와 맞아요"))
    extra = []
    for b, bar in enumerate(hits_by_bar):
        for p in bar:
            if p not in mentioned:
                extra.append(f"{pos_name(p)}({b + 1}마디)")
    if mentioned and extra:
        results.append((WARN, "자막에 없는 위치도 있어요 (괜찮으면 무시): " + ", ".join(extra)))
    return results


def describe_track(track, bars_in_pattern):
    out = []
    for b in range(bars_in_pattern):
        steps = sorted(s["step"] % 16 for s in track["steps"] if s["step"] // 16 == b)
        out.append(f"{b + 1}마디: " + (", ".join(pos_name(p) for p in steps) or "없음"))
    return out


# ---------------------------------------------------------------- 검사 실행

def check_line(metrics, text, size, limit, what):
    w = metrics.width(plain(text), size)
    res = []
    if w > limit:
        res.append((ERR, f"{what} '{plain(text)}' 이 화면 폭을 넘어요 ({w:.0f}px / 최대 {limit}px)"))
    miss = metrics.missing(plain(text))
    if miss:
        res.append((ERR, f"{what}에 폰트에 없는 글자가 있어요: {' '.join(miss)}"))
    return res, w


def run_checks(tl, metrics):
    tracks = {t["id"]: t for t in tl["tracks"]}
    global_res = []
    r, _ = check_line(metrics, tl["title"], TITLE_SIZE, TITLE_MAX, "제목")
    global_res += r
    r, _ = check_line(metrics, "  |  ".join(tl["info"]), INFO_SIZE, INFO_MAX, "정보줄")
    global_res += r

    scenes = []
    for sc in tl["scenes"]:
        res = []
        dur = sc["end"] - sc["start"]
        lines = sc["cta"] or (sc["caption"] or "").split("\n")
        widths = []
        for i, line in enumerate(lines):
            if sc["cta"]:
                size, limit = (CTA_SIZES[0] if i == 0 else CTA_SIZES[1]), CTA_MAX
            else:
                size, limit = CAPTION_SIZE, CAPTION_MAX
            r, w = check_line(metrics, line, size, limit, "자막")
            res += r
            widths.append(w / limit)
        if not any(x[0] == ERR for x in res) and lines and any(l.strip() for l in lines):
            res.append((OK, f"글자 폭 OK (가장 긴 줄 {max(widths) * 100:.0f}%)"))
        if not sc["cta"] and len(lines) > 2:
            res.append((WARN, f"자막이 {len(lines)}줄이에요. 2줄 이하를 추천해요"))

        chars = len(re.sub(r"[\s\W_]", "", plain(" ".join(lines))))
        cps = chars / dur if dur else 0
        if cps > READ_LIMIT:
            res.append((WARN, f"읽기 빠듯해요: {chars}자 / {dur:.1f}초 (초당 {cps:.1f}자, 권장 {READ_LIMIT:g}자 이하)"))
        elif chars:
            res.append((OK, f"읽기 시간 OK: {chars}자 / {dur:.1f}초"))

        midi_info = []
        focus = sc["focus"] if isinstance(sc["focus"], list) else []
        if len(focus) == 1 and sc["caption"]:
            t = tracks[focus[0]]
            res += check_midi(sc["caption"], t, tl["barsInPattern"])
            midi_info = describe_track(t, tl["barsInPattern"])
        scenes.append({"scene": sc, "results": res, "midi": midi_info, "dur": dur})
    return global_res, scenes


# ---------------------------------------------------------------- HTML

def accent_html(text):
    parts = re.split(r"(\*\*[^*]+\*\*)", text)
    return "".join(f"<em>{html.escape(p[2:-2])}</em>" if p.startswith("**") and p.endswith("**")
                   else html.escape(p) for p in parts)


def build_html(cfg, tl, global_res, scenes, stills, frames):
    labels = {t["id"]: t["label"] for t in tl["tracks"]}
    n_err = sum(1 for s in scenes for r in s["results"] if r[0] == ERR) + sum(1 for r in global_res if r[0] == ERR)
    n_warn = sum(1 for s in scenes for r in s["results"] if r[0] == WARN) + sum(1 for r in global_res if r[0] == WARN)
    icon = {OK: "✓", WARN: "!", ERR: "✕"}

    def res_list(results):
        return "".join(f'<li class="{k}"><span class="ic">{icon[k]}</span>{html.escape(m)}</li>' for k, m in results)

    cards = []
    for i, s in enumerate(scenes):
        sc = s["scene"]
        img = stills / f"frame_{frames[i]}.jpg"
        img_tag = ""
        if img.exists():
            b64 = base64.b64encode(img.read_bytes()).decode()
            img_tag = f'<img src="data:image/jpeg;base64,{b64}" alt="{html.escape(sc["name"])} 장면">'
        if sc["cta"]:
            cap = '<div class="cta">' + "<br>".join(accent_html(l) for l in sc["cta"]) + "</div>"
        else:
            cap = '<div class="cap">' + "<br>".join(accent_html(l) for l in (sc["caption"] or "").split("\n")) + "</div>"
        focus = sc["focus"]
        focus_txt = "늦게 치는 음" if focus == "swung" else (", ".join(labels[f] for f in focus) or "없음")
        midi = ("<div class='midi'><b>미디 실제 위치</b><br>" + "<br>".join(html.escape(x) for x in s["midi"]) + "</div>") if s["midi"] else ""
        status = ERR if any(r[0] == ERR for r in s["results"]) else WARN if any(r[0] == WARN for r in s["results"]) else OK
        cards.append(f"""
<section class="card {status}">
  <div class="shot">{img_tag}</div>
  <div class="body">
    <div class="head"><span class="no">{i + 1}</span><h2>{html.escape(sc['name'])}</h2>
      <span class="time">{sc['start']:.1f}–{sc['end']:.1f}초 · {sc['bars']}마디</span></div>
    {cap}
    <dl>
      <dt>들리는 악기</dt><dd>{html.escape(', '.join(labels[p] for p in sc['play']))}{' · 스윙' if sc['swing'] else ''}</dd>
      <dt>강조</dt><dd>{html.escape(focus_txt)}</dd>
    </dl>
    {midi}
    <ul class="res">{res_list(s['results'])}</ul>
  </div>
</section>""")

    summary_cls = ERR if n_err else WARN if n_warn else OK
    summary = (f"고쳐야 할 곳 {n_err}개 · 확인할 곳 {n_warn}개" if (n_err or n_warn) else "문제 없음 — 영상 제작 가능")
    return f"""<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>대본 확인 · {html.escape(tl['title'])}</title>
<style>
:root{{--bg:#F4F3EF;--panel:#FFFFFF;--ink:#1A1A1A;--muted:#6E6D69;--line:#E2E0DA;--accent:#F55B2C;
--ok:#1E8E4E;--ok-bg:#E7F5EC;--warn:#A86400;--warn-bg:#FFF3DC;--err:#C62828;--err-bg:#FDE8E8}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--bg:#151515;--panel:#202020;--ink:#F0F0EE;--muted:#9C9B97;--line:#333;
--ok:#5BD08A;--ok-bg:#16301F;--warn:#F2B552;--warn-bg:#33270F;--err:#FF7B7B;--err-bg:#3A1A1A}}}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR",sans-serif}}
main{{max-width:880px;margin:0 auto;padding:24px 16px 64px}}
h1{{font-size:24px;margin:0 0 4px}}
.meta{{color:var(--muted);margin-bottom:16px}}
.summary{{padding:14px 16px;border-radius:12px;font-weight:700;margin-bottom:8px}}
.summary.ok{{background:var(--ok-bg);color:var(--ok)}}.summary.warn{{background:var(--warn-bg);color:var(--warn)}}.summary.err{{background:var(--err-bg);color:var(--err)}}
.global{{margin:0 0 20px}}
.card{{display:flex;gap:18px;background:var(--panel);border:1px solid var(--line);border-left:5px solid var(--ok);border-radius:12px;padding:16px;margin:14px 0}}
.card.warn{{border-left-color:var(--warn)}}.card.err{{border-left-color:var(--err)}}
.shot{{flex:0 0 180px}}.shot img{{width:180px;border-radius:8px;display:block;border:1px solid var(--line)}}
.body{{flex:1;min-width:0}}
.head{{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}}
.no{{background:var(--ink);color:var(--panel);border-radius:6px;padding:0 7px;font-weight:700;font-size:14px}}
h2{{font-size:19px;margin:0}}.time{{color:var(--muted);font-size:14px}}
.cap{{font-size:20px;font-weight:700;margin:10px 0;line-height:1.45}}
.cap em,.cta em{{font-style:normal;color:var(--accent)}}
.cta{{background:#111;color:#fff;border-radius:10px;padding:10px 14px;margin:10px 0;font-weight:700;text-align:center}}
dl{{display:grid;grid-template-columns:auto 1fr;gap:2px 12px;margin:6px 0;font-size:14px}}
dt{{color:var(--muted)}}dd{{margin:0}}
.midi{{font-size:13.5px;background:var(--bg);border-radius:8px;padding:8px 10px;margin:8px 0}}
.res{{list-style:none;padding:0;margin:8px 0 0;font-size:14px}}
.res li{{display:flex;gap:8px;padding:3px 0}}
.ic{{flex:0 0 20px;height:20px;border-radius:50%;text-align:center;font-weight:800;font-size:12px;line-height:20px}}
li.ok .ic{{background:var(--ok-bg);color:var(--ok)}}li.warn .ic{{background:var(--warn-bg);color:var(--warn)}}li.err .ic{{background:var(--err-bg);color:var(--err)}}
li.err{{color:var(--err);font-weight:700}}
.note{{color:var(--muted);font-size:13px;margin-top:28px}}
@media (max-width:600px){{.card{{flex-direction:column}}.shot{{flex:none}}.shot img{{width:100%;max-width:260px;margin:0 auto}}}}
</style></head><body><main>
<h1>대본 확인 · {html.escape(tl['title'])}</h1>
<div class="meta">{tl['bpm']:g} BPM · 스윙 {tl['swingMs']:g}ms · 전체 {tl['totalSec']:.1f}초 · 장면 {len(scenes)}개</div>
<div class="summary {summary_cls}">{summary}</div>
<ul class="res global">{res_list(global_res)}</ul>
{''.join(cards)}
<p class="note">자동 검사는 참고용이에요. "미디 대조"는 자막의 'N박', 'N박의 앤/어' 같은 표현만 확인해요.
수정할 부분은 장면 번호와 함께 말씀해 주세요. (예: "4번 자막을 ○○로 바꿔줘")</p>
</main></body></html>"""


def main():
    gdir, tl_path, stills, out = map(Path, sys.argv[1:5])
    frames = [int(x) for x in sys.argv[5].split(",")]
    cfg = json.loads((gdir / "config.json").read_text(encoding="utf-8"))
    tl = json.loads(tl_path.read_text(encoding="utf-8"))
    metrics = Metrics(FONT)
    global_res, scenes = run_checks(tl, metrics)
    out.write_text(build_html(cfg, tl, global_res, scenes, stills, frames), encoding="utf-8")

    print("\n===== 대본 확인 =====")
    for r in global_res:
        print(f"  [{r[0]}] {r[1]}")
    for i, s in enumerate(scenes):
        sc = s["scene"]
        print(f"\n{i + 1}. {sc['name']} ({sc['start']:.1f}~{sc['end']:.1f}초)")
        print("   " + " / ".join(plain(x) for x in (sc["cta"] or (sc["caption"] or "").split("\n"))))
        for k, m in s["results"]:
            if k != OK:
                print(f"   [{'수정' if k == ERR else '확인'}] {m}")
    print(f"\n확인 화면 → {out}")


if __name__ == "__main__":
    main()
