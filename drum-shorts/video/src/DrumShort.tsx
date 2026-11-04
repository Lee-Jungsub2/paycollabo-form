import React from 'react';
import {AbsoluteFill, Audio, getRemotionEnvironment, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont} from '@remotion/fonts';
import {Caption} from './Caption';
import {MC, Machine} from './Machine';
import {TC, Tech} from './Tech';
import {Header} from './Header';
import {StepGrid} from './StepGrid';
import {getNow, Now} from './timing';
import {DEFAULT_THEME, Props, Timeline} from './types';

loadFont({family: 'Jua', url: staticFile('fonts/Jua-Regular.ttf')});
loadFont({family: 'DotGothic16', url: staticFile('fonts/DotGothic16-Regular.ttf')});
loadFont({family: 'Inter Tight', url: staticFile('fonts/InterTight-ExtraBold.ttf'), weight: '800'});
loadFont({family: 'JetBrains Mono', url: staticFile('fonts/JetBrainsMono-Medium.ttf'), weight: '400'});
loadFont({family: 'JetBrains Mono', url: staticFile('fonts/JetBrainsMono-Bold.ttf'), weight: '700'});
loadFont({family: 'Noto Sans KR', url: staticFile('fonts/NotoSansKR-ExtraBold.ttf'), weight: '800'});

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

  if (tl.style === 'machine') {
    return <MachineStyle tl={tl} now={now} audio={audio} />;
  }

  // 각진 테크니컬 (기본)
  return (
    <AbsoluteFill style={{background: TC.room}}>
      {/* 미리보기(Studio)에서만 소리 재생 — 최종 MP4는 build.py 가 Python 오디오를 합친다 */}
      {audio}
      <Tech tl={tl} now={now} />
    </AbsoluteFill>
  );
};

// 드럼머신
const MachineStyle: React.FC<{tl: Timeline; now: Now; audio: React.ReactNode}> = ({tl, now, audio}) => {
  const theme = {
    ...DEFAULT_THEME, ink: MC.caption, accent: MC.accent, ctaBg: MC.body, ctaText: MC.ink, ...tl.theme,
  };
  return (
    <AbsoluteFill style={{background: MC.room, fontFamily: "'Jua', sans-serif"}}>
      {audio}
      <Machine tl={tl} now={now} />
      <Caption now={now} theme={theme} icon="brand/icon.webp" />
    </AbsoluteFill>
  );
};
