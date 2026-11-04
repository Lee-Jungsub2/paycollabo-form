"""
드럼 패턴 쇼츠 만들기 — 한 번에 실행

  python3 build.py uk-garage

1) audio/render_audio.py : 미디 + 원샷 → audio.wav, timeline.json
2) Remotion             : timeline.json → 소리 없는 영상
3) ffmpeg               : 영상 + audio.wav → output/<장르>.mp4
"""
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VIDEO = ROOT / "video"


def run(cmd, cwd=None):
    print("\n$ " + " ".join(str(c) for c in cmd))
    r = subprocess.run([str(c) for c in cmd], cwd=cwd)
    if r.returncode != 0:
        print("\n[오류] 위 단계에서 실패했어요. 위쪽 메시지를 확인해 주세요.")
        sys.exit(r.returncode)


def main():
    if len(sys.argv) < 2:
        genres = sorted(p.name for p in (ROOT / "genres").iterdir() if (p / "config.json").exists())
        print("사용법: python3 build.py <장르 폴더 이름>")
        print("가능한 장르: " + ", ".join(genres))
        sys.exit(1)
    genre = sys.argv[1]
    gdir = ROOT / "genres" / genre
    if not (gdir / "config.json").exists():
        print(f"[오류] genres/{genre}/config.json 이 없어요.")
        sys.exit(1)
    if not (VIDEO / "node_modules").exists():
        print("[오류] 처음 한 번 설치가 필요해요:  bash setup.sh")
        sys.exit(1)

    render_dir = VIDEO / "public" / "render" / genre
    out_dir = ROOT / "output"
    out_dir.mkdir(exist_ok=True)
    silent = out_dir / f".{genre}_video.mp4"
    final = out_dir / f"{genre}.mp4"

    print("\n[1/3] 오디오 만드는 중…")
    run([sys.executable, ROOT / "audio" / "render_audio.py", gdir, render_dir])

    print("\n[2/3] 화면 만드는 중… (1~3분)")
    cmd = ["npx", "remotion", "render", "DrumShort", silent,
           "--props=" + json.dumps({"genre": genre}), "--muted", "--log=error"]
    if os.environ.get("REMOTION_BROWSER"):
        cmd.append("--browser-executable=" + os.environ["REMOTION_BROWSER"])
    run(cmd, cwd=VIDEO)

    print("\n[3/3] 소리와 영상 합치는 중…")
    ffmpeg = ["ffmpeg"] if shutil.which("ffmpeg") else ["npx", "remotion", "ffmpeg"]
    run(ffmpeg + ["-y", "-v", "error", "-i", silent, "-i", render_dir / "audio.wav",
                  "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "320k",
                  "-movflags", "+faststart", final], cwd=VIDEO)
    silent.unlink(missing_ok=True)

    print(f"\n완성! → {final}")


if __name__ == "__main__":
    main()
