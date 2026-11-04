#!/bin/bash
# 처음 한 번만 실행: bash setup.sh
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "[오류] Node.js 가 없어요. https://nodejs.org 에서 LTS 버전을 설치한 뒤 다시 실행해 주세요."; exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo "[오류] Python 이 없어요. https://www.python.org/downloads/ 에서 설치한 뒤 다시 실행해 주세요."; exit 1
fi

echo "== Python 준비 중 =="
python3 -m venv .venv
.venv/bin/pip install -q --upgrade pip
.venv/bin/pip install -q -r audio/requirements.txt

echo "== Remotion 준비 중 =="
(cd video && npm install --no-audit --no-fund)

echo ""
echo "설치 완료! 이제 영상 만들기:  bash make.sh uk-garage"
