#!/bin/bash
# 브라우저에서 미리보기(소리 포함): bash preview.sh
# 먼저 make.sh 를 한 번 실행해서 오디오가 만들어져 있어야 해요.
cd "$(dirname "$0")/video" && npx remotion studio
