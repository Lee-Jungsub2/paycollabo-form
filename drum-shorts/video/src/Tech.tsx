import React from 'react';
import {Img, interpolate, spring, staticFile, useVideoConfig} from 'remotion';
import {Now, parseAccent} from './timing';
import {Timeline} from './types';

// 각진 테크니컬 컨셉
export const TC = {
  room: '#1E1E1E',
  hair: '#2E2E2E', // 배경 안내선
  card: '#EBE4D7',
  ink: '#1E1E1E',
  muted: '#8F877A',
  line: '#CFC6B6',
  beatLine: '#9F9584',
  idle: '#B9AE9C', // 빗금(아직 소리 안 나는 음표)
  dimText: '#B4AB9C',
  accent: '#E8502E',
  title: '#EBE4D7',
  stripOff: '#5E5A54',
  stripDone: '#D8D0C2',
  stripTrack: '#3A3936',
};

const MONO = "'JetBrains Mono', 'Noto Sans KR', monospace";
const SANS = "'Inter Tight', 'Noto Sans KR', sans-serif";
const KR = "'Noto Sans KR', sans-serif";

const PANEL = {x: 40, y: 352, w: 640};
const HEAD_H = 52;
const ROW_H = 78;
const X0 = PANEL.x + 128; // 첫 칸 왼쪽
const STEP = 30;
const CELL_W = 24;
const CELL_H = 50;
const CUT = 5;
const POP_SEC = 0.2;

// 모서리를 자른 사각형
const chamfer = (x: number, y: number, w: number, h: number, c: number) =>
  `${x + c},${y} ${x + w - c},${y} ${x + w},${y + c} ${x + w},${y + h - c} ${x + w - c},${y + h} ${x + c},${y + h} ${x},${y + h - c} ${x},${y + c}`;
const cutCss = (c: number) =>
  `polygon(${c}px 0, calc(100% - ${c}px) 0, 100% ${c}px, 100% calc(100% - ${c}px), calc(100% - ${c}px) 100%, ${c}px 100%, 0 calc(100% - ${c}px), 0 ${c}px)`;

const Dots: React.FC = () => (
  <span
    style={{
      flex: 1, height: 2, margin: '0 12px',
      backgroundImage: 'radial-gradient(circle, #9C9384 1px, transparent 1.3px)', backgroundSize: '6px 2px',
    }}
  />
);

const Accented: React.FC<{text: string}> = ({text}) => (
  <>
    {parseAccent(text).map((p, i) => (
      <span key={i} style={{color: p.accent ? TC.accent : undefined}}>
        {p.text}
      </span>
    ))}
  </>
);

const Corner: React.FC<{x: number; y: number; k: 'tl' | 'tr' | 'bl' | 'br'}> = ({x, y, k}) => {
  const b = `2px solid ${TC.ink}`;
  const side = {
    tl: {borderLeft: b, borderTop: b}, tr: {borderRight: b, borderTop: b},
    bl: {borderLeft: b, borderBottom: b}, br: {borderRight: b, borderBottom: b},
  }[k];
  return <div style={{position: 'absolute', left: x, top: y, width: 14, height: 14, ...side}} />;
};

