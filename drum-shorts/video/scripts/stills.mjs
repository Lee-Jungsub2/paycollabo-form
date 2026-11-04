// 장면별 캡처: node scripts/stills.mjs <장르> <출력폴더> <프레임,프레임,...>
import path from 'node:path';
import fs from 'node:fs';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';

const [genre, outDir, framesArg] = process.argv.slice(2);
const frames = framesArg.split(',').map(Number);
const browserExecutable = process.env.REMOTION_BROWSER || null;
fs.mkdirSync(outDir, {recursive: true});

const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const inputProps = {genre};
const composition = await selectComposition({serveUrl, id: 'DrumShort', inputProps, browserExecutable, logLevel: 'error'});
for (const frame of frames) {
  await renderStill({
    composition, serveUrl, inputProps, frame, browserExecutable,
    output: path.join(outDir, `frame_${frame}.jpg`), imageFormat: 'jpeg', jpegQuality: 85, logLevel: 'error',
  });
}
console.log(`장면 캡처 ${frames.length}장 완료`);
