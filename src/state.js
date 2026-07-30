/* Shared state, caches and calendar helpers. */
import {D2R,R2D,TAU,sin,cos,tan,norm,clamp,jd,observe,sunPos,moonPos,gmst,altaz,
        refract,nextPhase} from "./astro.js";
import {CITIES} from "./data.js";

/* ─────────────── time zones ─────────────── */
const DTF=new Map();
export function dtf(loc,tz,o){
  const k=loc+"|"+tz+"|"+JSON.stringify(o);
  let f=DTF.get(k);
  if(!f){ f=new Intl.DateTimeFormat(loc,Object.assign({timeZone:tz},o)); DTF.set(k,f); }
  return f;
}
const OFFOPT={hour12:false,year:'numeric',month:'2-digit',day:'2-digit',
              hour:'2-digit',minute:'2-digit',second:'2-digit'};
export function tzOff(ms,tz){
  const p=dtf('en-US',tz,OFFOPT).formatToParts(new Date(ms))
    .reduce((a,x)=>(a[x.type]=x.value,a),{});
  return Date.UTC(+p.year,+p.month-1,+p.day,+p.hour%24,+p.minute,+p.second)-ms;
}
export const fmt=(ms,tz,o)=>dtf('en-GB',tz,o).format(new Date(ms));
export const DAY=86400000;

/* ─────────────── state ─────────────── */
export const PLACES=[
  {n:"Hamburg",lat:53.5511,lon:9.9937,tz:"Europe/Berlin"},
  {n:"Norderstedt",lat:53.7064,lon:9.9906,tz:"Europe/Berlin"},
  {n:"Reykjavík",lat:64.1466,lon:-21.9426,tz:"Atlantic/Reykjavik"},
  {n:"Nairobi",lat:-1.2864,lon:36.8172,tz:"Africa/Nairobi"},
  {n:"Cape Town",lat:-33.9249,lon:18.4241,tz:"Africa/Johannesburg"},
  {n:"Ushuaia",lat:-54.8019,lon:-68.3030,tz:"America/Argentina/Ushuaia"}
];
export const S={place:0,lat:53.5511,lon:9.9937,tz:"Europe/Berlin",mag:20,speed:2,playing:false};
export const place=()=>PLACES[S.place]||PLACES[0];
export function nearestCity(lat,lon){
  let best=null,bd=1e9;
  for(const c of CITIES){
    const dLat=(c[1]-lat)*111.2, dLon=(c[2]-lon)*111.2*cos((lat+c[1])/2);
    const d=Math.hypot(dLat,dLon);
    if(d<bd){ bd=d; best=c; }
  }
  return {name:best[0], km:bd};
}
export function localToUTC(y,mo,d,h,mi,tz){
  let g=Date.UTC(y,mo,d,h,mi);
  for(let i=0;i<3;i++) g=Date.UTC(y,mo,d,h,mi)-tzOff(g,tz);
  return g;
}
export let anim=0;
export function bumpAnim(d){anim+=d;}
export let T=Date.now();
export const T0=Date.now();
export function _setT(ms){T=ms;}
export let yearStart=Date.UTC(new Date(T).getUTCFullYear(),0,1);
export let yearEnd=Date.UTC(new Date(T).getUTCFullYear()+1,0,1);
export function _setYear(a,b){yearStart=a;yearEnd=b;}

/* ─────────────── fixed 360° panorama ─────────────── */
export let frame=null;
export function clearFrame(){frame=null;}
export function buildFrame(){
  const key=S.lat.toFixed(3);
  if(frame&&frame.key===key) return frame;
  // the Moon can never culminate higher than 90° − |φ| + 28.6°. Closed form, so it cannot drift.
  const altMax=clamp(Math.ceil((90-Math.abs(S.lat)+28.6)/10)*10,30,90);
  frame={key,centre:S.lat>=0?180:0,span:360,altMax};
  return frame;
}

