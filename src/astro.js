/* Ephemeris and observing geometry.
   Sources are named beside each block; see README for the accuracy audit. */


"use strict";

"use strict";
export const D2R=Math.PI/180, R2D=180/Math.PI, TAU=Math.PI*2;
export const sin=a=>Math.sin(a*D2R), cos=a=>Math.cos(a*D2R), tan=a=>Math.tan(a*D2R);
export const norm=a=>((a%360)+360)%360;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/* ─────────────── ephemeris ─────────────── */
// Meeus 47.A : D, M, M', F, Σl(1e-6 deg), Σr(1e-3 km)
export const TL=[[0,0,1,0,6288774,-20905355],[2,0,-1,0,1274027,-3699111],[2,0,0,0,658314,-2955968],
[0,0,2,0,213618,-569925],[0,1,0,0,-185116,48888],[0,0,0,2,-114332,-3149],[2,0,-2,0,58793,246158],
[2,-1,-1,0,57066,-152138],[2,0,1,0,53322,-170733],[2,-1,0,0,45758,-204586],[0,1,-1,0,-40923,-129620],
[1,0,0,0,-34720,108743],[0,1,1,0,-30383,104755],[2,0,0,-2,15327,10321],[0,0,1,2,-12528,0],
[0,0,1,-2,10980,79661],[4,0,-1,0,10675,-34782],[0,0,3,0,10034,-23210],[4,0,-2,0,8548,-21636],
[2,1,-1,0,-7888,24208],[2,1,0,0,-6766,30824],[1,0,-1,0,-5163,-8379],[1,1,0,0,4987,-16675],
[2,-1,1,0,4036,-12831],[2,0,2,0,3994,-10445],[4,0,0,0,3861,-11650],[2,0,-3,0,3665,14403],
[0,1,-2,0,-2689,-7003],[2,0,-1,2,-2602,0],[2,-1,-2,0,2390,10056],[1,0,1,0,-2348,6322],
[2,-2,0,0,2236,-9884],[0,1,2,0,-2120,5751],[0,2,0,0,-2069,0],[2,-2,-1,0,2048,-4950],
[2,0,1,-2,-1773,4130],[2,0,0,2,-1595,0],[4,-1,-1,0,1215,-3958],[0,0,2,2,-1110,0],[3,0,-1,0,-892,3258],
[2,1,1,0,-810,2616],[4,-1,-2,0,759,-1897],[0,2,-1,0,-713,-2117],[2,2,-1,0,-700,2354],
[2,1,-2,0,691,0],[2,-1,0,-2,596,0],[4,0,1,0,549,-1423],[0,0,4,0,537,-1117],[4,-1,0,0,520,-1571],
[1,0,-2,0,-487,-1739],[2,1,0,-2,-399,0],[0,0,2,-2,-381,-4421],[1,1,1,0,351,0],[3,0,-2,0,-340,0],
[4,0,-3,0,330,0],[2,-1,2,0,327,0],[0,2,1,0,-323,1165],[1,1,-1,0,299,0],[2,0,3,0,294,0],
[2,0,-1,-2,0,8752]];
// Meeus 47.B : D, M, M', F, Σb
export const TB=[[0,0,0,1,5128122],[0,0,1,1,280602],[0,0,1,-1,277693],[2,0,0,-1,173237],[2,0,-1,1,55413],
[2,0,-1,-1,46271],[2,0,0,1,32573],[0,0,2,1,17198],[2,0,1,-1,9266],[0,0,2,-1,8822],[2,-1,0,-1,8216],
[2,0,-2,-1,4324],[2,0,1,1,4200],[2,1,0,-1,-3359],[2,-1,-1,1,2463],[2,-1,0,1,2211],[2,-1,-1,-1,2065],
[0,1,-1,-1,-1870],[4,0,-1,-1,1828],[0,1,0,1,-1794],[0,0,0,3,-1749],[0,1,-1,1,-1565],[1,0,0,1,-1491],
[0,1,1,1,-1475],[0,1,1,-1,-1410],[0,1,0,-1,-1344],[1,0,0,-1,-1335],[0,0,3,1,1107],[4,0,0,-1,1021],
[4,0,-1,1,833],[0,0,1,-3,777],[4,0,-2,1,671],[2,0,0,-3,607],[2,0,2,-1,596],[2,-1,1,-1,491],
[2,0,-2,1,-451],[0,0,3,-1,439],[2,0,2,1,422],[2,0,-3,-1,421],[2,1,-1,1,-366],[2,1,0,1,-351],
[4,0,0,1,331],[2,-1,1,1,315],[2,-2,0,-1,302],[0,0,1,3,-283],[2,1,1,-1,-229],[1,1,0,-1,223],
[1,1,0,1,223],[0,1,-2,-1,-220],[2,1,-1,-1,-220],[1,0,1,1,-185],[2,-1,-2,-1,181],[0,1,2,1,-177],
[4,0,-2,-1,176],[4,-1,-1,-1,166],[1,0,1,-1,-164],[4,0,1,-1,132],[1,0,-1,-1,-119],[4,-1,0,-1,115],
[2,-2,0,1,107]];

