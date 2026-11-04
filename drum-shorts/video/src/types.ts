export type Step = {step: number; vel: number};
export type Track = {id: string; label: string; steps: Step[]};

export type Scene = {
  name: string;
  start: number;
  end: number;
  bars: number;
  startBar: number;
  play: string[];
  swing: boolean;
  focus: string[] | 'swung';
  progress: number;
  showSwingLabel: boolean;
  caption: string | null;
  cta: string[] | null;
  captionSize: number | null; // Python이 글자 폭에 맞춰 계산한 크기
  ctaSizes: number[] | null;
};

export type Timeline = {
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  totalSec: number;
  bpm: number;
  barSec: number;
  stepSec: number;
  swingMs: number;
  swingSec: number;
  barsInPattern: number;
  title: string;
  site: string;
  info: string[];
  labels: {bar: string; swing: string};
  theme: Partial<Theme>;
  progressSegments: number;
  tracks: Track[];
  scenes: Scene[];
};

export type Theme = {
  bg: string;
  ink: string;
  muted: string;
  track: string;
  line: string;
  empty: string;
  beat: string;
  note: string;
  accent: string;
  ghost: string;
  dimText: string;
  ctaBg: string;
  ctaText: string;
  font: string;
};

// 시안 A (베이지 + 주아) + 페이콜라보 오렌지
export const DEFAULT_THEME: Theme = {
  bg: '#E2E0DA',
  ink: '#111111',
  muted: '#8A8A86',
  track: '#C9C7C1',
  line: '#C5C3BD',
  empty: '#BDBBB5',
  beat: '#C6C4BE',
  note: '#9FD3EE',
  accent: '#F55B2C',
  ghost: '#C2C0BA',
  dimText: '#B5B3AD',
  ctaBg: '#111111',
  ctaText: '#FFFFFF',
  font: 'Jua',
};

export type Props = {genre: string; timeline?: Timeline};
