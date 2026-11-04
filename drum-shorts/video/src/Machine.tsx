import React from 'react';
import {Img, interpolate, staticFile} from 'remotion';
import {Now} from './timing';
import {Timeline} from './types';

// 드럼머신 컨셉 색상
export const MC = {
  room: '#2A2622', // 배경
  body: '#EFE6D8', // 기계 몸체
  bodyEdge: '#C9BBA6',
  btnA: '#E8DCCB',
  btnB: '#D9CBB6',
  btnShadow: '#B9A990',
  print: '#6B5F52', // 기계에 인쇄된 글씨
  printDim: '#B3A796',
  lcdBg: '#22301F',
  lcdEdge: '#121A10',
  lcdText: '#B8F27A',
  ledOff: '#CDBFAA', // 빈 칸
  ledIdle: '#A89A87', // 패턴은 있지만 소리 안 남
  ledOn: '#F7B733', // 소리 남
  accent: '#E8502E', // 강조(페이콜라보 로고 색 계열)
  ink: '#2A2622',
  caption: '#F4EDE4',
  track: '#4A433C',
};

const BODY = {left: 30, top: 150, width: 660, height: 600};
const X0 = 62; // 첫 버튼 왼쪽
const CW = 37; // 버튼 간격
const BTN_W = 31;
const ROW_TOP = 404;
const ROW_GAP = 102;
const POP_SEC = 0.16;

const Knob: React.FC<{x: number; label: string; value: string; angle: number; hot: boolean}> = ({x, label, value, angle, hot}) => (
  <div style={{position: 'absolute', left: x, top: 222, width: 84, textAlign: 'center'}}>
    <div
      style={{
        width: 72, height: 72, margin: '0 auto', borderRadius: 36, position: 'relative',
        background: 'radial-gradient(circle at 35% 30%, #4A4440, #1D1A17)',
        boxShadow: '0 4px 0 #9E8F7A',
      }}
    >
      <div
        style={{
          position: 'absolute', left: 34, top: 6, width: 4, height: 24, borderRadius: 2, background: MC.accent,
          transformOrigin: '2px 30px', transform: `rotate(${angle}deg)`,
        }}
      />
    </div>
    <div style={{marginTop: 6, fontSize: 15, color: MC.print, letterSpacing: 1}}>{label}</div>
    <div style={{fontSize: 18, color: hot ? MC.accent : MC.print}}>{value}</div>
  </div>
);