export const jd = ms => ms/86400000 + 2440587.5;

/* Universal Time runs on the turning Earth; the series below are written for Terrestrial
   Time, which does not. delta-T is the gap between them.
   Espenak & Meeus (2006) polynomial fits. */
export function deltaT(y){
  let t;
  if(y<1900){ t=(y-1820)/100; return -20+32*t*t; }
  if(y<1920){ t=y-1900; return -2.79+1.494119*t-0.0598939*t*t+0.0061966*t*t*t-0.000197*t*t*t*t; }
  if(y<1941){ t=y-1920; return 21.20+0.84493*t-0.076100*t*t+0.0020936*t*t*t; }
  if(y<1961){ t=y-1950; return 29.07+0.407*t-t*t/233+t*t*t/2547; }
  if(y<1986){ t=y-1975; return 45.45+1.067*t-t*t/260-t*t*t/718; }
  if(y<2005){ t=y-2000; return 63.86+0.3345*t-0.060374*t*t+0.0017275*t*t*t
                               +0.000651814*t*t*t*t+0.00002373599*t*t*t*t*t; }
  if(y<2050){ t=y-2000; return 62.92+0.32217*t+0.005589*t*t; }
  if(y<2150){ t=(y-1820)/100; return -20+32*t*t-0.5628*(2150-y); }
  t=(y-1820)/100; return -20+32*t*t;
}
export const tt = J => J + deltaT(2000+(J-2451545)/365.25)/86400;
export const obliq = T => 23.4392911 - 0.0130042*T - 1.64e-7*T*T + 5.036e-7*T*T*T;

export function sunPosTT(J){
  const T=(J-2451545)/36525, n=J-2451545;
  const L=norm(280.460+0.9856474*n), g=norm(357.528+0.9856003*n);
  const lam=norm(L+1.915*sin(g)+0.020*sin(2*g));
  const R=(1.00014-0.01671*cos(g)-0.00014*cos(2*g))*149597870.7;
  const e=obliq(T);
  const ra=norm(Math.atan2(cos(e)*sin(lam),cos(lam))*R2D);
  const dec=Math.asin(sin(e)*sin(lam))*R2D;
  return {lam,ra,dec,dist:R,eps:e};
}
export function moonPosTT(J){
  const T=(J-2451545)/36525, T2=T*T, T3=T2*T, T4=T3*T;
  const Lp=norm(218.3164477+481267.88123421*T-0.0015786*T2+T3/538841-T4/65194000);
  const D =norm(297.8501921+445267.1114034*T-0.0018819*T2+T3/545868-T4/113065000);
  const M =norm(357.5291092+35999.0502909*T-0.0001536*T2+T3/24490000);
  const Mp=norm(134.9633964+477198.8675055*T+0.0087414*T2+T3/69699-T4/14712000);
  const F =norm(93.2720950+483202.0175233*T-0.0036539*T2-T3/3526000+T4/863310000);
  const A1=norm(119.75+131.849*T), A2=norm(53.09+479264.290*T), A3=norm(313.45+481266.484*T);
  const E=1-0.002516*T-0.0000074*T2;
  let sl=0, sr=0, sb=0;
  for(const t of TL){
    const arg=t[0]*D+t[1]*M+t[2]*Mp+t[3]*F;
    const e=t[1]===0?1:(Math.abs(t[1])===1?E:E*E);
    sl+=t[4]*e*sin(arg); sr+=t[5]*e*cos(arg);
  }
  for(const t of TB){
    const arg=t[0]*D+t[1]*M+t[2]*Mp+t[3]*F;
    const e=t[1]===0?1:(Math.abs(t[1])===1?E:E*E);
    sb+=t[4]*e*sin(arg);
  }
  sl+=3958*sin(A1)+1962*sin(Lp-F)+318*sin(A2);
  sb+=-2235*sin(Lp)+382*sin(A3)+175*sin(A1-F)+175*sin(A1+F)+127*sin(Lp-Mp)-115*sin(Lp+Mp);
  const lam=norm(Lp+sl/1e6), bet=sb/1e6, dist=385000.56+sr/1000;
  /* F is the argument of latitude — the angle round the orbit from the ascending node.
     Reconstructing it from beta with asin cannot separate the two branches, so return it. */
  const eps=obliq(T);
  const x=cos(bet)*cos(lam), y=cos(eps)*cos(bet)*sin(lam)-sin(eps)*sin(bet),
        z=sin(eps)*cos(bet)*sin(lam)+cos(eps)*sin(bet);
  return {lam,bet,dist,F,ra:norm(Math.atan2(y,x)*R2D),dec:Math.asin(z)*R2D};
}
/* Public entry points take Universal Time; the series are handed Terrestrial Time. */
const sunPos  = J => sunPosTT(tt(J));
export const moonPos = J => moonPosTT(tt(J));

