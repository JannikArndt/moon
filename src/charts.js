import {TAU,R2D,sin,clamp,jd,moonPos} from "./astro.js";
import {S,T,fmt,buildFullMoons} from "./state.js";
import {fit} from "./draw.js";

/* ─────────────── drawer graphics ─────────────── */
export let yearBars=[];
export function renderYearChart(){
  const c=document.getElementById("ychart"); if(!c) return;
  const {ctx,w,h}=fit(c);
  ctx.fillStyle="#0D1424"; ctx.fillRect(0,0,w,h);
  const fm=buildFullMoons().list; if(!fm.length) return;
  const L=26,Rp=26,Tp=12,B=22, pw=w-L-Rp, ph=h-Tp-B;
  const dmin=Math.min(...fm.map(f=>f.diam))-0.4, dmax=Math.max(...fm.map(f=>f.diam))+0.4;
  const amin=Math.min(0,Math.min(...fm.map(f=>f.maxAlt))-6), amax=Math.max(...fm.map(f=>f.maxAlt))+6;
  ctx.font="8px ui-monospace,monospace";
  for(let i=0;i<=3;i++){
    const y=Tp+ph*i/3;
    ctx.strokeStyle="rgba(255,255,255,0.09)"; ctx.beginPath(); ctx.moveTo(L,y); ctx.lineTo(w-Rp,y); ctx.stroke();
    ctx.fillStyle="#BCD2F2"; ctx.fillText((dmax-(dmax-dmin)*i/3).toFixed(1)+"′",1,y+3);
    ctx.fillStyle="#E4863C"; ctx.textAlign="right";
    ctx.fillText(Math.round(amax-(amax-amin)*i/3)+"°",w-2,y+3); ctx.textAlign="left";
  }
  const bw=pw/fm.length*0.5; yearBars=[];
  fm.forEach((f,i)=>{
    const x=L+pw*(i+0.5)/fm.length, y=Tp+ph*(1-(f.diam-dmin)/(dmax-dmin));
    ctx.fillStyle="rgba(188,210,242,0.7)"; ctx.fillRect(x-bw/2,y,bw,Tp+ph-y);
    yearBars.push({x0:x-pw/fm.length/2,x1:x+pw/fm.length/2,ms:f.ms});
    ctx.fillStyle="#7F8CAB"; ctx.textAlign="center";
    ctx.fillText(fmt(f.ms,S.tz,{month:'short'}),x,h-6); ctx.textAlign="left";
  });
  ctx.strokeStyle="#E4863C"; ctx.lineWidth=1.7; ctx.beginPath();
  fm.forEach((f,i)=>{
    const x=L+pw*(i+0.5)/fm.length, y=Tp+ph*(1-(f.maxAlt-amin)/(amax-amin));
    i?ctx.lineTo(x,y):ctx.moveTo(x,y);
  });
  ctx.stroke();
}
export function renderTilt(){
  const c=document.getElementById("tilt"); if(!c) return;
  const {ctx,w,h}=fit(c);
  ctx.fillStyle="#0D1424"; ctx.fillRect(0,0,w,h);
  const m=moonPos(jd(T)), cy=h*0.55, amp=h*0.28;
  ctx.strokeStyle="rgba(255,214,130,0.35)"; ctx.setLineDash([4,4]); ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(w*0.05,cy); ctx.lineTo(w*0.95,cy); ctx.stroke(); ctx.setLineDash([]);
  ctx.font="8px ui-monospace,monospace"; ctx.fillStyle="#7F8CAB";
  ctx.fillText("Earth–Sun plane",w*0.05,cy-5);
  const F0=m.F;                    // the real argument of latitude, not an asin guess
  ctx.strokeStyle="rgba(188,210,242,0.45)"; ctx.lineWidth=1.4; ctx.beginPath();
  for(let i=0;i<=120;i++){
    const t=i/120, x=w*0.05+w*0.90*t, y=cy-amp*sin(F0+360*t-180);
    i?ctx.lineTo(x,y):ctx.moveTo(x,y);
  }
  ctx.stroke();
  ctx.fillStyle="#3E7FB8"; ctx.beginPath(); ctx.arc(w*0.50,cy,6,0,TAU); ctx.fill();
  const my=cy-amp*sin(F0);
  ctx.fillStyle="#E9E7DF"; ctx.beginPath(); ctx.arc(w*0.68,my,4,0,TAU); ctx.fill();
  ctx.strokeStyle="rgba(233,231,223,0.3)"; ctx.setLineDash([2,2]);
  ctx.beginPath(); ctx.moveTo(w*0.68,cy); ctx.lineTo(w*0.68,my); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle="#BCD2F2"; ctx.font="9px ui-monospace,monospace";
  ctx.fillText(`${m.bet>=0?"+":""}${m.bet.toFixed(1)}° off the plane`,w*0.68+8,my+3);
}

