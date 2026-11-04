import React from 'react';
import {CalculateMetadataFunction, Composition, staticFile} from 'remotion';
import {DrumShort} from './DrumShort';
import {Props, Timeline} from './types';

// Python(render_audio.py)이 만든 timeline.json 을 읽어서 길이·내용을 정한다.
const calculateMetadata: CalculateMetadataFunction<Props> = async ({props}) => {
  const res = await fetch(staticFile(`render/${props.genre}/timeline.json`));
  if (!res.ok) {
    throw new Error(
      `render/${props.genre}/timeline.json 이 없어요. 먼저 build.py 로 오디오를 만들어 주세요.`,
    );
  }
  const timeline: Timeline = await res.json();
  return {
    durationInFrames: timeline.durationInFrames,
    fps: timeline.fps,
    width: timeline.width,
    height: timeline.height,
    props: {...props, timeline},
  };
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="DrumShort"
    component={DrumShort}
    width={720}
    height={1280}
    fps={30}
    durationInFrames={300}
    defaultProps={{genre: 'uk-garage'} as Props}
    calculateMetadata={calculateMetadata}
  />
);
