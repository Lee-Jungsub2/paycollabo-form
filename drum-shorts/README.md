# 드럼 패턴 쇼츠 만들기

미디 + 원샷 샘플 + 설정 파일(config.json)을 넣으면
720×1280 세로 쇼츠(MP4)가 자동으로 만들어져요.

---

## 1. 처음 한 번만: 설치 (Mac)

1. **Node.js** 설치: https://nodejs.org 에서 "LTS" 버튼 → 받은 파일 실행
2. **Python** 설치: https://www.python.org/downloads/ 에서 "Download Python" → 받은 파일 실행
3. **터미널** 열기: `command + space` → "터미널" 입력 → 엔터
4. 아래 명령어를 붙여넣고 엔터. 아래 경로는 예시예요. `drum-shorts` 폴더를 터미널 창으로 끌어다 놓으면 실제 경로가 자동으로 입력돼요.

```bash
cd ~/Downloads/paycollabo-form/drum-shorts
```

```bash
bash setup.sh
```

"설치 완료!"가 나오면 끝이에요.

---

## 2. 대본 확인 (영상 만들기 전에)

```bash
.venv/bin/python build.py uk-garage --script
```

`output/uk-garage_대본확인.html` 이 생겨요. 더블클릭하면 브라우저로 열려요.
장면마다 캡처, 자막, 들리는 악기, 미디 실제 위치와 함께 자동 검사 결과가 나와요.

| 검사 | 내용 |
|---|---|
| 글자 폭 | 자막 한 줄이 화면 폭을 넘는지 |
| 폰트 글자 | 주아 폰트에 없는 글자(특수문자 등)가 있는지 |
| 미디 대조 | 자막의 "2박", "3박의 앤", "앤, 그리고 어" 같은 표현이 실제 미디와 맞는지 |
| 읽기 시간 | 장면 길이에 비해 자막이 너무 긴지 (초당 7자 기준) |

✕(빨강)는 고쳐야 할 곳, !(노랑)는 한 번 확인해 볼 곳이에요.

---

## 3. 영상 만들기

```bash
bash make.sh uk-garage
```

1~3분 뒤 `output/uk-garage.mp4` 가 생겨요.

> 처음 실행할 때는 Remotion이 렌더링용 브라우저를 자동으로 내려받아서 조금 더 걸려요.

### 미리보기 (소리 포함, 브라우저에서 확인)

```bash
bash preview.sh
```

브라우저가 열리면 재생 버튼을 눌러 보세요. 종료할 때는 터미널에서 `control + C`.

---

## 4. 새 장르 만들기

1. `genres/uk-garage` 폴더를 복사해서 이름을 바꿔요 (예: `genres/house`)
2. 그 폴더 안의 재료를 새 것으로 바꿔요

| 파일 | 내용 |
|---|---|
| `kick.mid` / `snare.mid` / `hat.mid` | 악기별 미디 (파일 하나에 다 들어 있어도 됨 → 아래 참고) |
| `kick.wav` / `snare.wav` / `hat.wav` | 원샷 샘플 |
| `master.wav` | (선택) 마스터 음원. 있으면 악기별 볼륨을 이것과 똑같이 자동으로 맞춰요 |
| `config.json` | BPM, 스윙, 제목, 장면별 자막 |

3. 실행

```bash
bash make.sh house
```

> **주의:** 미디·샘플·마스터 파일은 GitHub에 올라가지 않도록 설정되어 있어요 (공개 저장소라서).
> 내 Mac의 폴더에만 보관돼요.

---

## 5. config.json 고치는 법

| 항목 | 설명 | 예시 |
|---|---|---|
| `title` | 큰 제목 | `"UK GARAGE"` |
| `site` | 위쪽 배지 | `"paycollabo.com"` |
| `bpm` | 템포 | `130` |
| `info` | 제목 아래 정보줄 (`{bpm}`은 자동으로 숫자로 바뀜) | `["{bpm} BPM", "페이콜라보 개러지 킷"]` |
| `swing_ms` | 스윙: 짝수 번째 16분음표를 몇 ms 늦출지 | `33` |
| `bars_in_pattern` | 패턴이 몇 마디인지 | `2` |

### 장면(`scenes`)

장면은 위에서부터 순서대로 나와요. 순서를 바꾸거나 개수를 늘리고 줄여도 돼요.

| 항목 | 설명 |
|---|---|
| `bars` | 장면 길이(마디 수). BPM이 바뀌어도 박자에 맞춰 자동 계산 |
| `start_bar` | 패턴의 몇 번째 마디부터 보여줄지 (기본 1) |
| `play` | 소리 나는 악기. 빠진 악기는 화면에서 흐리게 표시 |
| `focus` | 주황색으로 강조할 악기. `"swung"`으로 쓰면 늦게 치는 음만 강조 |
| `swing` | `true`면 스윙 적용 |
| `show_swing_label` | `true`면 그리드 아래에 "+33ms 늦게" 표시 |
| `progress` | 위쪽 진행바의 몇 번째 칸인지 |
| `caption` | 자막. `\n`은 줄바꿈, `**글자**`는 주황색 강조 |
| `cta` | 마지막 검은 안내 박스 `["첫 줄", "둘째 줄"]` |

### 미디가 파일 하나에 다 들어 있을 때

`tracks`에서 같은 파일을 쓰고 `note`(미디 노트 번호)로 구분해요.

```json
{ "id": "kick", "label": "Kick", "midi": "pattern.mid", "note": 36, "sample": "kick.wav" }
```

### 쉼표 주의

config.json은 쉼표와 따옴표가 하나라도 빠지면 오류가 나요.
오류가 나면 몇 번째 줄이 문제인지 알려주니까, 그 줄을 확인해 주세요.

---

## 폴더 구조

```
drum-shorts/
├─ genres/<장르>/      재료 + config.json  ← 여기만 바꾸면 됨
├─ audio/              Python: 미디 → 오디오 + 시간표
├─ video/              Remotion: 화면
│  └─ public/fonts/    주아 폰트 (SIL Open Font License, 상업 이용 가능)
├─ build.py            1→2→3단계 한 번에 실행
├─ setup.sh / make.sh / preview.sh
└─ output/             완성된 MP4
```

**운영 서버(Supabase, EC2)와는 전혀 연결되어 있지 않아요.** 내 Mac에서만 돌아가요.

**Remotion 라이선스:** 개인이나 직원 3명 이하인 회사는 무료예요. 그보다 크면 유료 회사 라이선스가 필요해요 (https://remotion.dev/license).