export const Machine: React.FC<{tl: Timeline; now: Now}> = ({tl, now}) => {
  const {scene, patternBar, barIdx, stepFloat} = now;
  const focusSwung = scene.focus === 'swung';
  const barStart = scene.start + barIdx * tl.barSec;
  const curStep = Math.min(15, Math.floor(stepFloat));
  const ledShift = Math.min(8, (tl.swingSec / tl.stepSec) * CW);

  // 진행바
  const segs = Array.from({length: tl.progressSegments}, (_, k) => {
    const sc = tl.scenes.find((s) => s.progress === k + 1);
    if (!sc || now.t < sc.start) return 0;
    return now.t >= sc.end ? 1 : (now.t - sc.start) / (sc.end - sc.start);
  });

  // 스윙 노브: 스윙 장면이 시작되면 돌아감
  const firstSwingLesson = tl.scenes.find((s) => s.showSwingLabel);
  const swingOn = scene.swing;
  const knobTurn = firstSwingLesson && scene === firstSwingLesson
    ? interpolate(now.localT, [0, 0.35], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
    : swingOn ? 1 : 0;

  // LCD 제목 크기 (영문 0.5em, 한글 1em 폭으로 계산)
  const titleEm = [...tl.title].reduce((a, ch) => a + (ch.charCodeAt(0) < 128 ? 0.5 : 1), 0);
  const titleSize = Math.min(60, 352 / Math.max(titleEm, 1));
  const [barPre, barPost] = tl.labels.bar.replace('{total}', String(tl.barsInPattern)).split('{n}');
  const kit = tl.info.slice(1).join(' · ');

  return (
    <>
      {tl.progressSegments > 0 && (
        <div style={{position: 'absolute', top: 112, left: 40, right: 40, display: 'flex', gap: 8}}>
          {segs.map((f, i) => (
            <div key={i} style={{flex: 1, height: 6, borderRadius: 3, background: MC.track, overflow: 'hidden'}}>
              <div style={{width: `${f * 100}%`, height: '100%', background: MC.accent}} />
            </div>
          ))}
        </div>
      )}

      {/* 기계 몸체 */}
      <div
        style={{
          position: 'absolute', ...BODY, borderRadius: 28, background: MC.body,
          boxShadow: `0 14px 0 ${MC.bodyEdge}, 0 30px 60px rgba(0,0,0,.45)`,
        }}
      />
      <Img src={staticFile('brand/wordmark.webp')} style={{position: 'absolute', left: 58, top: 166, height: 42}} />
      {kit && (
        <div style={{position: 'absolute', right: 60, top: 178, fontSize: 18, color: MC.print}}>{kit}</div>
      )}

      {/* LCD */}
      <div
        style={{
          position: 'absolute', left: 60, top: 222, width: 400, height: 122, borderRadius: 12, background: MC.lcdBg,
          boxShadow: `inset 0 0 0 4px ${MC.lcdEdge}`, padding: '12px 20px', color: MC.lcdText,
          fontFamily: "'DotGothic16', 'Jua', monospace", textShadow: `0 0 8px ${MC.lcdText}88`, overflow: 'hidden',
        }}
      >
        <div style={{fontSize: titleSize, lineHeight: '64px', whiteSpace: 'nowrap', letterSpacing: 1}}>{tl.title}</div>
        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 21, marginTop: 4}}>
          <span>{tl.info[0] ?? ''}</span>
          <span>
            {barPre.toUpperCase()}
            {patternBar + 1}
            {barPost.toUpperCase()}
          </span>
        </div>
      </div>

      <Knob x={478} label="TEMPO" value={`${tl.bpm}`} angle={35} hot={false} />
      <Knob
        x={578} label="SWING" angle={-120 + 150 * knobTurn} hot={swingOn}
        value={swingOn ? (scene.showSwingLabel ? tl.labels.swing : `${tl.swingMs}ms`) : 'OFF'}
      />

      {/* 스텝 버튼 */}
      {tl.tracks.map((track, r) => {
        const y = ROW_TOP + r * ROW_GAP;
        const playing = scene.play.includes(track.id);
        const barSteps = track.steps.filter((s) => Math.floor(s.step / 16) === patternBar);
        const hasSwung = scene.swing && barSteps.some((s) => (s.step % 16) % 2 === 1);
        const focused = Array.isArray(scene.focus) && scene.focus.includes(track.id);
        const dot = playing && (focused || (focusSwung && hasSwung));

        return (
          <React.Fragment key={track.id}>
            <div style={{position: 'absolute', left: X0, top: y - 34, fontSize: 22, color: playing ? MC.ink : MC.printDim}}>
              {dot && <span style={{color: MC.accent}}>● </span>}
              {track.label}
            </div>
            {Array.from({length: 16}, (_, s) => {
              const hit = barSteps.find((n) => n.step % 16 === s);
              const swung = !!hit && scene.swing && s % 2 === 1;
              const hitTime = barStart + s * tl.stepSec + (swung ? tl.swingSec : 0);
              const dt = now.t - hitTime;
              const pop = hit && playing && dt >= 0 && dt < POP_SEC ? 1 - dt / POP_SEC : 0;
              const isCur = s === curStep;
              const accent = playing && hit && (focusSwung ? swung : focused);
              const led = !hit ? MC.ledOff : !playing ? MC.ledIdle : accent ? MC.accent : MC.ledOn;
              const glow = hit && playing ? `0 0 ${10 + 14 * pop}px ${accent ? MC.accent : MC.ledOn}` : 'none';
              const press = 3 * pop;
              const bx = X0 + s * CW;
              return (
                <React.Fragment key={s}>
                  <div
                    style={{
                      position: 'absolute', left: bx, top: y + press, width: BTN_W, height: 52, borderRadius: 7,
                      background: Math.floor(s / 4) % 2 ? MC.btnB : MC.btnA,
                      boxShadow: `0 ${4 - press}px 0 ${MC.btnShadow}${isCur ? `, inset 0 0 0 3px ${MC.ink}` : ''}`,
                    }}
                  />
                  {swung && (
                    <div
                      style={{
                        position: 'absolute', left: bx + BTN_W / 2 - 8, top: y + 18 + press, width: 16, height: 16,
                        borderRadius: 8, border: `1.5px dashed ${MC.print}`, boxSizing: 'border-box',
                      }}
                    />
                  )}
                  <div
                    style={{
                      position: 'absolute', left: bx + BTN_W / 2 - 7 + (swung ? ledShift : 0), top: y + 19 + press,
                      width: 14, height: 14, borderRadius: 7, background: led, boxShadow: glow,
                    }}
                  />
                </React.Fragment>
              );
            })}
          </React.Fragment>
        );
      })}

      {/* 박 번호 */}
      {[0, 1, 2, 3].map((b) => (
        <div
          key={b}
          style={{
            position: 'absolute', left: X0 + b * 4 * CW, width: BTN_W, textAlign: 'center',
            top: ROW_TOP + 2 * ROW_GAP + 70, fontSize: 17, color: MC.ink,
          }}
        >
          {b + 1}박
        </div>
      ))}
      {tl.site && (
        <div style={{position: 'absolute', right: 62, top: ROW_TOP + 2 * ROW_GAP + 72, fontSize: 15, color: MC.printDim}}>
          {tl.site}
        </div>
      )}
    </>
  );
};
