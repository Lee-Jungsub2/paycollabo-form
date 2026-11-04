import React from 'react';
import {Now} from './timing';
import {Theme, Timeline} from './types';

// 레퍼런스(720x1280) 기준 위치
const GRID_LEFT = 53;
const GRID_TOP = 458;
const GRID_WIDTH = 614;
const ROW_H = 64;
const CELL = 28; // 칸 간격
const FIRST_CELL_X = 210; // 1번 칸 중심
const LABEL_X = 83;
const POP_SEC = 0.18; // 타격 순간 강조 길이

const cellX = (s: number) => FIRST_CELL_X + s * CELL;

export const StepGrid: React.FC<{tl: Timeline; now: Now; theme: Theme}> = ({tl, now, theme}) => {
  const {scene, patternBar, barIdx, stepFloat} = now;
  const rows = tl.tracks.length;
  const gridH = rows * ROW_H + 2;
  const swingPx = (tl.swingSec / tl.stepSec) * CELL;
  const focusSwung = scene.focus === 'swung';
  const barStart = scene.start + barIdx * tl.barSec;

  // "bar {n} of {total}" — 숫자만 굵게
  const [barPre, barPost] = tl.labels.bar.replace('{total}', String(tl.barsInPattern)).split('{n}');

  return (
    <>
      <div style={{position: 'absolute', top: 425, right: 720 - (GRID_LEFT + GRID_WIDTH) + 10, fontSize: 19, color: theme.muted}}>
        {barPre}
        <span style={{color: theme.ink}}>{patternBar + 1}</span>
        {barPost}
      </div>

      <div
        style={{
          position: 'absolute', left: GRID_LEFT, top: GRID_TOP, width: GRID_WIDTH, height: gridH,
          border: `2.5px solid ${theme.ink}`, borderRadius: 4, boxSizing: 'border-box',
        }}
      />

      {tl.tracks.map((track, r) => {
        const playing = scene.play.includes(track.id);
        const barSteps = track.steps.filter((s) => Math.floor(s.step / 16) === patternBar);
        const hasSwung = scene.swing && barSteps.some((s) => (s.step % 16) % 2 === 1);
        const focused = Array.isArray(scene.focus) ? scene.focus.includes(track.id) : false;
        const showDot = playing && (focused || (focusSwung && hasSwung));
        const cy = GRID_TOP + r * ROW_H + ROW_H / 2 + 1;

        return (
          <React.Fragment key={track.id}>
            {r > 0 && (
              <div
                style={{
                  position: 'absolute', left: 195, width: 460, top: GRID_TOP + r * ROW_H,
                  borderTop: `1.5px dashed ${theme.line}`,
                }}
              />
            )}
            {showDot && (
              <div style={{position: 'absolute', left: 60, top: cy - 6, width: 12, height: 12, borderRadius: 6, background: theme.accent}} />
            )}
            <div
              style={{
                position: 'absolute', left: LABEL_X, top: cy - 14, fontSize: 23, lineHeight: '28px',
                color: playing ? theme.ink : theme.dimText,
              }}
            >
              {track.label}
            </div>

            {Array.from({length: 16}, (_, s) => {
              const x = cellX(s);
              const hit = barSteps.find((n) => n.step % 16 === s);
              const isBeat = s % 4 === 0;

              if (!hit) {
                return (
                  <div
                    key={s}
                    style={{
                      position: 'absolute', left: x - 8, top: cy - 13, width: 16, height: 26, borderRadius: 4,
                      boxSizing: 'border-box',
                      background: isBeat ? theme.beat : 'transparent',
                      border: `1.5px solid ${isBeat ? theme.beat : theme.empty}`,
                    }}
                  />
                );
              }

              if (!playing) {
                return (
                  <div
                    key={s}
                    style={{
                      position: 'absolute', left: x - 8, top: cy - 17, width: 16, height: 34, borderRadius: 4,
                      background: theme.ghost,
                    }}
                  />
                );
              }

              const swung = scene.swing && s % 2 === 1;
              const offset = swung ? swingPx : 0;
              const hitTime = barStart + s * tl.stepSec + (swung ? tl.swingSec : 0);
              const dt = now.t - hitTime;
              const pop = dt >= 0 && dt < POP_SEC ? 1 - dt / POP_SEC : 0;
              const accent = focusSwung ? swung : focused;
              // 늦게 치는 음은 조금 작게 그려서 원래 자리(점선)가 보이게
              const w = swung ? 15 : 18;
              const h = (swung ? 30 : 38) + 6 * pop;

              return (
                <React.Fragment key={s}>
                  {swung && (
                    <div
                      style={{
                        position: 'absolute', left: x - 11, top: cy - 16, width: 22, height: 32, borderRadius: 4,
                        boxSizing: 'border-box', border: `1.5px dashed ${theme.muted}`,
                      }}
                    />
                  )}
                  <div
                    style={{
                      position: 'absolute', left: x - w / 2 + offset, top: cy - h / 2, width: w, height: h, borderRadius: 4,
                      boxSizing: 'border-box', background: accent ? theme.accent : theme.note,
                      border: `${2.5 + 1.5 * pop}px solid ${theme.ink}`,
                    }}
                  />
                </React.Fragment>
              );
            })}
          </React.Fragment>
        );
      })}

      {/* 재생선 */}
      <div
        style={{
          position: 'absolute', left: FIRST_CELL_X - CELL / 2 + stepFloat * CELL - 1.5, top: GRID_TOP - 6,
          width: 3, height: gridH + 9, background: theme.ink,
        }}
      >
        <div style={{position: 'absolute', top: -4, left: -4, width: 11, height: 11, borderRadius: 6, background: theme.ink}} />
      </div>

      {/* 박 번호 */}
      {[0, 1, 2, 3].map((b) => (
        <div
          key={b}
          style={{
            position: 'absolute', left: cellX(b * 4) - 15, width: 30, textAlign: 'center',
            top: GRID_TOP + gridH + 4, fontSize: 21, color: theme.muted,
          }}
        >
          {b + 1}
        </div>
      ))}

      {scene.showSwingLabel && (
        <div style={{position: 'absolute', left: 60, top: GRID_TOP + gridH + 1, color: theme.accent, fontSize: 19}}>
          {tl.labels.swing}
          <svg width="130" height="10" style={{position: 'absolute', left: 0, top: 24}} viewBox="0 0 130 10">
            <path d="M3 6 Q 35 1, 65 5 T 127 4" stroke={theme.accent} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </>
  );
};
