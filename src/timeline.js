import {TAU,clamp} from "./astro.js";
import {S,T,T0,DAY,yearStart,yearEnd,fmt,tzOff,ageAt,lensPhases,principalPhases,phaseName} from "./state.js";
import {HOTS,hotDot,fit,litPath} from "./draw.js";

/* ─────────────── the year timeline, magnified around today ─────────────── */
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export let tlMap=null;
function buildMap(w){
  const a=clamp(T-14*DAY,yearStart,yearEnd), b=clamp(T+14*DAY,yearStart,yearEnd);
  const lensW=w*0.56, out=w-lensW;
  const dl=a-yearStart, dr=yearEnd-b, dt=dl+dr;
  const wl=dt>0?out*dl/dt:0, wr=out-wl;
  return {a,b,wl,lensW,wr,
    x:ms=>ms<=a ? (dl>0?(ms-yearStart)/dl*wl:0)
        : ms>=b ? wl+lensW+(dr>0?(ms-b)/dr*wr:0)
        : wl+(ms-a)/(b-a)*lensW,
    inv:px=>px<=wl ? (dl>0?yearStart+px/wl*dl:yearStart)
         : px>=wl+lensW ? (dr>0?b+(px-wl-lensW)/wr*dr:yearEnd)
         : a+(px-wl)/lensW*(b-a)};
}
function glyph(ctx,cx,cy,r,k,wax){
  ctx.beginPath(); ctx.arc(cx,cy,r,0,TAU);
  ctx.fillStyle="rgba(120,140,180,0.20)"; ctx.fill();
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(wax?0:Math.PI);
  litPath(ctx,r,k); ctx.fillStyle="#E9E7DF"; ctx.fill(); ctx.restore();
  ctx.beginPath(); ctx.arc(cx,cy,r,0,TAU);
  ctx.strokeStyle="rgba(206,222,250,0.45)"; ctx.lineWidth=0.8; ctx.stroke();
}
export function renderTimeline(){
  const c=document.getElementById("tl");
  const {ctx,w,h}=fit(c);
  tlMap=buildMap(w); HOTS.tl.length=0;
  const M=tlMap, yr=new Date(T).getUTCFullYear();
  ctx.fillStyle="#0C1322"; ctx.fillRect(0,0,w,h);
  const gy=11, ty=h-19, ly=h-4;

  // compressed wings
  ctx.fillStyle="rgba(255,255,255,0.03)";
  ctx.fillRect(0,ty-6,M.wl,12); ctx.fillRect(M.wl+M.lensW,ty-6,M.wr,12);
  ctx.font="8px ui-monospace,monospace"; ctx.textAlign="center"; ctx.fillStyle="rgba(190,212,244,0.42)";
  for(let mo=0;mo<12;mo++){
    const a=M.x(Date.UTC(yr,mo,1)), b=M.x(Date.UTC(yr,mo+1,1));
    if(b-a<13) continue;
    if(a>M.wl-2&&b<M.wl+M.lensW+2) continue;
    ctx.strokeStyle="rgba(255,255,255,0.10)";
    ctx.beginPath(); ctx.moveTo(a,ty-6); ctx.lineTo(a,ty+6); ctx.stroke();
    ctx.fillText(MON[mo][0],(a+b)/2,ly);
  }
  // magnified fortnight
  ctx.fillStyle="rgba(188,210,242,0.06)"; ctx.fillRect(M.wl,ty-8,M.lensW,16);
  const perDay=M.lensW/28, every=Math.max(1,Math.ceil(30/perDay));
  const tzo=tzOff(T,S.tz);
  for(let d=Math.ceil((M.a+tzo)/DAY)*DAY-tzo; d<=M.b; d+=DAY){
    const x=M.x(d), dt=new Date(d+tzo);
    const first=dt.getUTCDate()===1;
    ctx.strokeStyle=first?"rgba(255,255,255,0.30)":"rgba(255,255,255,0.13)";
    ctx.beginPath(); ctx.moveTo(x,ty-8); ctx.lineTo(x,ty+(first?8:5)); ctx.stroke();
    if(dt.getUTCDate()%every===0||first){
      ctx.fillStyle=first?"rgba(233,231,223,0.8)":"rgba(190,212,244,0.6)";
      ctx.fillText(first?dt.getUTCDate()+" "+MON[dt.getUTCMonth()]:String(dt.getUTCDate()),x+perDay/2,ly);
    }
  }
  ctx.strokeStyle="rgba(255,255,255,0.18)";
  ctx.beginPath(); ctx.moveTo(0,ty+8); ctx.lineTo(w,ty+8); ctx.stroke();

  // phases: every day inside the lens, new and full outside
  for(const p of lensPhases(M.a,M.b)){
    const x=M.x(p.ms); glyph(ctx,x,gy,4.6,p.k,p.wax);
    hotDot("tl",x,gy,6,fmt(p.ms,S.tz,{weekday:'short',day:'2-digit',month:'short'})+" — "+
      phaseName(ageAt(p.ms))+", "+(p.k*100).toFixed(0)+"% lit");
  }
  hotDot("tl",M.wl+M.lensW/2,ty,M.lensW/2,"The fortnight either side of the selected moment, magnified");
  if(M.wl>14) hotDot("tl",M.wl/2,ty,M.wl/2,"The rest of the year before, compressed");
  if(M.wr>14) hotDot("tl",M.wl+M.lensW+M.wr/2,ty,M.wr/2,"The rest of the year after, compressed");
  const pp=principalPhases();
  for(const ms of pp.full){ const x=M.x(ms); if(x>M.wl-4&&x<M.wl+M.lensW+4) continue;
    glyph(ctx,x,gy,3.2,1,true); hotDot("tl",x,gy,5,"Full moon, "+fmt(ms,S.tz,{day:'2-digit',month:'short'})); }
  for(const ms of pp.neu){ const x=M.x(ms); if(x>M.wl-4&&x<M.wl+M.lensW+4) continue;
    glyph(ctx,x,gy,3.2,0,true); hotDot("tl",x,gy,5,"New moon, "+fmt(ms,S.tz,{day:'2-digit',month:'short'})); }

  if(T0>=yearStart&&T0<yearEnd){
    const x=M.x(T0); ctx.fillStyle="rgba(228,134,60,0.75)";
    ctx.beginPath(); ctx.moveTo(x,ty+9); ctx.lineTo(x-3.5,ty+15); ctx.lineTo(x+3.5,ty+15);
    ctx.closePath(); ctx.fill();
    hotDot("tl",x,ty+12,7,"Today — "+fmt(T0,S.tz,{weekday:'long',day:'2-digit',month:'long',year:'numeric'}));
  }
  const hx=clamp(M.x(T),0,w);
  ctx.strokeStyle="#BCD2F2"; ctx.lineWidth=1.4;
  ctx.beginPath(); ctx.moveTo(hx,gy+7); ctx.lineTo(hx,ty+8); ctx.stroke();
  ctx.fillStyle="#BCD2F2"; ctx.beginPath(); ctx.arc(hx,ty,3.6,0,TAU); ctx.fill();
  hotDot("tl",hx,ty,8,"The moment you are looking at. Drag anywhere on this strip");
  ctx.textAlign="left";
}

