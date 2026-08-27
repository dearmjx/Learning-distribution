import fs from 'node:fs/promises';
import { FileBlob, PresentationFile } from '@oai/artifact-tool';

const src = 'C:/Users/woram/Downloads/White and Black Cute Minimalist Group Presentation.pptx';
const out = 'C:/Users/woram/OneDrive/Desktop/Hatairat/learn os/pptx_edit_tmp';
await fs.mkdir(out, { recursive: true });
const p = await PresentationFile.importPptx(await FileBlob.load(src));
const snap = await p.inspect({ kind: 'slide,textbox,shape,image,table,chart,notes,layout', maxChars: 50000 });
await fs.writeFile(`${out}/inspect.ndjson`, snap.ndjson);
for (const [i, slide] of p.slides.items.entries()) {
  const png = await p.export({ slide, format: 'png', scale: 1 });
  await fs.writeFile(`${out}/source-slide-${i+1}.png`, new Uint8Array(await png.arrayBuffer()));
  const layout = await slide.export({ format: 'layout' });
  await fs.writeFile(`${out}/source-slide-${i+1}.layout.json`, await layout.text());
}
const montage = await p.export({ format: 'webp', montage: true, scale: 1 });
await fs.writeFile(`${out}/source-montage.webp`, new Uint8Array(await montage.arrayBuffer()));
console.log(`slides=${p.slides.items.length}`);
console.log(snap.ndjson);
