/* State transitions, input handling and wiring. */
import {clamp,jd,observe,nextPhase} from "./astro.js";
import {CITIES} from "./data.js";
import {S,T,T0,DAY,PLACES,place,nearestCity,localToUTC,fmt,tzOff,
        yearStart,yearEnd,_setT,_setYear,bumpAnim,clearFrame,clearTracks,clearFullCache,
        phaseName} from "./state.js";
import {hitTest} from "./draw.js";
import {renderSky} from "./sky.js";
import {renderEcl} from "./orrery.js";
import {renderTimeline,tlMap} from "./timeline.js";
import {renderYearChart,renderTilt,yearBars} from "./charts.js";

/* ─────────────── draw / time ─────────────── */
const $=id=>document.getElementById(id);
let drawerOpen=false;
function draw(){
  const o=renderSky();
  renderEcl();
  renderTimeline();
  $("stamp").textContent=fmt(T,S.tz,{weekday:'short',day:'2-digit',month:'short',year:'numeric',
    hour:'2-digit',minute:'2-digit'})+" · "+phaseName(o.age);
  if(drawerOpen){ renderYearChart(); renderTilt(); }
}
function setT(ms){
  _setT(ms);
  const y=new Date(T).getUTCFullYear();
  if(Date.UTC(y,0,1)!==yearStart){
    _setYear(Date.UTC(y,0,1),Date.UTC(y+1,0,1)); clearFullCache();
  }
  draw();
}

/* ─────────────── time lives on the horizontal axis ─────────────── */
const stage=$("stage");
let hinted=false;
function usedScrub(){ if(hinted) return; hinted=true; const el=$("hint"); if(el) el.style.opacity=0; }
stage.addEventListener("wheel",e=>{
  e.preventDefault(); usedScrub();
  const unit=e.deltaMode===1?16:e.deltaMode===2?400:1;
  const d=Math.abs(e.deltaX)>=Math.abs(e.deltaY)?e.deltaX:e.deltaY;
  setT(T+d*unit*0.7*60000);
},{passive:false});
let drag=null;
stage.addEventListener("pointerdown",e=>{drag={x:e.clientX,t:T}; usedScrub(); stage.setPointerCapture(e.pointerId);});
stage.addEventListener("pointermove",e=>{ if(drag) setT(drag.t+(drag.x-e.clientX)*2.6*60000); });
stage.addEventListener("pointerup",()=>{drag=null;});
stage.addEventListener("pointercancel",()=>{drag=null;});

const tl=$("tl");
function tlSet(clientX){
  const r=tl.getBoundingClientRect();
  if(!tlMap) return;
  setT(clamp(tlMap.inv(clamp(clientX-r.left,0,r.width)),yearStart,yearEnd-1));
}
let tlDrag=false;
tl.addEventListener("pointerdown",e=>{tlDrag=true; tl.setPointerCapture(e.pointerId); tlSet(e.clientX);});
tl.addEventListener("pointermove",e=>{ if(tlDrag) tlSet(e.clientX); });
tl.addEventListener("pointerup",()=>{tlDrag=false;});
tl.addEventListener("pointercancel",()=>{tlDrag=false;});
tl.addEventListener("keydown",e=>{
  const step=e.shiftKey?DAY:3600000;
  if(e.key==="ArrowRight"){e.preventDefault(); setT(T+step);}
  if(e.key==="ArrowLeft"){e.preventDefault(); setT(T-step);}
});

$("play").onclick=()=>{
  S.playing=!S.playing;
  $("play").textContent=S.playing?"❚❚":"▶";
  $("play").classList.toggle("on",S.playing);
  if(S.playing) loop();
};
function loop(){ if(!S.playing) return; bumpAnim(1.4); setT(T+S.speed*60000); requestAnimationFrame(loop); }
$("bnow").onclick=()=>setT(Date.now());

function setDrawer(open){
  drawerOpen=open;
  $("sheet").classList.toggle("open",open);
  $("scrim").classList.toggle("on",open);
  $("gear").setAttribute("aria-expanded",open);
  if(open){ renderYearChart(); renderTilt(); }
}
$("gear").onclick=()=>setDrawer(!drawerOpen);
$("scrim").onclick=()=>setDrawer(false);
$("ychart").addEventListener("click",e=>{
  const r=e.target.getBoundingClientRect(), x=e.clientX-r.left;
  for(const b of yearBars) if(x>=b.x0&&x<=b.x1){ setT(b.ms); break; }
});
PLACES.forEach((p,i)=>{const op=document.createElement("option");op.value=i;op.textContent=p.n;$("place").append(op);});
$("place").onchange=e=>{
  S.place=+e.target.value; const p=PLACES[S.place];
  S.lat=p.lat; S.lon=p.lon; S.tz=p.tz;
  clearFrame(); clearTracks(); clearFullCache(); draw();
};
document.querySelectorAll("[data-mag]").forEach(b=>b.onclick=()=>{
  document.querySelectorAll("[data-mag]").forEach(x=>x.classList.remove("on"));
  b.classList.add("on"); S.mag=+b.dataset.mag; draw();
});
document.querySelectorAll("[data-speed]").forEach(b=>b.onclick=()=>{
  document.querySelectorAll("[data-speed]").forEach(x=>x.classList.remove("on"));
  b.classList.add("on"); S.speed=+b.dataset.speed;
});
window.addEventListener("resize",()=>draw());