/* ─────────────── the tracks: a rolling ±24 h ribbon, faded by distance in time ─────────────── */
export function moonAt(ms){
  const o=observe(jd(ms),S.lat,S.lon);
  return {alt:o.altApp,az:o.moon.az};
}
export function sunAt(ms){
  const J=jd(ms), s=sunPos(J);
  const {alt,az}=altaz(s.ra,s.dec,S.lat,norm(gmst(J)+S.lon));
  return {alt:alt+refract(alt),az};
}
export const TSTEP=10*60000, THALF=24*3600000;
export const tCache={moon:new Map(),sun:new Map()};
export function clearTracks(){ tCache.moon.clear(); tCache.sun.clear(); }
export function trackPts(which,at){
  const m=tCache[which];
  const a=Math.floor((T-THALF)/TSTEP)*TSTEP, b=Math.ceil((T+THALF)/TSTEP)*TSTEP;
  const out=[];
  for(let ms=a; ms<=b; ms+=TSTEP){
    let v=m.get(ms);
    if(!v){ v=at(ms); m.set(ms,v); }
    out.push({ms,alt:v.alt,az:v.az});
  }
  if(m.size>900) for(const k of m.keys()) if(k<a||k>b) m.delete(k);
  return out;
}

/* ─────────────── phase helpers ─────────────── */
export function ageAt(ms){ const J=jd(ms); return norm(moonPos(J).lam-sunPos(J).lam); }
export const kFromAge=a=>(1-cos(a))/2;
let fmTimes=null;
export function principalPhases(){                     // new and full moons of the displayed year
  const y=new Date(T).getUTCFullYear();
  if(fmTimes&&fmTimes.y===y) return fmTimes;
  const full=[],neu=[];
  let J=jd(Date.UTC(y,0,1))-32;
  for(let i=0;i<16;i++){
    J=nextPhase(J+1,180); const ms=(J-2440587.5)*86400000;
    if(ms>=Date.UTC(y,0,1)&&ms<Date.UTC(y+1,0,1)) full.push(ms);
    if(ms>Date.UTC(y+1,0,1)) break;
  }
  J=jd(Date.UTC(y,0,1))-32;
  for(let i=0;i<16;i++){
    J=nextPhase(J+1,0); const ms=(J-2440587.5)*86400000;
    if(ms>=Date.UTC(y,0,1)&&ms<Date.UTC(y+1,0,1)) neu.push(ms);
    if(ms>Date.UTC(y+1,0,1)) break;
  }
  fmTimes={y,full,neu};
  return fmTimes;
}
let lensCache=null;
export function lensPhases(a,b){                       // one glyph per day inside the lens
  const key=Math.floor(a/DAY)+"|"+Math.floor(b/DAY);
  if(lensCache&&lensCache.key===key) return lensCache.list;
  const list=[];
  for(let d=Math.ceil(a/DAY)*DAY; d<=b; d+=DAY){
    const age=ageAt(d+12*3600000);
    list.push({ms:d+12*3600000,k:kFromAge(age),wax:age<180});
  }
  lensCache={key,list};
  return list;
}
let fullCache=null;
export function clearFullCache(){fullCache=null;fmTimes=null;}
export function buildFullMoons(){
  const y=new Date(T).getUTCFullYear(), key=`${y}|${S.lat.toFixed(2)}`;
  if(fullCache&&fullCache.key===key) return fullCache;
  const list=principalPhases().full.map(ms=>{
    const J=jd(ms), o=observe(J,S.lat,S.lon);
    let mx=-90;
    for(let h=-12;h<=12;h+=0.3){ const oo=observe(J+h/24,S.lat,S.lon); if(oo.altApp>mx) mx=oo.altApp; }
    return {ms,diam:o.diam,maxAlt:mx};
  });
  fullCache={key,list};
  return fullCache;
}


export function phaseName(age){
  if(age<7.5||age>=352.5) return "new";
  if(age<82.5) return "waxing crescent"; if(age<97.5) return "first quarter";
  if(age<172.5) return "waxing gibbous"; if(age<187.5) return "full";
  if(age<262.5) return "waning gibbous"; if(age<277.5) return "last quarter";
  return "waning crescent";
}
