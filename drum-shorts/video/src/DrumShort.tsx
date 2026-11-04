import React from 'react';
import {AbsoluteFill, Audio, getRemotionEnvironment, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont} from '@remotion/fonts';
import {Caption} from './Caption';
import {Header} from './Header';
import {StepGrid} from './StepGrid';
import {getNow} from './timing';
import {DEFAULT_THEME, Props} from './types';

loadFont({family: 'Jua', url: staticFile('fonts/Jua-Regular.ttf')});

export const DrumShort: React.FC<Props> = ({genre, timeline: tl}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (!tl) return null;

  const theme = {...DEFAULT_THEME, ...tl.theme};
  const now = getNow(frame / fps, tl);

  return (
    <AbsoluteFill style={{background: theme.bg, fontFamily: `'${theme.font}', sans-serif`, color: theme.ink}}>
      {/* 미리보기(Studio)에서만 소리 재생 — 최종 MP4는 build.py 가 Python 오디오를 합친다 */}
      {getRemotionEnvironment().isStudio && <Audio src={staticFile(`render/${genre}/audio.wav`)} />}
      <Header tl={tl} now={now} theme={theme} />
      <StepGrid tl={tl} now={now} theme={theme} />
      <Caption now={now} theme={theme} />
    </AbsoluteFill>
  );
};
