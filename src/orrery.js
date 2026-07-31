import {D2R,R2D,TAU,sin,cos,norm,clamp,jd,sunPos,moonPos,gmst} from "./astro.js";
import {LAND,ANTARCTICA} from "./data.js";
import {S,T,anim,place,fmt} from "./state.js";
import {HOTS,hotDot,hotSeg,fit,litPath} from "./draw.js";

/* ─────────────── panel 2 · Sun, Earth, Moon from outside ─────────────── */
const GE=35, gS=sin(GE), gC=cos(GE);
function gPt(lonDeg,latDeg,R){
  const x=cos(latDeg)*cos(lonDeg), y=cos(latDeg)*sin(lonDeg), z=sin(latDeg);
  // Screen x is +R*x, not −R*x: viewed from outside the sphere, east must run to
  // the right. The old sign mirrored the globe east–west (Africa's horn pointed
  // the wrong way). d and screen y are unchanged, so the near side and the
  // sun-locked rotation below are unaffected.
  return {x:R*x, y:-R*(y*gS+z*gC), d:y*gC-z*gS};        // d<0 → near side
}
export function renderEcl(){
  const c=document.getElementById("ecl");
  const {ctx,w,h}=fit(c);
  const J=jd(T), s=sunPos(J), m=moonPos(J);
  HOTS.ecl.length=0;
  ctx.fillStyle="#080D1A"; ctx.fillRect(0,0,w,h);

  const sunX=w*0.14, sunY=h*0.52, orbR=Math.min(w*0.22,h*0.34);
  const eLon=norm(s.lam+180);
  const ex=sunX+orbR*cos(eLon), ey=sunY-orbR*sin(eLon)*0.40;
  ctx.strokeStyle="rgba(255,255,255,0.09)"; ctx.setLineDash([3,4]);
  ctx.beginPath(); ctx.ellipse(sunX,sunY,orbR,orbR*0.40,0,0,TAU); ctx.stroke(); ctx.setLineDash([]);
  const sg=ctx.createRadialGradient(sunX,sunY,0,sunX,sunY,22);
  sg.addColorStop(0,"rgba(255,242,196,1)"); sg.addColorStop(0.3,"rgba(255,206,110,0.5)");
  sg.addColorStop(1,"rgba(255,180,70,0)");
  ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(sunX,sunY,22,0,TAU); ctx.fill();
  ctx.fillStyle="#FFE9A8"; ctx.beginPath(); ctx.arc(sunX,sunY,6.5,0,TAU); ctx.fill();
  ctx.fillStyle="#5C93C8"; ctx.beginPath(); ctx.arc(ex,ey,3.2,0,TAU); ctx.fill();
  hotDot("ecl",sunX,sunY,14,"The Sun. Earth's orbit is the dashed ellipse around it — one lap a year");
  hotDot("ecl",ex,ey,8,"Earth on its orbit, "+fmt(T,S.tz,{day:'2-digit',month:'long'})+
    ". The bubble magnifies this dot enormously");

  const bx=w*0.68, by=h*0.50, bR=Math.min(w*0.28,h*0.44);
  ctx.strokeStyle="rgba(190,212,244,0.16)"; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(ex,ey); ctx.lineTo(bx-bR*0.96,by-bR*0.48); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ex,ey); ctx.lineTo(bx-bR*0.96,by+bR*0.48); ctx.stroke();
  ctx.beginPath(); ctx.arc(bx,by,bR,0,TAU); ctx.stroke();

  const ux=cos(s.lam), uy=-sin(s.lam), sunAng=Math.atan2(uy,ux);
  ctx.save(); ctx.beginPath(); ctx.arc(bx,by,bR,0,TAU); ctx.clip();
  ctx.strokeStyle="rgba(255,214,130,0.30)"; ctx.lineWidth=1;
  ctx.setLineDash([3,9]);
  ctx.lineDashOffset=(-anim*0.9)%12;                   // dashes stream from the Sun toward Earth
  for(let k=-5;k<=5;k++){
    const px=bx-uy*k*bR/5, py=by+ux*k*bR/5;
    ctx.beginPath(); ctx.moveTo(px+ux*bR*1.25,py+uy*bR*1.25);
    ctx.lineTo(px-ux*bR*1.25,py-uy*bR*1.25); ctx.stroke();
  }
  ctx.setLineDash([]); ctx.restore();
  hotSeg("ecl",bx+ux*bR,by+uy*bR,bx-ux*bR,by-uy*bR,
    "Sunlight, streaming past. It arrives as parallel rays because the Sun is so far away");
  hotDot("ecl",bx,by,bR,"A magnified view of the Earth–Moon system, far out of scale with the orbit at left");

  /* ── the globe ── */
  const eR=bR*0.32, lst=norm(gmst(J)+S.lon), HA=norm(lst-s.ra);
  const sl=gPt(0,s.dec,1), rot=sunAng-Math.atan2(sl.y,sl.x);
  const cR=Math.cos(rot), sR=Math.sin(rot);
  const G=(lon,lat)=>{ const p=gPt(lon,lat,eR);
    return {x:bx+p.x*cR-p.y*sR, y:by+p.x*sR+p.y*cR, d:p.d}; };
  const lonOff=HA-S.lon;                       // geographic longitude → our sun-locked frame
  const shape=(poly)=>{
    let near=false; ctx.beginPath();
    poly.forEach((p,i)=>{
      const q=G(p[0]+lonOff,p[1]);
      let x=q.x,y=q.y;
      if(q.d>0){ const dx=x-bx,dy=y-by,L=Math.hypot(dx,dy)||1; x=bx+dx/L*eR; y=by+dy/L*eR; }
      else near=true;
      i?ctx.lineTo(x,y):ctx.moveTo(x,y);
    });
    ctx.closePath(); return near;
  };
  const paint=(ocean,land)=>{
    ctx.beginPath(); ctx.arc(bx,by,eR,0,TAU); ctx.fillStyle=ocean; ctx.fill();
    ctx.fillStyle=land;
    for(const poly of LAND) if(shape(poly)) ctx.fill();
    if(shape(ANTARCTICA)) ctx.fill();
  };
  ctx.save(); ctx.beginPath(); ctx.arc(bx,by,eR,0,TAU); ctx.clip();
  paint("#0E1B2C","#1E3329");                                   // night
  ctx.save(); ctx.translate(bx,by); ctx.rotate(sunAng);
  litPath(ctx,eR,clamp((1+sin(s.dec)*gS)/2,0,1)); ctx.restore();
  ctx.clip();
  paint("#3B79AE","#4F7C4C");                                   // day
  ctx.restore();

  ctx.save(); ctx.beginPath(); ctx.arc(bx,by,eR,0,TAU); ctx.clip();
  const poly=pts=>{
    for(let i=1;i<pts.length;i++){
      const near=(pts[i-1].d+pts[i].d)/2<0;
      ctx.strokeStyle=near?"rgba(226,236,255,0.24)":"rgba(226,236,255,0.07)";
      ctx.lineWidth=0.7;
      ctx.beginPath(); ctx.moveTo(pts[i-1].x,pts[i-1].y); ctx.lineTo(pts[i].x,pts[i].y); ctx.stroke();
    }
  };
  const eq=[]; for(let a=0;a<=360;a+=6) eq.push(G(a,0)); poly(eq);
  for(let k=0;k<6;k++){
    const mer=[]; for(let la=-90;la<=90;la+=6) mer.push(G(norm(HA+k*60),la)); poly(mer);
  }
  const ring=[]; for(let a=0;a<=360;a+=6) ring.push(G(a,S.lat));
  for(let i=1;i<ring.length;i++){
    ctx.strokeStyle=(ring[i].d+ring[i-1].d)/2<0?"rgba(228,134,60,0.5)":"rgba(228,134,60,0.14)";
    ctx.lineWidth=1; ctx.beginPath();
    ctx.moveTo(ring[i-1].x,ring[i-1].y); ctx.lineTo(ring[i].x,ring[i].y); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle="rgba(190,212,244,0.45)"; ctx.lineWidth=1;
  ctx.beginPath(); ctx.arc(bx,by,eR,0,TAU); ctx.stroke();
  const pN=G(0,90), pS=G(0,-90);
  ctx.font="9px ui-monospace,monospace"; ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillStyle="rgba(233,231,223,0.85)"; ctx.fillText("N",pN.x+(pN.x-bx)*0.36,pN.y+(pN.y-by)*0.36);
  ctx.fillStyle="rgba(233,231,223,0.40)"; ctx.fillText("S",pS.x+(pS.x-bx)*0.36,pS.y+(pS.y-by)*0.36);
  ctx.textAlign="left"; ctx.textBaseline="alphabetic";
  hotDot("ecl",pN.x,pN.y,9,"North pole. Its tilt towards or away from the Sun is what makes the seasons");
  hotDot("ecl",pS.x,pS.y,9,"South pole");
  hotDot("ecl",bx,by,eR*0.55,"Earth, hugely oversized, seen from 35° above the equator. "+
    "The lit half always faces the Sun; the meridians turn under it once a day");

  /* Moon */
  const minD=356355,maxD=406725;
  const mr=bR*(0.52+0.40*clamp((m.dist-minD)/(maxD-minD),0,1));
  ctx.strokeStyle="rgba(255,255,255,0.07)"; ctx.setLineDash([2,3]);
  ctx.beginPath(); ctx.arc(bx,by,mr,0,TAU); ctx.stroke(); ctx.setLineDash([]);
  const mAng=m.lam, mx2=bx+mr*cos(mAng), my2=by-mr*sin(mAng), mR=Math.max(3,bR*0.085);
  ctx.beginPath(); ctx.arc(mx2,my2,mR,0,TAU); ctx.fillStyle="#2C3550"; ctx.fill();
  ctx.save(); ctx.translate(mx2,my2); ctx.rotate(sunAng);
  ctx.beginPath(); ctx.arc(0,0,mR,-Math.PI/2,Math.PI/2); ctx.fillStyle="#DBD9CF"; ctx.fill();
  ctx.restore();
  ctx.beginPath(); ctx.arc(mx2,my2,mR,0,TAU);
  ctx.strokeStyle="rgba(206,222,250,0.5)"; ctx.lineWidth=0.9; ctx.stroke();
  hotDot("ecl",mx2,my2,mR+7,"The Moon, "+Math.round(m.dist).toLocaleString("en-GB")+" km away. "+
    "Always half lit — you just see that half from an angle");
  for(let a=0;a<360;a+=45) hotDot("ecl",bx+mr*cos(a),by-mr*sin(a),6,
    "The Moon's orbit. This ring visibly shrinks and grows: the orbit is an ellipse, "+
    "356,400 km at its nearest to 406,700 km at its farthest");

  /* you */
  const ob=G(HA,S.lat);
  ctx.strokeStyle="rgba(228,134,60,0.5)"; ctx.setLineDash([2,3]); ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(ob.x,ob.y); ctx.lineTo(mx2,my2); ctx.stroke(); ctx.setLineDash([]);
  hotSeg("ecl",ob.x,ob.y,mx2,my2,ob.d<0
    ? "Your line of sight to the Moon"
    : "Your line of sight to the Moon — it passes through the Earth, so the Moon is below your horizon");
  // the pin: where you are standing
  const pd=Math.hypot(ob.x-bx,ob.y-by)||1, pux=(ob.x-bx)/pd, puy=(ob.y-by)/pd;
  const near=ob.d<0, tipx=ob.x+pux*11, tipy=ob.y+puy*11;
  ctx.strokeStyle=near?"#E4863C":"rgba(228,134,60,0.35)"; ctx.lineWidth=1.4;
  ctx.beginPath(); ctx.moveTo(ob.x,ob.y); ctx.lineTo(tipx,tipy); ctx.stroke();
  ctx.fillStyle=near?"#E4863C":"rgba(228,134,60,0.35)";
  ctx.beginPath(); ctx.arc(tipx,tipy,3.4,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(ob.x,ob.y,1.8,0,TAU); ctx.fill();
  ctx.font="10px ui-monospace,monospace";
  const nm=place().n, tw=ctx.measureText(nm).width;
  const lx=clamp(tipx+(pux>=0?7:-7-tw),4,w-tw-4), ly=clamp(tipy+(puy>=0?11:-6),12,h-4);
  ctx.fillStyle=near?"rgba(233,231,223,0.92)":"rgba(233,231,223,0.45)";
  ctx.fillText(nm,lx,ly);
  hotDot("ecl",tipx,tipy,13,"From where you look at the sky: "+nm+" ("+
    Math.abs(S.lat).toFixed(2)+"°"+(S.lat>=0?"N":"S")+", "+Math.abs(S.lon).toFixed(2)+"°"+
    (S.lon>=0?"E":"W")+")"+(near?" — currently facing us":" — currently on the far side"));

  const el=norm(m.lam-s.lam);
  ctx.strokeStyle="rgba(190,212,244,0.28)"; ctx.setLineDash([2,2]);
  ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(mx2,my2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(bx+bR*0.99*ux,by+bR*0.99*uy); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle="#BCD2F2"; ctx.lineWidth=1.6;
  ctx.beginPath(); ctx.arc(bx,by,eR*1.45,-s.lam*D2R,-mAng*D2R,el>180); ctx.stroke();
  const half=(s.lam+ (el>180 ? el-360 : el)/2);
  hotDot("ecl",bx+eR*1.45*cos(half),by-eR*1.45*sin(half),12,
    "Sun–Earth–Moon angle: "+el.toFixed(0)+"°. This angle is the phase — 0° is new, 180° is full");
  hotSeg("ecl",bx,by,mx2,my2,"Earth to Moon");
  hotSeg("ecl",bx,by,bx+bR*0.99*ux,by+bR*0.99*uy,"Earth to Sun — the direction the lit halves face");
  const ringLat=G(norm(HA+90),S.lat);
  hotDot("ecl",ringLat.x,ringLat.y,7,"Your line of latitude, "+Math.abs(S.lat).toFixed(1)+"°"+
    (S.lat>=0?"N":"S")+". You ride round this circle once a day");
}

