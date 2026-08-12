/* NUVScan — live camera QR scanning.
   NUVScan.start(videoEl, {onResult, onStatus}) -> {stop()}
   Uses the native BarcodeDetector when available, otherwise loads jsQR. */
(function(){
  /* ลองหลาย CDN — ถ้าตัวแรกล่ม/ถูกบล็อก ก็ยังโหลด decoder ได้ */
  var JSQR_URLS = [
    'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js',
    'https://unpkg.com/jsqr@1.4.0/dist/jsQR.js',
    'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js'
  ];
  function loadScript(url){
    return new Promise(function(res, rej){
      var s=document.createElement('script');
      s.src=url; s.async=true;
      s.onload=function(){ window.jsQR ? res(window.jsQR) : rej(new Error('decoder')); };
      s.onerror=function(){ rej(new Error('decoder')); };
      document.head.appendChild(s);
    });
  }
  function loadJsQR(){
    if(window.jsQR) return Promise.resolve(window.jsQR);
    if(window.__jsqrP) return window.__jsqrP;
    window.__jsqrP = JSQR_URLS.reduce(function(p, url){
      return p.catch(function(){ return loadScript(url); });
    }, Promise.reject());
    return window.__jsqrP;
  }

  function start(video, opts){
    opts = opts || {};
    var status = opts.onStatus || function(){}, done = opts.onResult || function(){};
    var stopped = false, stream = null, raf = null, detector = null, jsqr = null, last = 0, frames = 0;
    var canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', {willReadFrequently:true});

    function stop(){
      stopped = true;
      if(raf) cancelAnimationFrame(raf);
      if(stream) stream.getTracks().forEach(function(t){ t.stop(); });
      if(video){ try{ video.srcObject = null; }catch(e){} }
    }

    (async function(){
      status('starting');
      try{
        var diag = window.NUVScan.diagnose();
        if(diag) throw Object.assign(new Error(diag), {nuvReason:diag});
        // iOS/Safari ต้องตั้ง attribute เหล่านี้ "ก่อน" ผูก stream ไม่งั้นจะเด้งเป็นวิดีโอเต็มจอหรือไม่เล่นเลย
        video.setAttribute('playsinline','');
        video.setAttribute('webkit-playsinline','');
        video.setAttribute('autoplay','');
        video.setAttribute('muted','');
        video.muted = true;
        try{
          stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}, width:{ideal:1280}}, audio:false});
        }catch(e1){
          // บางเครื่อง/บางเบราว์เซอร์ปฏิเสธ constraint กล้องหลัง — ลองกล้องใดก็ได้
          if(e1 && (e1.name==='NotAllowedError' || e1.name==='SecurityError')) throw e1;
          stream = await navigator.mediaDevices.getUserMedia({video:true, audio:false});
        }
        if(stopped){ stream.getTracks().forEach(function(t){t.stop();}); return; }
        video.srcObject = stream;
        // play() ถูก reject ได้แม้ stream ใช้งานได้จริง (เช่น AbortError ตอนสลับแท็บ) — อย่าล้มทั้งกระบวนการ
        try{ await video.play(); }
        catch(ep){
          await new Promise(function(res){
            var t = setTimeout(res, 1200);
            video.onloadedmetadata = function(){ clearTimeout(t); video.play().catch(function(){}); res(); };
          });
        }
      }catch(e){
        status(window.NUVScan.reasonOf(e));
        return;
      }
      try{
        if('BarcodeDetector' in window){
          var fmts = await window.BarcodeDetector.getSupportedFormats();
          if(fmts.indexOf('qr_code')>=0) detector = new window.BarcodeDetector({formats:['qr_code']});
        }
        if(!detector) jsqr = await loadJsQR();
      }catch(e){ /* fall through — try again per frame */ }
      if(!detector && !jsqr){ status('nodecoder'); return; }
      status('scanning');

      function tick(ts){
        if(stopped) return;
        raf = requestAnimationFrame(tick);
        if(ts - last < 120) return;
        last = ts;
        var w = video.videoWidth, h = video.videoHeight;
        if(!w || !h) return;
        var scale = Math.min(1, 640/Math.max(w,h));
        canvas.width = Math.round(w*scale); canvas.height = Math.round(h*scale);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        if(detector){
          detector.detect(canvas).then(function(codes){
            if(!stopped && codes && codes.length){ stop(); done(codes[0].rawValue); }
          }).catch(function(){});
        } else {
          var img = ctx.getImageData(0,0,canvas.width,canvas.height);
          // สลับโหมดกลับสี — ช่วยกรณีแสงน้อย / QR สีกลับด้าน
          frames++;
          var mode = (frames % 4 === 0) ? 'attemptBoth' : 'dontInvert';
          var r = jsqr(img.data, canvas.width, canvas.height, {inversionAttempts:mode});
          if(r && r.data){ stop(); done(r.data); }
        }
      }
      raf = requestAnimationFrame(tick);
    })();

    return {stop: stop};
  }

  async function decodeImage(fileOrUrl){
    var src = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl);
    var img = await new Promise(function(res, rej){
      var i = new Image(); i.onload=function(){res(i);}; i.onerror=rej; i.crossOrigin='anonymous'; i.src=src;
    });
    var scale = Math.min(1, 1000/Math.max(img.width, img.height));
    var cv = document.createElement('canvas');
    cv.width = Math.round(img.width*scale); cv.height = Math.round(img.height*scale);
    var cx = cv.getContext('2d', {willReadFrequently:true});
    cx.drawImage(img, 0, 0, cv.width, cv.height);
    if(typeof fileOrUrl !== 'string') URL.revokeObjectURL(src);
    if('BarcodeDetector' in window){
      try{
        var fmts = await window.BarcodeDetector.getSupportedFormats();
        if(fmts.indexOf('qr_code')>=0){
          var codes = await new window.BarcodeDetector({formats:['qr_code']}).detect(cv);
          if(codes && codes.length) return codes[0].rawValue;
        }
      }catch(e){}
    }
    var jq = await loadJsQR();
    var data = cx.getImageData(0,0,cv.width,cv.height);
    var r = jq(data.data, cv.width, cv.height) || jq(data.data, cv.width, cv.height, {inversionAttempts:'attemptBoth'});
    return r && r.data ? r.data : null;
  }

  /* Why can the camera not start here? Returns a reason key, or '' when a real
     getUserMedia attempt is worth making. */
  function diagnose(){
    if(!window.isSecureContext && location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return 'insecure';
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return 'unsupported';
    // อยู่ใน iframe ก็ยังลองเปิดกล้องเสมอ — พรีวิวหลายตัวอนุญาตกล้องอยู่แล้ว
    // ถ้าถูกบล็อกจริง getUserMedia จะโยน error แล้ว reasonOf() จะรายงานเอง
    return '';
  }
  function reasonOf(e){
    if(e && e.nuvReason) return e.nuvReason;
    var n = e && e.name;
    if(n === 'NotAllowedError' || n === 'SecurityError'){
      // "framed" เฉพาะเมื่ออยู่ใน iframe จริง และ iframe นั้นไม่ได้รับสิทธิ์กล้อง
      if(!isFramed()) return 'denied';
      return cameraAllowedByPolicy() ? 'denied' : 'framed';
    }
    if(n === 'NotFoundError' || n === 'OverconstrainedError' || n === 'DevicesNotFoundError') return 'nocam';
    if(n === 'NotReadableError' || n === 'TrackStartError' || n === 'AbortError') return 'busy';
    return 'nocam';
  }

  /* --- สแกนในหน้าต่างใหม่ ---
     พรีวิว/iframe ที่ไม่ได้รับ allow="camera" จะขอกล้องไม่ได้เลย แต่หน้าต่างที่เปิดใหม่
     เป็น top-level context จึงขอสิทธิ์กล้องได้จริง เราเขียนหน้าสแกนแบบสมบูรณ์ลงไป
     แล้วส่งค่าที่อ่านได้กลับมาทาง postMessage */
  var POPUP_HTML = [
'<!DOCTYPE html><html lang="th"><head><meta charset="utf-8">',
'<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
'<title>NU Volunteer · สแกน QR</title>',
'<style>',
'*{box-sizing:border-box}html,body{margin:0;height:100%;background:#12101a;color:#fff;',
'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans Thai",sans-serif}',
'body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:20px;text-align:center}',
'#w{position:relative;width:100%;max-width:460px;aspect-ratio:4/3;border-radius:22px;overflow:hidden;background:#000}',
'video{width:100%;height:100%;object-fit:cover;display:block}',
'#sh{position:absolute;inset:0;box-shadow:inset 0 0 0 100vmax rgba(18,16,26,.34);pointer-events:none}',
'#g{position:absolute;left:12%;right:12%;top:12%;bottom:12%;pointer-events:none}',
'#g i{position:absolute;width:28px;height:28px;border:0 solid rgba(255,255,255,.94)}',
'#g i:nth-child(1){left:0;top:0;border-top-width:3px;border-left-width:3px;border-top-left-radius:12px}',
'#g i:nth-child(2){right:0;top:0;border-top-width:3px;border-right-width:3px;border-top-right-radius:12px}',
'#g i:nth-child(3){left:0;bottom:0;border-bottom-width:3px;border-left-width:3px;border-bottom-left-radius:12px}',
'#g i:nth-child(4){right:0;bottom:0;border-bottom-width:3px;border-right-width:3px;border-bottom-right-radius:12px}',
'#ln{position:absolute;left:12%;right:12%;height:2px;background:#63D2A1;box-shadow:0 0 12px #63D2A1;animation:sc 2.6s ease-in-out infinite}',
'@keyframes sc{0%{top:13%}50%{top:87%}100%{top:13%}}',
'#ok{position:absolute;left:12%;right:12%;top:12%;bottom:12%;border-radius:18px;display:none;',
'box-shadow:0 0 0 3px #63D2A1,0 0 28px rgba(99,210,161,.7);background:rgba(99,210,161,.16)}',
'h1{font-size:17px;font-weight:600;margin:0}',
'p{font-size:13px;line-height:1.7;color:#C9C6D4;margin:0;max-width:440px}',
'button{font:inherit;font-size:13.5px;padding:12px 20px;border-radius:13px;border:none;cursor:pointer;',
'background:linear-gradient(135deg,#E97171,#A774F7);color:#fff;font-weight:500}',
'</style></head><body>',
'<h1 id="t">แตะเพื่อเปิดกล้อง</h1>',
'<div id="w"><video id="v" playsinline webkit-playsinline autoplay muted></video>',
'<div id="sh"></div><div id="g"><i></i><i></i><i></i><i></i></div><div id="ln"></div><div id="ok"></div></div>',
'<p id="m">เล็งกล้องไปที่ QR ที่ผู้จัดกิจกรรมแสดงอยู่ · หน้าต่างนี้จะปิดเองเมื่อสแกนสำเร็จ</p>',
'<button id="s">เปิดกล้อง</button>',
'<button id="r" style="display:none">ลองอีกครั้ง</button>',
'<script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js"><\/script>',
'<script>(function(){',
'var v=document.getElementById("v"),t=document.getElementById("t"),m=document.getElementById("m"),',
'ok=document.getElementById("ok"),ln=document.getElementById("ln"),rb=document.getElementById("r"),sb=document.getElementById("s");',
'var cv=document.createElement("canvas"),cx=cv.getContext("2d",{willReadFrequently:true});',
'var stream=null,det=null,raf=null,fr=0,last=0,dead=false;',
'function say(a,b){t.textContent=a;m.textContent=b||"";}',
'function halt(){dead=true;if(raf)cancelAnimationFrame(raf);if(stream)stream.getTracks().forEach(function(x){x.stop();});}',
'function chirp(){try{if(navigator.vibrate)navigator.vibrate([28,40,28]);}catch(e){}',
'try{var A=window.AudioContext||window.webkitAudioContext;if(!A)return;var ac=new A(),o=ac.createOscillator(),g=ac.createGain(),n=ac.currentTime;',
'o.type="sine";o.frequency.setValueAtTime(880,n);o.frequency.setValueAtTime(1320,n+0.09);',
'g.gain.setValueAtTime(0.0001,n);g.gain.exponentialRampToValueAtTime(0.16,n+0.02);g.gain.exponentialRampToValueAtTime(0.0001,n+0.22);',
'o.connect(g).connect(ac.destination);o.start(n);o.stop(n+0.24);}catch(e){}}',
'function send(val){halt();ln.style.display="none";ok.style.display="block";chirp();',
'say("อ่าน QR สำเร็จ","กำลังส่งข้อมูลกลับไปที่ระบบ…");',
'try{if(window.opener)window.opener.postMessage({__nuvScan:String(val)},"*");}catch(e){}',
'try{var bc=new BroadcastChannel("nuv-scan");bc.postMessage({__nuvScan:String(val)});}catch(e){}',
'try{localStorage.setItem("nuv-scan-result",JSON.stringify({v:String(val),t:Date.now()}));}catch(e){}',
'setTimeout(function(){try{window.close();}catch(e){}},700);}',
'function fail(e){halt();ln.style.display="none";rb.style.display="inline-block";var n=e&&e.name;',
'if(n==="NotAllowedError")say("ยังไม่ได้อนุญาตให้ใช้กล้อง","กดอนุญาตกล้องให้กับเว็บนี้ แล้วกดลองอีกครั้ง");',
'else if(n==="NotFoundError"||n==="OverconstrainedError")say("ไม่พบกล้องบนอุปกรณ์นี้","กลับไปที่ระบบแล้วใช้วิธีอัปโหลดรูป QR แทน");',
'else if(n==="NotReadableError"||n==="TrackStartError")say("กล้องถูกใช้งานโดยแอปอื่น","ปิดแอปหรือแท็บที่ใช้กล้องอยู่ แล้วกดลองอีกครั้ง");',
'else if(n==="timeout")say("กล้องไม่ตอบสนอง","อาจยังไม่ได้ตอบกล่องขอสิทธิ์กล้อง กดลองอีกครั้งแล้วเลือก “อนุญาต”");',
'else say("เปิดกล้องไม่สำเร็จ","กดลองอีกครั้ง หรือกลับไปใช้วิธีอัปโหลดรูป QR");}',
'rb.onclick=function(){rb.style.display="none";sb.style.display="none";ln.style.display="block";dead=false;go();};',
'sb.onclick=function(){sb.style.display="none";ln.style.display="block";say("กำลังเปิดกล้อง…","");go();};',
'function tick(ts){if(dead)return;raf=requestAnimationFrame(tick);if(ts-last<110)return;last=ts;',
'var w=v.videoWidth,h=v.videoHeight;if(!w||!h)return;var s=Math.min(1,640/Math.max(w,h));',
'cv.width=Math.round(w*s);cv.height=Math.round(h*s);cx.drawImage(v,0,0,cv.width,cv.height);',
'if(det){det.detect(cv).then(function(c){if(!dead&&c&&c.length)send(c[0].rawValue);}).catch(function(){});return;}',
'if(!window.jsQR)return;fr++;var im=cx.getImageData(0,0,cv.width,cv.height);',
'var r=window.jsQR(im.data,cv.width,cv.height,{inversionAttempts:(fr%4===0)?"attemptBoth":"dontInvert"});',
'if(r&&r.data)send(r.data);}',
'function go(){var to=setTimeout(function(){if(!stream)fail({name:"timeout"});},15000);navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1280}},audio:false})',
'.catch(function(e){if(e&&(e.name==="NotAllowedError"||e.name==="SecurityError"))throw e;return navigator.mediaDevices.getUserMedia({video:true,audio:false});})',
'.then(function(st){clearTimeout(to);stream=st;v.srcObject=st;v.muted=true;return v.play().catch(function(){});})',
'.then(function(){say("พร้อมสแกนแล้ว","เล็งกล้องไปที่ QR ที่ผู้จัดกิจกรรมแสดงอยู่ · หน้าต่างนี้จะปิดเองเมื่อสแกนสำเร็จ");',
'if("BarcodeDetector" in window){return window.BarcodeDetector.getSupportedFormats().then(function(f){',
'if(f.indexOf("qr_code")>=0)det=new window.BarcodeDetector({formats:["qr_code"]});}).catch(function(){});}})',
'.then(function(){raf=requestAnimationFrame(tick);}).catch(fail);}',
'if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){sb.style.display="none";fail({name:"unsupported"});}',
'else{ln.style.display="none";say("แตะเพื่อเปิดกล้อง","เบราว์เซอร์จะถามสิทธิ์กล้องหลังจากคุณแตะปุ่มด้านล่าง");}',
'window.addEventListener("pagehide",halt);window.addEventListener("beforeunload",halt);',
'})();<\/script></body></html>'].join('\n');

  /* เปิดหน้าต่างสแกน — ต้องเรียกจาก user gesture (onclick) ไม่งั้นถูกบล็อกป๊อปอัป */
  function startPopup(opts){
    opts = opts || {};
    var done = opts.onResult || function(){}, status = opts.onStatus || function(){};
    /* blob: สืบทอด origin ของหน้าแม่ (https) จึงเป็น secure context ที่ขอกล้องได้
       ต่างจาก about:blank ที่ iOS Safari ปฏิเสธ getUserMedia เสมอ */
    var url = null;
    try{ url = URL.createObjectURL(new Blob([POPUP_HTML], {type:'text/html'})); }catch(e){}
    var win = null;
    try{ win = window.open(url || '', 'nuvScan', 'width=520,height=680,menubar=no,toolbar=no'); }catch(e){}
    if(!win){ if(url) URL.revokeObjectURL(url); status('popupblocked'); return {stop:function(){}}; }
    if(!url){
      try{ win.document.open(); win.document.write(POPUP_HTML); win.document.close(); }
      catch(e){ status('popupblocked'); try{ win.close(); }catch(e2){} return {stop:function(){}}; }
    }
    if(url) setTimeout(function(){ URL.revokeObjectURL(url); }, 60000);
    status('popup');
    var closed = false;
    function onMsg(ev){
      if(!ev.data || typeof ev.data !== 'object' || typeof ev.data.__nuvScan !== 'string') return;
      cleanup();
      done(ev.data.__nuvScan);
    }
    function cleanup(){
      if(closed) return; closed = true;
      window.removeEventListener('message', onMsg);
      window.removeEventListener('storage', onStore);
      try{ if(bc) bc.close(); }catch(e){}
      clearInterval(poll);
    }
    var poll = setInterval(function(){
      if(win.closed){ cleanup(); status('popupclosed'); }
    }, 700);
    var bc = null;
    try{
      bc = new BroadcastChannel('nuv-scan');
      bc.onmessage = function(ev){ if(ev.data && typeof ev.data.__nuvScan === 'string'){ cleanup(); done(ev.data.__nuvScan); } };
    }catch(e){}
    function onStore(ev){
      if(ev.key !== 'nuv-scan-result' || !ev.newValue) return;
      try{
        var d = JSON.parse(ev.newValue);
        if(d && d.v && Date.now() - d.t < 20000){ cleanup(); done(d.v); }
      }catch(e2){}
    }
    window.addEventListener('storage', onStore);
    window.addEventListener('message', onMsg);
    return {stop:function(){ cleanup(); try{ win.close(); }catch(e){} }};
  }

  function isFramed(){
    try{ return window.self !== window.top; }catch(e){ return true; }
  }
  /* iframe นี้ได้รับ allow="camera" หรือไม่ — ถ้าได้ error ที่เกิดขึ้นคือผู้ใช้ปฏิเสธเอง ไม่ใช่เพราะพรีวิว */
  function cameraAllowedByPolicy(){
    try{
      var fp = document.featurePolicy || document.permissionsPolicy;
      if(fp && typeof fp.allowsFeature === 'function') return !!fp.allowsFeature('camera');
    }catch(e){}
    return false;
  }
  /* เสียง + สั่น ตอนสแกนสำเร็จ */
  function feedback(){
    try{ if(navigator.vibrate) navigator.vibrate([28, 40, 28]); }catch(e){}
    try{
      var AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return;
      var ac = window.__nuvAC || (window.__nuvAC = new AC());
      if(ac.state === 'suspended') ac.resume();
      var o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
      o.type = 'sine'; o.frequency.setValueAtTime(880, t); o.frequency.setValueAtTime(1320, t + 0.09);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.24);
    }catch(e){}
  }

  window.NUVScan = {start: start, startPopup: startPopup, decodeImage: decodeImage, diagnose: diagnose, reasonOf: reasonOf, isFramed: isFramed, cameraAllowedByPolicy: cameraAllowedByPolicy, feedback: feedback};
})();
