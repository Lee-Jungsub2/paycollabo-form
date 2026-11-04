import React from 'react';
import {Now} from './timing';
import {Theme, Timeline} from './types';

// 상단: 진행바 · 사이트 배지 · 장르 제목 · 정보줄
export const Header: React.FC<{tl: Timeline; now: Now; theme: Theme}> = ({tl, now, theme}) => {
  const segs = Array.from({length: tl.progressSegments}, (_, k) => {
    const sc = tl.scenes.find((s) => s.progress === k + 1);
    if (!sc) return 0;
    if (now.t >= sc.end) return 1;
    if (now.t < sc.start) return 0;
    return (now.t - sc.start) / (sc.end - sc.start);
  });

  return (
    <>
      {tl.progressSegments > 0 && (
        <div style={{position: 'absolute', top: 141, left: 60, right: 60, display: 'flex', gap: 8}}>
          {segs.map((f, i) => (
            <div key={i} style={{flex: 1, height: 6, borderRadius: 3, background: theme.track, overflow: 'hidden'}}>
              <div style={{width: `${f * 100}%`, height: '100%', background: theme.ink}} />
            </div>
          ))}
        </div>
      )}

      {tl.site && (
        <div
          style={{
            position: 'absolute', top: 172, left: '50%', transform: 'translateX(-50%)',
            border: `2.5px solid ${theme.ink}`, borderRadius: 22, padding: '5px 22px 3px',
            fontSize: 22, whiteSpace: 'nowrap', color: theme.ink,
          }}
        >
          {tl.site}
        </div>
      )}

      <div
        style={{
          position: 'absolute', top: 226, left: 0, right: 0, textAlign: 'center',
          fontSize: 118, lineHeight: 1, letterSpacing: 1, color: theme.ink, whiteSpace: 'nowrap',
        }}
      >
        {tl.title}
      </div>

      <div style={{position: 'absolute', top: 362, left: 0, right: 0, textAlign: 'center', fontSize: 27, color: theme.ink}}>
        {tl.info.map((item, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span style={{color: theme.muted, margin: '0 10px'}}>|</span>}
            {item}
          </React.Fragment>
        ))}
      </div>
    </>
  );
};
