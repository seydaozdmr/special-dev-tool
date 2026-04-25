const { app, BrowserWindow } = require('electron');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ICONSET = path.join(__dirname, 'icon.iconset');
const MASTER = path.join(ICONSET, 'master.png');

const FILES = [
  { size: 16,   name: 'icon_16x16.png' },
  { size: 32,   name: 'icon_16x16@2x.png' },
  { size: 32,   name: 'icon_32x32.png' },
  { size: 64,   name: 'icon_32x32@2x.png' },
  { size: 128,  name: 'icon_128x128.png' },
  { size: 256,  name: 'icon_128x128@2x.png' },
  { size: 256,  name: 'icon_256x256.png' },
  { size: 512,  name: 'icon_256x256@2x.png' },
  { size: 512,  name: 'icon_512x512.png' },
  { size: 1024, name: 'icon_512x512@2x.png' },
];

function iconHTML() {
  const s = 1024, r = 224;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0;width:${s}px;height:${s}px;overflow:hidden;background:transparent;}canvas{display:block;}</style>
</head><body><canvas id="c" width="${s}" height="${s}"></canvas>
<script>
(function(){
const c=document.getElementById('c'),ctx=c.getContext('2d'),s=1024,r=224;

function rrect(x,y,w,h,rad){
  ctx.beginPath();
  ctx.moveTo(x+rad,y);ctx.arcTo(x+w,y,x+w,y+h,rad);
  ctx.arcTo(x+w,y+h,x,y+h,rad);ctx.arcTo(x,y+h,x,y,rad);
  ctx.arcTo(x,y,x+w,y,rad);ctx.closePath();
}

/* clip */
rrect(0,0,s,s,r);ctx.clip();

/* background */
const bg=ctx.createLinearGradient(0,0,s*0.6,s);
bg.addColorStop(0,'#0c1220');bg.addColorStop(0.45,'#101828');bg.addColorStop(1,'#080e1a');
ctx.fillStyle=bg;ctx.fillRect(0,0,s,s);

/* dot grid */
for(let gx=102;gx<s;gx+=102){
  for(let gy=102;gy<s;gy+=102){
    ctx.beginPath();ctx.arc(gx,gy,4,0,Math.PI*2);
    ctx.fillStyle='rgba(255,255,255,0.045)';ctx.fill();
  }
}

/* center glow */
const gl=ctx.createRadialGradient(s/2,s*0.52,0,s/2,s*0.52,520);
gl.addColorStop(0,'rgba(74,158,255,0.20)');
gl.addColorStop(0.55,'rgba(74,158,255,0.07)');
gl.addColorStop(1,'rgba(74,158,255,0)');
ctx.fillStyle=gl;ctx.fillRect(0,0,s,s);

/* top bar */
const bar=ctx.createLinearGradient(0,0,0,140);
bar.addColorStop(0,'rgba(255,255,255,0.11)');bar.addColorStop(1,'rgba(255,255,255,0.03)');
ctx.fillStyle=bar;ctx.fillRect(0,0,s,140);
ctx.strokeStyle='rgba(255,255,255,0.09)';ctx.lineWidth=1;
ctx.beginPath();ctx.moveTo(0,140);ctx.lineTo(s,140);ctx.stroke();

/* traffic lights */
[[140,'#ff5f57'],[254,'#febc2e'],[368,'#28c840']].forEach(([dx,col])=>{
  const dY=70,dR=43;
  ctx.beginPath();ctx.arc(dx,dY,dR,0,Math.PI*2);
  ctx.fillStyle=col;ctx.fill();
  ctx.beginPath();ctx.arc(dx,dY,dR,0,Math.PI*2);
  ctx.strokeStyle='rgba(0,0,0,0.18)';ctx.lineWidth=4;ctx.stroke();
  /* inner gloss */
  const gl2=ctx.createRadialGradient(dx-dR*0.25,dY-dR*0.25,0,dx,dY,dR);
  gl2.addColorStop(0,'rgba(255,255,255,0.35)');gl2.addColorStop(1,'rgba(255,255,255,0)');
  ctx.beginPath();ctx.arc(dx,dY,dR,0,Math.PI*2);ctx.fillStyle=gl2;ctx.fill();
});

/* </> symbol */
ctx.save();
ctx.font='800 340px "SF Mono","Fira Code","Cascadia Code","Menlo","Courier New",monospace';
ctx.textAlign='center';ctx.textBaseline='middle';

ctx.shadowColor='rgba(74,158,255,0.95)';ctx.shadowBlur=60;
const tg=ctx.createLinearGradient(s*0.12,400,s*0.88,620);
tg.addColorStop(0,'#b8dcff');tg.addColorStop(0.35,'#4a9eff');
tg.addColorStop(0.7,'#1f6ad4');tg.addColorStop(1,'#6ab8ff');
ctx.fillStyle=tg;
ctx.fillText('</>',s/2,s*0.50);

ctx.shadowBlur=0;ctx.globalAlpha=0.28;ctx.fillStyle='#fff';
ctx.fillText('</>',s/2,s*0.50);ctx.globalAlpha=1;
ctx.restore();

/* bottom pills */
const pills=['JSON','XML','Regex','Diff'];
const pillW=128,pillH=48,pillR=24,gap=20;
const totalPW=pills.length*pillW+(pills.length-1)*gap;
let px=s/2-totalPW/2;
const py=780;
pills.forEach(label=>{
  ctx.beginPath();
  ctx.moveTo(px+pillR,py);ctx.arcTo(px+pillW,py,px+pillW,py+pillH,pillR);
  ctx.arcTo(px+pillW,py+pillH,px,py+pillH,pillR);ctx.arcTo(px,py+pillH,px,py,pillR);
  ctx.arcTo(px,py,px+pillW,py,pillR);ctx.closePath();
  ctx.fillStyle='rgba(74,158,255,0.13)';ctx.fill();
  ctx.strokeStyle='rgba(74,158,255,0.40)';ctx.lineWidth=2;ctx.stroke();
  ctx.font='600 22px "SF Mono","Menlo",monospace';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='rgba(100,180,255,0.92)';
  ctx.fillText(label,px+pillW/2,py+pillH/2);
  px+=pillW+gap;
});

/* inner border */
rrect(0,0,s,s,r);
ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=12;ctx.stroke();

})();
</script></body></html>`;
}

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');

app.whenReady().then(async () => {
  if (!fs.existsSync(ICONSET)) fs.mkdirSync(ICONSET, { recursive: true });

  const win = new BrowserWindow({
    width: 1024, height: 1024,
    show: false, frame: false, transparent: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(iconHTML()));
  await new Promise(r => setTimeout(r, 1000));

  const img = await win.webContents.capturePage({ x: 0, y: 0, width: 1024, height: 1024 });
  fs.writeFileSync(MASTER, img.toPNG());
  console.log('✓ master.png (1024px) rendered');
  win.destroy();

  // Resize all sizes with sips
  for (const { size, name } of FILES) {
    const dest = path.join(ICONSET, name);
    execSync(`sips -z ${size} ${size} "${MASTER}" --out "${dest}" > /dev/null 2>&1`);
    console.log(`✓ ${name} (${size}px)`);
  }

  fs.unlinkSync(MASTER);

  // Build .icns
  const icnsOut = path.join(__dirname, 'icon.icns');
  execSync(`iconutil -c icns "${ICONSET}" -o "${icnsOut}"`);
  console.log(`\n✅ icon.icns created → build/icon.icns`);

  app.quit();
});
