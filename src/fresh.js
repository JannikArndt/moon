/* Self-update. A phone keeps this page open for days and a Home Screen copy has no
   reload button, so the page asks for its own build id and reloads when a newer one
   is live. The id is stamped into <meta name="app-build"> by tools/version.mjs;
   unstamped ("dev") never checks. See CLAUDE.md, "Open copies update themselves". */
const FIRST_MS=20000, RETRY_MS=2000, POLL_MS=10*60*1000, KEY="moon:reloaded-for";
const born=Date.now();

export function startFresh(isQuiet){
  const meta=document.querySelector('meta[name="app-build"]');
  const mine=meta&&meta.content;
  if(!mine||mine==="dev") return;
  // Inside the sandboxed iframe (or any frame) the host owns reloading.
  try{ if(window.top!==window) return; }catch(e){ return; }
  // "Never twice for the same build" needs sessionStorage; without it a failed
  // load could loop, so skip the automatic reload altogether.
  let store=null;
  try{ sessionStorage.setItem(KEY+".probe","1"); sessionStorage.removeItem(KEY+".probe"); store=sessionStorage; }catch(e){}
  if(!store) return;

  let latest=null, retry=0;
  const done=b=>{ try{ return store.getItem(KEY)===b; }catch(e){ return true; } };

  function tryReload(){
    clearTimeout(retry);
    if(!latest||latest===mine||done(latest)) return;
    if(Date.now()-born<FIRST_MS||!isQuiet()){ retry=setTimeout(tryReload,RETRY_MS); return; }
    try{ store.setItem(KEY,latest); }catch(e){ return; }
    location.reload();
  }
  async function check(){
    try{
      const res=await fetch("version.json?t="+Date.now(),{cache:"no-store"});
      if(!res.ok) return;
      const b=(await res.json()).build;
      if(typeof b==="string"&&b){ latest=b; tryReload(); }
    }catch(e){}
  }
  document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible") check(); });
  window.addEventListener("pageshow",check);
  window.addEventListener("focus",check);
  setInterval(check,POLL_MS);
  check();
}