/* ─────────────── tooltips ─────────────── */
const tip=$("tip");
let tipTimer=null;
function showTip(text,cx,cy){
  tip.textContent=text; tip.hidden=false;
  const r=tip.getBoundingClientRect();
  let x=cx+14, y=cy-r.height-12;
  if(x+r.width>innerWidth-8) x=cx-r.width-14;
  if(x<8) x=8;
  if(y<8) y=cy+18;
  tip.style.left=x+"px"; tip.style.top=y+"px";
}
function hideTip(){ tip.hidden=true; }
function wire(id,key){
  const el=$(id);
  el.addEventListener("pointermove",e=>{
    if(e.pointerType!=="mouse") return;
    const r=el.getBoundingClientRect();
    const hit=hitTest(key,e.clientX-r.left,e.clientY-r.top);
    hit?showTip(hit.text,e.clientX,e.clientY):hideTip();
  });
  el.addEventListener("pointerleave",hideTip);
  // touch: a tap that did not drag asks what is under the finger
  let dn=null;
  el.addEventListener("pointerdown",e=>{ if(e.pointerType!=="mouse") dn={x:e.clientX,y:e.clientY}; });
  el.addEventListener("pointerup",e=>{
    if(!dn) return;
    const moved=Math.hypot(e.clientX-dn.x,e.clientY-dn.y); dn=null;
    if(moved>6) return;
    const r=el.getBoundingClientRect();
    const hit=hitTest(key,e.clientX-r.left,e.clientY-r.top);
    if(hit){ showTip(hit.text,e.clientX,e.clientY);
      clearTimeout(tipTimer); tipTimer=setTimeout(hideTip,3600); }
  });
}
wire("sky","sky"); wire("ecl","ecl"); wire("tl","tl");

/* ─────────────── jump to a date ─────────────── */
const pop=$("datepop");
function openPop(){
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:S.tz,year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date(T))
    .reduce((a,x)=>(a[x.type]=x.value,a),{});
  $("dtin").value=`${p.year}-${p.month}-${p.day}T${p.hour%24===0?'00':String(p.hour).padStart(2,'0')}:${p.minute}`;
  pop.hidden=false; $("stamp").setAttribute("aria-expanded","true");
}
function closePop(){ pop.hidden=true; $("stamp").setAttribute("aria-expanded","false"); }
$("stamp").onclick=()=>pop.hidden?openPop():closePop();
$("dtgo").onclick=()=>{
  const v=$("dtin").value; if(!v) return closePop();
  const [d,t]=v.split("T"), [y,mo,da]=d.split("-").map(Number), [hh,mi]=(t||"12:00").split(":").map(Number);
  setT(localToUTC(y,mo-1,da,hh,mi,S.tz)); closePop();
};
document.addEventListener("pointerdown",e=>{
  if(!pop.hidden&&!pop.contains(e.target)&&e.target!==$("stamp")) closePop();
},true);

/* ─────────────── where are you? ─────────────── */
function applyPlace(lat,lon,tz,name){
  const mine=PLACES.find(p=>p.mine);
  const rec={n:name,lat,lon,tz,mine:true};
  if(mine){ Object.assign(mine,rec); }
  else{
    PLACES.push(rec);
    const op=document.createElement("option"); op.value=PLACES.length-1; op.textContent=name;
    $("place").append(op);
  }
  S.place=PLACES.findIndex(p=>p.mine);
  const opt=[...$("place").options].find(o=>+o.value===S.place); if(opt) opt.textContent=name;
  $("place").value=S.place;
  S.lat=lat; S.lon=lon; S.tz=tz;
  clearFrame(); clearTracks(); clearFullCache(); draw();
}
$("locate").onclick=()=>{
  const btn=$("locate"), note=$("locnote");
  if(!navigator.geolocation){ note.textContent="This browser offers no location service."; return; }
  btn.disabled=true; btn.textContent="locating…"; note.textContent="";
  navigator.geolocation.getCurrentPosition(p=>{
    const lat=p.coords.latitude, lon=p.coords.longitude;
    const tz=Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC";
    const c=nearestCity(lat,lon);
    const name=c.km<60?c.name:(c.km<400?"near "+c.name:tz.split("/").pop().replace(/_/g," "));
    applyPlace(lat,lon,tz,name);
    note.textContent=`${Math.abs(lat).toFixed(3)}°${lat>=0?"N":"S"}, ${Math.abs(lon).toFixed(3)}°${lon>=0?"E":"W"} · ${tz} · nearest city in the built-in list is ${c.name}, ${Math.round(c.km)} km away`;
    btn.disabled=false; btn.textContent="use my location";
  },err=>{
    note.textContent = err.code===1 ? "Location permission was declined."
      : "Could not get a position. Pick a place above instead.";
    btn.disabled=false; btn.textContent="use my location";
  },{enableHighAccuracy:false,timeout:10000,maximumAge:600000});
};

/* ─────────────── the sunlight keeps streaming ─────────────── */
const motionOK=!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);
function idle(){
  if(!motionOK) return;
  if(!S.playing&&!document.hidden){ bumpAnim(1.4); renderEcl(); }
  setTimeout(()=>requestAnimationFrame(idle),75);
}

$("place").value=0;
setT(Date.now());
idle();