export const Tech: React.FC<{tl: Timeline; now: Now}> = ({tl, now}) => {
  const {fps} = useVideoConfig();
  const {scene, sceneIndex, patternBar, barIdx, stepFloat, localT} = now;
  const focusSwung = scene.focus === 'swung';
  const barStart = scene.start + barIdx * tl.barSec;
  const swingPx = Math.min(8, (tl.swingSec / tl.stepSec) * STEP);
  const rows = tl.tracks.length;
  const panelH = HEAD_H + 24 + rows * ROW_H + 52;
  const gridTop = PANEL.y + HEAD_H + 24;
  const rulerY = gridTop + rows * ROW_H - 6;

  // 학습 단계 표시 (progress 가 있는 장면들)
  const lessons = tl.scenes.filter((s) => s.progress > 0).sort((a, b) => a.progress - b.progress);
  const [barPre, barPost] = tl.labels.bar.replace('{total}', String(tl.barsInPattern)).split('{n}');
  const kit = tl.info.slice(1).join(' · ');

  // 자막 카드
  const appear = interpolate(localT, [0, 0.2], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const capLines = scene.cta ?? (scene.caption ? scene.caption.split('\n') : []);
  const capSize = scene.captionSize ?? 30;
  const iconPop = spring({frame: Math.round(localT * fps), fps, config: {damping: 9, stiffness: 140}});
  const capBodyH = scene.cta
    ? Math.max(84, (scene.ctaSizes?.[0] ?? 30) * 1.4 + (scene.ctaSizes?.[1] ?? 21) * 1.45 * (capLines.length - 1))
    : capLines.length * capSize * 1.45;
  const capCardH = 64 + capBodyH + 26;
  const CAP_Y = 776;

  // 칸 그리기 (SVG)
  const cells: React.ReactNode[] = [];
  const notes: React.ReactNode[] = []; // 음표는 빈칸 위에 그림
  const pops: React.ReactNode[] = [];
  tl.tracks.forEach((track, r) => {
    const y = gridTop + r * ROW_H;
    const playing = scene.play.includes(track.id);
    const focused = Array.isArray(scene.focus) && scene.focus.includes(track.id);
    const barSteps = track.steps.filter((s) => Math.floor(s.step / 16) === patternBar);
    for (let s = 0; s < 16; s++) {
      const x = X0 + s * STEP;
      const hit = barSteps.find((n) => n.step % 16 === s);
      const key = `${r}-${s}`;
      if (!hit) {
        const beat = s % 4 === 0;
        cells.push(
          <polygon key={key} points={chamfer(x + 0.5, y + 0.5, CELL_W - 1, CELL_H - 1, CUT)} fill="none"
            stroke={beat ? TC.beatLine : TC.line} strokeWidth={beat ? 1.5 : 1} />,
        );
        continue;
      }
      if (!playing) {
        cells.push(
          <polygon key={key} points={chamfer(x + 0.5, y + 0.5, CELL_W - 1, CELL_H - 1, CUT)} fill="url(#hatch)"
            stroke={TC.idle} strokeWidth={1} />,
        );
        continue;
      }
      const swung = scene.swing && s % 2 === 1;
      const dx = swung ? swingPx : 0;
      const accent = focusSwung ? swung : focused;
      if (swung) {
        cells.push(
          <polygon key={key + 'g'} points={chamfer(x + 0.75, y + 0.75, CELL_W - 1.5, CELL_H - 1.5, CUT)} fill="none"
            stroke="#A79C8A" strokeWidth={1.5} strokeDasharray="3 3" />,
        );
      }
      notes.push(<polygon key={key} points={chamfer(x + dx, y, CELL_W, CELL_H, CUT)} fill={accent ? TC.accent : TC.ink} />);
      // 타격 순간: 칸 테두리가 바깥으로 퍼짐
      const dt = now.t - (barStart + s * tl.stepSec + (swung ? tl.swingSec : 0));
      if (dt >= 0 && dt < POP_SEC) {
        const k = dt / POP_SEC;
        const g = 2 + 9 * k;
        pops.push(
          <polygon key={key + 'p'} points={chamfer(x + dx - g, y - g, CELL_W + 2 * g, CELL_H + 2 * g, CUT + g * 0.6)}
            fill="none" stroke={accent ? TC.accent : TC.ink} strokeWidth={2} opacity={1 - k} />,
        );
      }
    }
  });

  return (
    <>
      {/* 배경 안내선 */}
      {[40, 680].map((x) => (
        <div key={x} style={{position: 'absolute', left: x, top: 0, width: 1, height: 1280, background: TC.hair}} />
      ))}
      {[86, 330, 756].map((y) => (
        <div key={y} style={{position: 'absolute', left: 0, top: y, width: 720, height: 1, background: TC.hair}} />
      ))}

      {/* 머리 */}
      <Img src={staticFile('brand/wordmark.webp')} style={{position: 'absolute', left: 40, top: 100, height: 26}} />
      <div style={{position: 'absolute', right: 40, top: 105, fontFamily: MONO, fontSize: 14, color: TC.muted, letterSpacing: 1}}>
        DRUM PATTERN {String(tl.episode ?? 1).padStart(3, '0')}
      </div>

      {/* 학습 단계 */}
      <div style={{position: 'absolute', left: 40, top: 146, width: 640, display: 'flex', gap: 6}}>
        {lessons.map((s, i) => {
          const done = now.t >= s.end;
          const on = scene === s;
          const f = done ? 1 : on ? (now.t - s.start) / (s.end - s.start) : 0;
          return (
            <div key={i} style={{flex: 1}}>
              <div style={{fontFamily: MONO, fontSize: 13, letterSpacing: 1, color: on ? TC.accent : done ? TC.stripDone : TC.stripOff}}>
                {String(i + 1).padStart(2, '0')} {s.tag}
              </div>
              <div style={{marginTop: 6, height: 3, background: TC.stripTrack}}>
                <div style={{width: `${f * 100}%`, height: '100%', background: TC.accent}} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 제목 */}
      <div
        style={{
          position: 'absolute', left: 36, top: 192, fontFamily: SANS, fontWeight: 800, fontSize: tl.titleSize ?? 92,
          lineHeight: '100px', letterSpacing: -3, color: TC.title, whiteSpace: 'nowrap',
        }}
      >
        {tl.title}
      </div>
      <div style={{position: 'absolute', left: 40, top: 296, fontFamily: MONO, fontSize: 15, color: TC.muted, letterSpacing: 1, whiteSpace: 'nowrap'}}>
        {tl.bpm} BPM <span style={{color: TC.accent}}>◆</span> SWING {tl.swingMs}MS
        {kit && (
          <>
            {' '}<span style={{color: TC.accent}}>◆</span>{' '}
            <span style={{fontFamily: KR, fontWeight: 800, letterSpacing: 0}}>{kit}</span>
          </>
        )}
      </div>

      {/* 드럼 패널 */}
      <div style={{position: 'absolute', left: PANEL.x, top: PANEL.y, width: PANEL.w, height: panelH, background: TC.card, clipPath: cutCss(16)}} />
      <div
        style={{
          position: 'absolute', left: PANEL.x + 24, top: PANEL.y + 18, width: PANEL.w - 48, display: 'flex', alignItems: 'center',
          fontFamily: MONO, fontSize: 13, letterSpacing: 1, color: TC.ink,
        }}
      >
        <span>◇ STEP SEQUENCER</span>
        <Dots />
        <span>
          {barPre.toUpperCase()}<b>{patternBar + 1}</b>{barPost.toUpperCase()}
        </span>
      </div>
      <div style={{position: 'absolute', left: PANEL.x, top: PANEL.y + HEAD_H, width: PANEL.w, height: 1, background: TC.ink}} />

      {tl.tracks.map((track, r) => {
        const y = gridTop + r * ROW_H;
        const playing = scene.play.includes(track.id);
        const focused = Array.isArray(scene.focus) && scene.focus.includes(track.id);
        const barSteps = track.steps.filter((s) => Math.floor(s.step / 16) === patternBar);
        const marked = playing && (focused || (focusSwung && scene.swing && barSteps.some((s) => (s.step % 16) % 2 === 1)));
        return (
          <React.Fragment key={track.id}>
            {r > 0 && (
              <div style={{position: 'absolute', left: PANEL.x + 24, top: y - 12, width: PANEL.w - 48, height: 1, background: TC.line}} />
            )}
            <div style={{position: 'absolute', left: PANEL.x + 24, top: y + 6, color: playing ? TC.ink : TC.dimText}}>
              <div style={{fontFamily: SANS, fontWeight: 800, fontSize: 19, letterSpacing: 0.5, whiteSpace: 'nowrap'}}>
                {marked && <span style={{color: TC.accent, fontSize: 13, verticalAlign: 3}}>◆ </span>}
                {track.label.toUpperCase()}
              </div>
              <div style={{fontFamily: MONO, fontSize: 12, marginTop: 2, color: playing ? TC.muted : '#C6BDAE'}}>
                {String(r + 1).padStart(2, '0')}
              </div>
            </div>
          </React.Fragment>
        );
      })}

      <svg style={{position: 'absolute', left: 0, top: 0}} width={720} height={1280}>
        <defs>
          <pattern id="hatch" width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width={2} height={6} fill={TC.idle} />
          </pattern>
        </defs>
        {cells}
        {notes}
        {pops}
        {/* 눈금자 */}
        <line x1={PANEL.x + 24} x2={PANEL.x + PANEL.w - 24} y1={rulerY + 0.5} y2={rulerY + 0.5} stroke={TC.ink} strokeWidth={1} />
        {Array.from({length: 17}, (_, i) => {
          const x = X0 + i * STEP - 3 + 0.5;
          return <line key={i} x1={x} x2={x} y1={rulerY} y2={rulerY + (i % 4 === 0 ? 14 : 7)} stroke={TC.ink} strokeWidth={1} />;
        })}
      </svg>
      {[0, 1, 2, 3].map((b) => (
        <div key={b} style={{position: 'absolute', left: X0 + b * 4 * STEP + 1, top: rulerY + 3, fontFamily: MONO, fontWeight: 700, fontSize: 13, color: TC.ink}}>
          {b + 1}
        </div>
      ))}
      {scene.showSwingLabel && (
        <div style={{position: 'absolute', left: PANEL.x + 24, top: rulerY + 5, fontFamily: MONO, fontWeight: 700, fontSize: 13, color: TC.accent, whiteSpace: 'nowrap'}}>
          {tl.labels.swing.toUpperCase()}
        </div>
      )}

      {/* 재생선 */}
      <div style={{position: 'absolute', left: X0 + stepFloat * STEP - 4, top: gridTop - 14, width: 2, height: rows * ROW_H - 2, background: TC.accent}} />
      <div style={{position: 'absolute', left: X0 + stepFloat * STEP - 10, top: gridTop - 21, width: 14, height: 14, background: TC.accent, transform: 'rotate(45deg)'}} />

      {/* 재단 표시 */}
      <Corner x={PANEL.x + 10} y={PANEL.y + HEAD_H + 8} k="tl" />
      <Corner x={PANEL.x + PANEL.w - 24} y={PANEL.y + HEAD_H + 8} k="tr" />
      <Corner x={PANEL.x + 10} y={PANEL.y + panelH - 24} k="bl" />
      <Corner x={PANEL.x + PANEL.w - 24} y={PANEL.y + panelH - 24} k="br" />

      {/* 자막 카드 */}
      {capLines.length > 0 && (
        <div style={{opacity: appear, transform: `translateY(${(1 - appear) * 12}px)`}}>
          <div style={{position: 'absolute', left: 40, top: CAP_Y, width: 640, height: capCardH, background: TC.card, clipPath: cutCss(16)}} />
          <div
            style={{
              position: 'absolute', left: 64, top: CAP_Y + 18, width: 592, display: 'flex', alignItems: 'center',
              fontFamily: MONO, fontSize: 13, letterSpacing: 1, color: TC.ink,
            }}
          >
            <span style={{color: TC.accent}}>◆</span>
            <span style={{marginLeft: 8}}>{String(sceneIndex + 1).padStart(2, '0')} — {scene.tag}</span>
            <Dots />
            <span>{sceneIndex + 1}/{tl.scenes.length}</span>
          </div>
          <div style={{position: 'absolute', left: 40, top: CAP_Y + 48, width: 640, height: 1, background: TC.ink}} />
          {scene.cta ? (
            <div style={{position: 'absolute', left: 64, top: CAP_Y + 64, width: 592, display: 'flex', alignItems: 'center', gap: 18}}>
              <Img
                src={staticFile('brand/icon.webp')}
                style={{width: 72, height: 72, flex: 'none', transform: `scale(${0.4 + 0.6 * iconPop}) rotate(${(1 - iconPop) * -25}deg)`}}
              />
              <div style={{fontFamily: KR, fontWeight: 800, color: TC.ink, whiteSpace: 'nowrap', letterSpacing: -0.5}}>
                {capLines.map((l, i) => (
                  <div key={i} style={{fontSize: scene.ctaSizes?.[i] ?? (i === 0 ? 30 : 21), lineHeight: i === 0 ? 1.4 : 1.45}}>
                    <Accented text={l} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div
              style={{
                position: 'absolute', left: 64, top: CAP_Y + 64, width: 592, fontFamily: KR, fontWeight: 800,
                fontSize: capSize, lineHeight: 1.45, color: TC.ink, letterSpacing: -0.5, whiteSpace: 'nowrap',
              }}
            >
              {capLines.map((l, i) => (
                <div key={i}>
                  <Accented text={l} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};
