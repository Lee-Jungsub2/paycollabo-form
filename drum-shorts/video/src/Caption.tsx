import React from 'react';
import {Img, interpolate, spring, staticFile, useVideoConfig} from 'remotion';
import {Now, parseAccent} from './timing';
import {Theme} from './types';

const Line: React.FC<{text: string; theme: Theme}> = ({text, theme}) => (
  <div>
    {parseAccent(text).map((p, i) => (
      <span key={i} style={{color: p.accent ? theme.accent : undefined}}>
        {p.text}
      </span>
    ))}
  </div>
);

// 장면별 자막 / 마지막 안내 박스
export const Caption: React.FC<{now: Now; theme: Theme; icon?: string}> = ({now, theme, icon}) => {
  const {scene, localT} = now;
  const {fps} = useVideoConfig();
  const appear = interpolate(localT, [0, 0.2], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const style: React.CSSProperties = {
    position: 'absolute', left: 40, right: 40, top: 790, height: 170,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    opacity: appear, transform: `translateY(${(1 - appear) * 12}px)`,
  };

  if (scene.cta) {
    const [first, ...rest] = scene.cta;
    const pop = spring({frame: Math.round(localT * fps), fps, config: {damping: 9, stiffness: 140}});
    return (
      <div style={style}>
        <div
          style={{
            background: theme.ctaBg, color: theme.ctaText, borderRadius: 18, width: icon ? 600 : 546,
            padding: '18px 20px 16px', whiteSpace: 'nowrap', lineHeight: 1.25,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18,
          }}
        >
          {icon && (
            <Img
              src={staticFile(icon)}
              style={{width: 84, height: 84, flex: 'none', transform: `scale(${0.4 + 0.6 * pop}) rotate(${(1 - pop) * -25}deg)`}}
            />
          )}
          <div style={{textAlign: icon ? 'left' : 'center'}}>
            <div style={{fontSize: scene.ctaSizes?.[0] ?? 38}}>
              <Line text={first} theme={theme} />
            </div>
            {rest.map((l, i) => (
              <div key={i} style={{fontSize: scene.ctaSizes?.[i + 1] ?? 27}}>
                <Line text={l} theme={theme} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!scene.caption) return null;
  return (
    <div style={{...style, textAlign: 'center', fontSize: scene.captionSize ?? 40, lineHeight: 1.3, color: theme.ink, whiteSpace: 'nowrap'}}>
      <div>
        {scene.caption.split('\n').map((l, i) => (
          <Line key={i} text={l} theme={theme} />
        ))}
      </div>
    </div>
  );
};