export function gmst(J){
  const T=(J-2451545)/36525;
  return norm(280.46061837+360.98564736629*(J-2451545)+0.000387933*T*T-T*T*T/38710000);
}
// topocentric ra/dec/dist for an object given geocentric values (Meeus 40)
export function topo(ra,dec,distKm,lat,lon,J){
  const Re=6378.14;
  const u=Math.atan(0.99664719*tan(lat))*R2D;
  const rsp=0.99664719*sin(u), rcp=cos(u);
  const lst=norm(gmst(J)+lon);
  const H=norm(lst-ra);
  const par=Math.asin(Re/distKm)*R2D;               // horizontal parallax
  const dRa=Math.atan2(-rcp*sin(par)*sin(H), cos(dec)-rcp*sin(par)*cos(H))*R2D;
  const ra2=ra+dRa;
  const dec2=Math.atan2((sin(dec)-rsp*sin(par))*cos(dRa), cos(dec)-rcp*sin(par)*cos(H))*R2D;
  // topocentric distance via vector difference
  const x=distKm*cos(dec)*cos(ra)-Re*rcp*cos(lst),
        y=distKm*cos(dec)*sin(ra)-Re*rcp*sin(lst),
        z=distKm*sin(dec)-Re*rsp;
  return {ra:norm(ra2),dec:dec2,dist:Math.sqrt(x*x+y*y+z*z),lst};
}
export function altaz(ra,dec,lat,lst){
  const H=norm(lst-ra);
  const alt=Math.asin(sin(lat)*sin(dec)+cos(lat)*cos(dec)*cos(H))*R2D;
  const az=norm(Math.atan2(sin(H), cos(H)*sin(lat)-tan(dec)*cos(lat))*R2D+180);
  return {alt,az};
}
export const refract = h => h<-1.5?0 : 1.02/tan(h+10.3/(h+5.11))/60;   // Bennett, degrees
export function airmass(h){ if(h<-2) return 40; const hh=Math.max(h,0.5);
  return 1/(sin(hh)+0.50572*Math.pow(hh+6.07995,-1.6364)); }

// full observation bundle
export function observe(J,lat,lon){
  const s=sunPos(J), m=moonPos(J);
  const st=topo(s.ra,s.dec,s.dist,lat,lon,J);
  const mt=topo(m.ra,m.dec,m.dist,lat,lon,J);
  const S=altaz(st.ra,st.dec,lat,st.lst), M=altaz(mt.ra,mt.dec,lat,mt.lst);
  // phase from geocentric elongation
  const psi=Math.acos(sin(s.dec)*sin(m.dec)+cos(s.dec)*cos(m.dec)*cos(s.ra-m.ra))*R2D;
  const i=Math.atan2(s.dist*sin(psi), m.dist-s.dist*cos(psi))*R2D;
  const k=(1+cos(i))/2;
  const age=norm(m.lam-s.lam);                       // 0 new, 180 full
  const diam=2*Math.atan(1737.4/mt.dist)*R2D*60;     // arcmin, topocentric
  const altApp=M.alt+refract(M.alt);
  const X=airmass(altApp);
  return {J,sun:S,moon:M,altApp,k,age,psi,i,diam,dist:mt.dist,geoDist:m.dist,X,
          beta:m.bet,lamM:m.lam,lamS:s.lam,sunDist:s.dist};
}
// position angle from zenith toward increasing azimuth, of B seen from A
export function paZen(A,B){
  const dA=B.az-A.az;
  return Math.atan2(cos(B.alt)*sin(dA), cos(A.alt)*sin(B.alt)-sin(A.alt)*cos(B.alt)*cos(dA))*R2D;
}
export function nextPhase(J0,target){   // target: 0 new … 180 full
  let J=J0;
  for(let i=0;i<80;i++){
    const s=sunPos(J), m=moonPos(J);
    let d=norm(m.lam-s.lam-target);
    if(d>180) d-=360;
    if(i>0 && Math.abs(d)<1e-4) break;
    J-=d/12.19;
    if(J<J0) J+=29.5306;
  }
  return J;
}
/* ─────────────── colour from extinction ─────────────── */
export const KB=0.30, KV=0.20, KR=0.12;
export function moonRGB(X){
  const x=Math.min(X,12);
  const tr=(k)=>Math.pow(10,-0.4*k*(x-1));
  let r=1.000*tr(KR), g=0.965*tr(KV), b=0.905*tr(KB);
  const mx=Math.max(r,g,b);
  return [r/mx, g/mx, b/mx];
}
export const css=(rgb,a=1)=>`rgba(${Math.round(rgb[0]*255)},${Math.round(rgb[1]*255)},${Math.round(rgb[2]*255)},${a})`;


