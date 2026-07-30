/* Canvas helpers and the hover-target registry. */
import {TAU,D2R,clamp,css} from "./astro.js";

/* ─────────────── hover targets ─────────────── */
export const HOTS={sky:[],ecl:[],tl:[]};
export function hotDot(k,x,y,r,text){ HOTS[k].push({d:1,x,y,r,text}); }
export function hotSeg(k,x1,y1,x2,y2,text){ HOTS[k].push({d:0,x1,y1,x2,y2,text}); }
export function segDist(px,py,x1,y1,x2,y2){
  const dx=x2-x1, dy=y2-y1, L=dx*dx+dy*dy;
  const t=L?clamp(((px-x1)*dx+(py-y1)*dy)/L,0,1):0;
  return Math.hypot(px-(x1+t*dx), py-(y1+t*dy));
}
export function hitTest(k,px,py){
  let best=null,bd=13;
  for(const o of HOTS[k]){
    const dist=o.d ? Math.hypot(px-o.x,py-o.y)-o.r : segDist(px,py,o.x1,o.y1,o.x2,o.y2);
    if(dist<bd){ bd=dist; best=o; }
  }
  return best;
}

/* ─────────────── canvas plumbing ─────────────── */
export function fit(c){
  const dpr=Math.min(window.devicePixelRatio||1,2.5);
  const w=c.clientWidth||360, h=c.clientHeight||160;
  if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){
    c.width=Math.round(w*dpr); c.height=Math.round(h*dpr);
  }
  const ctx=c.getContext("2d"); ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);
  return {ctx,w,h};
}
export function skyColour(a){
  const st=[[-20,[4,6,16]],[-16,[6,10,26]],[-10,[12,20,48]],[-6,[26,36,76]],[-3,[58,58,96]],
            [0,[104,86,110]],[3,[110,124,164]],[10,[92,132,190]],[30,[64,120,196]],[60,[48,108,190]]];
  if(a<=st[0][0]) return st[0][1];
  if(a>=st[st.length-1][0]) return st[st.length-1][1];
  for(let i=0;i<st.length-1;i++) if(a>=st[i][0]&&a<=st[i+1][0]){
    const t=(a-st[i][0])/(st[i+1][0]-st[i][0]);
    return st[i][1].map((v,k)=>v+(st[i+1][1][k]-v)*t);
  }
  return st[0][1];
}
export function litPath(ctx,r,k){
  const x=r*(2*k-1);
  ctx.beginPath();
  ctx.arc(0,0,r,-Math.PI/2,Math.PI/2,false);
  ctx.ellipse(0,0,Math.abs(x),r,0,Math.PI/2,-Math.PI/2,x<0);
  ctx.closePath();
}
/* the whole disc is always outlined, so a new moon is still a moon */
export function drawDisc(ctx,cx,cy,r,k,limb,north,rgb,alpha){
  ctx.save(); ctx.translate(cx,cy); ctx.globalAlpha=alpha;
  ctx.beginPath(); ctx.arc(0,0,r,0,TAU);
  ctx.fillStyle=`rgba(120,140,180,${0.14*alpha})`; ctx.fill();
  ctx.save(); ctx.rotate(limb*D2R); litPath(ctx,r,k);
  const g=ctx.createRadialGradient(-r*0.15,-r*0.15,r*0.1,0,0,r*1.05);
  g.addColorStop(0,css(rgb,1)); g.addColorStop(0.75,css(rgb,0.97));
  g.addColorStop(1,css(rgb.map(v=>v*0.8),1));
  ctx.fillStyle=g; ctx.fill(); ctx.restore();
  if(r>7){
    ctx.save(); ctx.rotate((north+180)*D2R);
    ctx.globalCompositeOperation="source-atop";
    ctx.fillStyle=`rgba(38,46,64,${0.30*alpha})`;
    for(const m of [[-.28,-.30,.26],[-.05,-.34,.18],[.14,-.14,.20],[-.34,.06,.20],
                    [-.12,.10,.15],[.30,.22,.13],[-.02,.40,.12]]){
      ctx.beginPath(); ctx.ellipse(m[0]*r,m[1]*r,m[2]*r,m[2]*r*0.86,0.4,0,TAU); ctx.fill();
    }
    ctx.restore();
  }
  ctx.beginPath(); ctx.arc(0,0,r,0,TAU);
  ctx.strokeStyle=`rgba(206,222,250,${0.50*alpha})`; ctx.lineWidth=Math.max(0.8,r*0.045); ctx.stroke();
  ctx.restore();
}

