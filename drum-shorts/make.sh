#!/bin/bash
# 영상 만들기: bash make.sh <장르 폴더 이름>
cd "$(dirname "$0")"
if [ ! -x .venv/bin/python ]; then
  echo "[오류] 처음 한 번 설치가 필요해요:  bash setup.sh"; exit 1
fi
.venv/bin/python build.py "$@"
