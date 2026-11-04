import {Scene, Timeline} from './types';

export type Now = {
  t: number;
  sceneIndex: number;
  scene: Scene;
  localT: number; // 장면 시작부터 지난 시간(초)
  barIdx: number; // 장면 안에서 몇 번째 마디(0부터)
  patternBar: number; // 패턴의 몇 번째 마디(0부터)
  stepFloat: number; // 마디 안 위치 (0 ~ 16)
};

export const getNow = (t: number, tl: Timeline): Now => {
  let sceneIndex = tl.scenes.findIndex((s) => t >= s.start && t < s.end);
  if (sceneIndex === -1) sceneIndex = t < 0 ? 0 : tl.scenes.length - 1;
  const scene = tl.scenes[sceneIndex];
  const localT = Math.min(Math.max(t - scene.start, 0), scene.bars * tl.barSec - 1e-6);
  const barIdx = Math.min(Math.floor(localT / tl.barSec), scene.bars - 1);
  const patternBar = (scene.startBar - 1 + barIdx) % tl.barsInPattern;
  const stepFloat = (localT - barIdx * tl.barSec) / tl.stepSec;
  return {t, sceneIndex, scene, localT, barIdx, patternBar, stepFloat};
};

// "**강조**" 표시를 [{text, accent}] 조각으로 나눈다
export const parseAccent = (line: string) =>
  line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part) =>
    part.startsWith('**') && part.endsWith('**')
      ? {text: part.slice(2, -2), accent: true}
      : {text: part, accent: false},
  );
