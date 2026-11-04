"""자막·제목 글자 크기 자동 맞춤 (실제 폰트 글자 폭 기준). render_audio.py · script_check.py 공용."""
from pathlib import Path

from fontTools.ttLib import TTFont

FONTS = Path(__file__).resolve().parent.parent / "video" / "public" / "fonts"

# 화면 컨셉별 크기 (video/src 의 각 화면과 같은 값)
STYLES = {
    "classic": {"font": "Jua-Regular.ttf", "caption": 40, "caption_w": 640, "caption_h": 170, "line_h": 1.3,
                "cta": (38, 27), "cta_w": 506, "title_font": "Jua-Regular.ttf", "title": 118, "title_w": 700},
    "machine": {"font": "Jua-Regular.ttf", "caption": 40, "caption_w": 640, "caption_h": 170, "line_h": 1.3,
                "cta": (38, 27), "cta_w": 458, "title_font": None, "title": 60, "title_w": 352},
    "tech": {"font": "NotoSansKR-ExtraBold.ttf", "caption": 30, "caption_w": 592, "caption_h": 140, "line_h": 1.45,
             "cta": (30, 21), "cta_w": 500, "title_font": "InterTight-ExtraBold.ttf", "title": 92, "title_w": 640},
}
MIN_SIZE = 22


def style_of(name):
    return STYLES.get(name, STYLES["tech"])


def plain(text):
    return text.replace("**", "")


class Metrics:
    def __init__(self, font_file="Jua-Regular.ttf", fallback=None):
        f = TTFont(str(FONTS / font_file))
        self.cmap = f.getBestCmap()
        self.hmtx = f["hmtx"]
        self.upm = f["head"].unitsPerEm
        self.fallback = Metrics(fallback) if fallback else None

    def width(self, text, size):
        w = 0.0
        for ch in plain(text):
            g = self.cmap.get(ord(ch))
            if g:
                w += self.hmtx[g][0] * size / self.upm
            elif self.fallback:
                w += self.fallback.width(ch, size)
            else:
                w += 0.6 * size
        return w

    def missing(self, text):
        return sorted({ch for ch in plain(text) if ch.strip() and ord(ch) not in self.cmap
                       and not (self.fallback and ord(ch) in self.fallback.cmap)})


def fit_caption(m, lines, st):
    """자막 글자 크기: 가장 긴 줄이 폭에 맞고, 줄 수가 높이에 맞도록"""
    base = st["caption"]
    widest = max((m.width(l, base) for l in lines), default=0)
    size = base * st["caption_w"] / widest if widest > st["caption_w"] else base
    size = min(size, st["caption_h"] / (max(len(lines), 1) * st["line_h"]))
    return max(MIN_SIZE, int(size))


def fit_cta(m, lines, st):
    """안내 박스: 첫 줄/나머지 기준 크기를 같은 비율로 줄임"""
    big, small = st["cta"]
    scale = 1.0
    for i, l in enumerate(lines):
        w = m.width(l, big if i == 0 else small)
        if w > st["cta_w"]:
            scale = min(scale, st["cta_w"] / w)
    return [max(16, int((big if i == 0 else small) * scale)) for i in range(len(lines))]


def fit_title(title, st):
    if not st.get("title_font"):
        return st["title"]
    m = Metrics(st["title_font"], fallback=st["font"])
    w = m.width(title, st["title"])
    return int(st["title"] * min(1.0, st["title_w"] / w)) if w else st["title"]
