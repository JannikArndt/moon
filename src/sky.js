import {D2R,R2D,TAU,sin,cos,norm,clamp,jd,observe,gmst,altaz,moonRGB,paZen,css} from "./astro.js";
import {STARS,SLINES,BGSTARS} from "./data.js";
import {S,T,THALF,place,fmt,tzOff,buildFrame,trackPts,moonAt,sunAt,phaseName} from "./state.js";
import {HOTS,hotDot,hotSeg,fit,skyColour,drawDisc} from "./draw.js";

/* ─────────────── panel 1 · the sky where you stand ─────────────── */
export function renderSky(){
  const c=document.getElementById("sky");
  const {ctx,w,h}=fit(c);
  const F=buildFrame(); HOTS.sky.length=0;
  const J=jd(T), o=observe(J,S.lat,S.lon), lst=norm(gmst(J)+S.lon);

  const sag=Math.min(h*0.045,26), hBase=h*0.76;
  const hY=x=>hBase-sag*(1-Math.pow(2*x/w-1,2));
  const upScale=(hBase-h*0.07)/F.altMax, dnScale=upScale*0.42, deep=h-hBase-10;
  const X=az=>{let d=az-F.centre; if(d>180)d-=360; if(d<-180)d+=360; return w/2+d/F.span*w;};
  const Y=(alt,x)=>alt>=0 ? hY(x)-alt*upScale : hY(x)+Math.min(-alt*dnScale,deep);

  const sc=skyColour(o.sun.alt);
  const grd=ctx.createLinearGradient(0,0,0,hBase);
  grd.addColorStop(0,`rgb(${sc.map(v=>Math.round(v*0.6)).join(",")})`);
  grd.addColorStop(0.74,`rgb(${sc.map(Math.round).join(",")})`);
  const warm=clamp(1-Math.abs(o.sun.alt)/14,0,1);
  grd.addColorStop(1,`rgb(${Math.round(sc[0]+120*warm)},${Math.round(sc[1]+60*warm)},${Math.round(sc[2]+24*warm)})`);
  ctx.fillStyle=grd; ctx.fillRect(0,0,w,h);

  /* stars — real positions, turning with the Earth */
  const dark=clamp((-o.sun.alt-3)/13,0,1);
  if(dark>0.02){
    const pos=STARS.map(s=>{
      const p=altaz(s[0],s[1],S.lat,lst);
      return {x:X(p.az),y:Y(p.alt,X(p.az)),alt:p.alt,mag:s[2],name:s[3]};
    });
    ctx.strokeStyle=`rgba(190,212,244,${0.14*dark})`; ctx.lineWidth=1;
    for(const [i,j] of SLINES){
      if(pos[i].alt<0||pos[j].alt<0) continue;
      if(Math.abs(pos[i].x-pos[j].x)>w*0.4) continue;
      ctx.beginPath(); ctx.moveTo(pos[i].x,pos[i].y); ctx.lineTo(pos[j].x,pos[j].y); ctx.stroke();
    }
    ctx.fillStyle="#E8EEFF";
    for(const p of pos){
      if(p.alt<0) continue;
      const r=clamp(2.3-p.mag*0.42,0.55,2.6);
      ctx.globalAlpha=clamp(1.05-p.mag*0.16,0.3,1)*dark;
      ctx.beginPath(); ctx.arc(p.x,p.y,r,0,TAU); ctx.fill();
      if(p.name) hotDot("sky",p.x,p.y,5,p.name+" — magnitude "+p.mag.toFixed(2)+
        ", rising and setting because the Earth turns");
    }
    // a faint synthetic background, also rotating
    for(const b of BGSTARS){
      const p=altaz(b[0],b[1],S.lat,lst); if(p.alt<0) continue;
      const x=X(p.az);
      ctx.globalAlpha=b[2]*dark;
      ctx.beginPath(); ctx.arc(x,Y(p.alt,x),b[3],0,TAU); ctx.fill();
    }
    ctx.globalAlpha=1;
    ctx.font="9px ui-monospace,monospace"; ctx.textAlign="center";
    for(const p of pos){
      if(p.alt<8||!p.name||(p.mag>0.15&&p.name!=="Polaris")) continue;
      ctx.fillStyle=`rgba(210,224,250,${0.5*dark})`;
      ctx.fillText(p.name,p.x,p.y-7);
    }
    ctx.textAlign="left";
  }

  ctx.lineWidth=1; ctx.font="9px ui-monospace,monospace";
  for(let a=15;a<=F.altMax;a+=15){
    ctx.strokeStyle="rgba(255,255,255,0.085)"; ctx.beginPath();
    for(let x=0;x<=w;x+=8){ const y=Y(a,x); x?ctx.lineTo(x,y):ctx.moveTo(x,y); }
    ctx.stroke();
    ctx.fillStyle="rgba(255,255,255,0.30)"; ctx.fillText(a+"°",4,Y(a,4)-3);
    hotSeg("sky",0,Y(a,0),w,Y(a,w),a+"° above the horizon — a fist at arm's length is about 10°");
  }

  /* the two tracks — a ribbon that fades in a day early and out a day late */
  const track=(pts,rgb,wid,label)=>{
    const CH=4;
    for(const off of [-w,0,w]){
      for(let i=0;i<pts.length-1;i+=CH){
        const j=Math.min(i+CH,pts.length-1);
        let jump=false,sum=0,up=0,n=0,minx=1e9,maxx=-1e9;
        for(let q=i;q<j;q++){
          if(Math.abs(X(pts[q+1].az)-X(pts[q].az))>w*0.5) jump=true;
          sum+=1-Math.abs(pts[q].ms-T)/THALF; if(pts[q].alt>0) up++; n++;
        }
        if(jump||!n) continue;
        const fade=clamp(sum/n,0,1); if(fade<=0.02) continue;
        for(let q=i;q<=j;q++){ const x=X(pts[q].az)+off; minx=Math.min(minx,x); maxx=Math.max(maxx,x); }
        if(maxx<-4||minx>w+4) continue;
        const above=up>n/2;
        ctx.beginPath();
        for(let q=i;q<=j;q++){ const x=X(pts[q].az)+off;
          q===i?ctx.moveTo(x,Y(pts[q].alt,x)):ctx.lineTo(x,Y(pts[q].alt,x)); }
        ctx.strokeStyle=css(rgb,(above?0.58:0.20)*fade);
        ctx.lineWidth=above?wid:wid*0.75;
        ctx.stroke();
        if(off===0&&above&&i%(CH*5)===0){
          const xa=X(pts[i].az), xb=X(pts[j].az);
          hotSeg("sky",xa,Y(pts[i].alt,xa),xb,Y(pts[j].alt,xb),label);
        }
      }
    }
  };
  const mPts=trackPts("moon",moonAt), sPts=trackPts("sun",sunAt);
  track(sPts,[0.94,0.70,0.34],1.5,"The Sun's track — brightest at the selected moment, fading out a day either side");
  track(mPts,[0.75,0.83,0.96],1.7,"The Moon's track — brightest at the selected moment, fading out a day either side");
  ctx.font="8px ui-monospace,monospace"; ctx.textAlign="center";
  const tzoA=tzOff(T-THALF,S.tz), tzoB=tzOff(T+THALF,S.tz);
  for(const p of mPts){
    const d=new Date(p.ms+(p.ms<T?tzoA:tzoB));
    if(d.getUTCMinutes()>=10||d.getUTCHours()%3!==0||p.alt<1) continue;
    const fade=clamp(1-Math.abs(p.ms-T)/THALF,0,1); if(fade<0.12) continue;
    const x=X(p.az),y=Y(p.alt,x);
    ctx.fillStyle=`rgba(190,212,244,${0.7*fade})`;
    ctx.beginPath(); ctx.arc(x,y,1.9,0,TAU); ctx.fill();
    ctx.fillText(String(d.getUTCHours()).padStart(2,"0"),x,y-6);
    hotDot("sky",x,y,4,fmt(p.ms,S.tz,{weekday:'short',hour:'2-digit',minute:'2-digit'})+" — the Moon is here");
  }
  ctx.textAlign="left";

  /* sun and moon, drawn before the ground so they show through it */
  const sx=X(o.sun.az), sy=Y(o.sun.alt,X(o.sun.az));
  const sr=Math.max(4,(o.diam/2/60)*(w/F.span)*S.mag);
  for(const off of [-w,0,w]){
    const cxs=sx+off; if(cxs<-sr*6||cxs>w+sr*6) continue;
    const sg=ctx.createRadialGradient(cxs,sy,0,cxs,sy,sr*5);
    sg.addColorStop(0,"rgba(255,238,186,0.9)"); sg.addColorStop(0.22,"rgba(255,206,116,0.4)");
    sg.addColorStop(1,"rgba(255,188,88,0)");
    ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(cxs,sy,sr*5,0,TAU); ctx.fill();
    ctx.fillStyle="rgba(255,246,212,0.95)"; ctx.beginPath(); ctx.arc(cxs,sy,sr,0,TAU); ctx.fill();
  }
  hotDot("sky",sx,sy,Math.max(sr,10),o.sun.alt>=0
    ? "The Sun, "+o.sun.alt.toFixed(0)+"° up"
    : "The Sun, "+(-o.sun.alt).toFixed(0)+"° below the horizon — shown through the Earth");
  const mx=X(o.moon.az), my=Y(o.altApp,X(o.moon.az));
  const rPix=Math.max(2.2,(o.diam/2/60)*(w/F.span)*S.mag);
  const rgb=moonRGB(o.X);
  const limb=Math.atan2(-cos(paZen(o.moon,o.sun)),sin(paZen(o.moon,o.sun)))*R2D;
  const nth=Math.atan2(-cos(paZen(o.moon,{alt:S.lat,az:0})),sin(paZen(o.moon,{alt:S.lat,az:0})))*R2D;
  const alpha=clamp(1-(sc[0]+sc[1]+sc[2])/3/165,0.42,1);
  for(const off of [-w,0,w]){
    const cxm=mx+off; if(cxm<-rPix*4||cxm>w+rPix*4) continue;
    const hg=ctx.createRadialGradient(cxm,my,rPix*0.9,cxm,my,rPix*3.6);
    hg.addColorStop(0,css(rgb,0.20*alpha*o.k)); hg.addColorStop(1,css(rgb,0));
    ctx.fillStyle=hg; ctx.beginPath(); ctx.arc(cxm,my,rPix*3.6,0,TAU); ctx.fill();
    drawDisc(ctx,cxm,my,rPix,o.k,limb,nth,rgb,alpha);
  }
  hotDot("sky",mx,my,Math.max(rPix,11),"The Moon — "+phaseName(o.age)+", "+(o.k*100).toFixed(0)+
    "% lit, "+o.diam.toFixed(1)+"′ across, "+Math.round(o.dist).toLocaleString("en-GB")+" km away"+
    (o.altApp<0?" · below the horizon, shown through the Earth":""));

  /* the ground — translucent, one edge */
  ctx.save();
  ctx.beginPath(); ctx.moveTo(0,h); ctx.lineTo(0,hY(0));
  for(let x=0;x<=w;x+=6) ctx.lineTo(x,hY(x));
  ctx.lineTo(w,h); ctx.closePath();
  const gg=ctx.createLinearGradient(0,hBase-sag,0,h);
  gg.addColorStop(0,"rgba(10,17,32,0.56)"); gg.addColorStop(0.5,"rgba(7,12,24,0.70)");
  gg.addColorStop(1,"rgba(4,8,16,0.80)");
  ctx.fillStyle=gg; ctx.fill();
  ctx.strokeStyle="rgba(190,212,244,0.42)"; ctx.lineWidth=1.2; ctx.beginPath();
  for(let x=0;x<=w;x+=6){ x?ctx.lineTo(x,hY(x)):ctx.moveTo(x,hY(x)); }
  ctx.stroke();
  ctx.restore();

  ctx.font="9px ui-monospace,monospace"; ctx.textAlign="center";
  for(const [a,l] of [[0,"N"],[45,"NE"],[90,"E"],[135,"SE"],[180,"S"],[225,"SW"],[270,"W"],[315,"NW"]]){
    const x=X(a); if(x<12||x>w-12) continue;
    ctx.strokeStyle="rgba(255,255,255,0.22)";
    ctx.beginPath(); ctx.moveTo(x,hY(x)); ctx.lineTo(x,hY(x)+7); ctx.stroke();
    ctx.fillStyle="rgba(255,255,255,0.62)"; ctx.fillText(l,x,hY(x)+17);
    const full={N:"north",NE:"north-east",E:"east",SE:"south-east",S:"south",
                SW:"south-west",W:"west",NW:"north-west"}[l];
    hotDot("sky",x,hY(x)+13,11,"Looking "+full+" (azimuth "+a+"°)");
  }
  for(let x=0;x<w;x+=w/6) hotSeg("sky",x,hY(x),x+w/6,hY(x+w/6),
    "Your horizon. The curve is drawn for orientation — the real dip from eye level is about 0.05°");
  ctx.textAlign="left";
  const ox=w/2, oy=hY(ox);
  ctx.strokeStyle="#E4863C"; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(ox,oy); ctx.lineTo(ox,oy-8); ctx.stroke();
  ctx.fillStyle="#E4863C"; ctx.beginPath(); ctx.arc(ox,oy-10.5,2.1,0,TAU); ctx.fill();

  hotDot("sky",ox,oy-8,12,"You, standing at "+place().n+" — the middle of the view faces "+
    (S.lat>=0?"south":"north"));
  return o;
}

