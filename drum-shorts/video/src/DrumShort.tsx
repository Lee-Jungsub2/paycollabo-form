import React from 'react';
import {AbsoluteFill, Audio, getRemotionEnvironment, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont} from '@remotion/fonts';
import {Caption} from './Caption';
import {MC, Machine} from './Machine';
import {Header} from './Header';
import {StepGrid} from './StepGrid';
import {getNow} from './timing';
import {DEFAULT_THEME, Props} from './types';

loadFont({family: 'Jua', url: staticFile('fonts/Jua-Regular.ttf')});
loadFont({family: 'DotGothic16', url: staticFile('fonts/DotGothic16-Regular.ttf')});

export const DrumShort: React.FC<Props> = ({genre, timeline: tl}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (!tl) return null;

  const now = getNow(frame / fps, tl);
  const audio = getRemotionEnvironment().isStudio && <Audio src={staticFile(`render/${genre}/audio.wav`)} />;

  if (tl.style === 'classic') {
    // 처음 버전 (레퍼런스 스타일)
    const theme = {...DEFAULT_THEME, ...tl.theme};
    return (
      <AbsoluteFill style={{background: theme.bg, fontFamily: `'${theme.font}', sans-serif`, color: theme.ink}}>
        {audio}
        <Header tl={tl} now={now} theme={theme} />
        <StepGrid tl={tl} now={now} theme={theme} />
        <Caption now={now} theme={theme} />
      </AbsoluteFill>
    );
  }

  // 드럼머신 (기본)
  const theme = {
    ...DEFAULT_THEME, ink: MC.caption, accent: MC.accent, ctaBg: MC.body, ctaText: MC.ink, ...tl.theme,
  };
  return (
    <AbsoluteFill style={{background: MC.room, fontFamily: "'Jua', sans-serif"}}>
      {/* 미리보기(Studio)에서만 소리 재생 — 최종 MP4는 build.py 가 Python 오디오를 합친다 */}
      {audio}
      <Machine tl={tl} now={now} />
      <Caption now={now} theme={theme} icon="brand/icon.webp" />
    </AbsoluteFill>
  );
};
