"""자막 글자 크기 자동 맞춤 (주아 폰트 실제 글자 폭 기준). render_audio.py · script_check.py 공용."""
from pathlib import Path

from fontTools.ttLib import TTFont

FONT = Path(__file__).resolve().parent.parent / "video" / "public" / "fonts" / "Jua-Regular.ttf"

# 화면 크기 (video/src/Caption.tsx 와 같은 값)
CAPTION_SIZE, CAPTION_MAX_W, CAPTION_MAX_H, LINE_H = 40, 640, 170, 1.3
CTA_SIZES, CTA_MAX_W = (38, 27), 458  # 아이콘 들어간 안내 박스 기준
MIN_SIZE = 26


def plain(text):
    return text.replace("**", "")


class Metrics:
    def __init__(self, path=FONT):
        f = TTFont(str(path))
        self.cmap = f.getBestCmap()
        self.hmtx = f["hmtx"]
        self.upm = f["head"].unitsPerEm

    def width(self, text, size):
        w = 0
        for ch in plain(text):
            g = self.cmap.get(ord(ch))
            w += self.hmtx[g][0] if g else self.upm * 0.6
        return w * size / self.upm

    def missing(self, text):
        return sorted({ch for ch in plain(text) if ch.strip() and ord(ch) not in self.cmap})


def fit_caption(m, lines):
    """자막 글자 크기: 가장 긴 줄이 폭에 맞고, 줄 수가 높이에 맞도록 (최대 40)"""
    widest = max((m.width(l, CAPTION_SIZE) for l in lines), default=0)
    size = CAPTION_SIZE
    if widest > CAPTION_MAX_W:
        size = CAPTION_SIZE * CAPTION_MAX_W / widest
    size = min(size, CAPTION_MAX_H / (max(len(lines), 1) * LINE_H))
    return max(MIN_SIZE, int(size))


def fit_cta(m, lines):
    """안내 박스: 첫 줄 38, 나머지 27 기준으로 같은 비율로 줄임"""
    scale = 1.0
    for i, l in enumerate(lines):
        base = CTA_SIZES[0] if i == 0 else CTA_SIZES[1]
        w = m.width(l, base)
        if w > CTA_MAX_W:
            scale = min(scale, CTA_MAX_W / w)
    return [max(18, int((CTA_SIZES[0] if i == 0 else CTA_SIZES[1]) * scale)) for i in range(len(lines))]
