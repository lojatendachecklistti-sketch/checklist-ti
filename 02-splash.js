/* Tela de carregamento (splash): progresso real */
/* Controle da tela de carregamento: barra de progresso real + etapas */
(function(){
  var root=document.documentElement, reduce=false;
  try{reduce=matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}
  if(!reduce) root.classList.add('fx');
  var t0=performance.now(), MIN_MS=1500;
  var splash=document.getElementById('splash'), bar=document.getElementById('splashBar'),
      pct=document.getElementById('splashPct'), status=document.getElementById('splashStatus');
  var shown=0, target=6, finished=false, last=t0, hideTimer=0, raf=0;
  function setStatus(t){
    if(!status||!t||status.textContent===t) return;
    status.classList.add('swap');
    setTimeout(function(){status.textContent=t;status.classList.remove('swap')},160);
  }
  function tick(now){
    var dt=Math.min(64,now-last); last=now;
    if(!finished && target<92) target+=dt*0.004;
    shown+=(target-shown)*(1-Math.pow(0.0015,dt/1000));
    if(Math.abs(target-shown)<0.05) shown=target;
    if(bar) bar.style.width=shown.toFixed(1)+'%';
    if(pct) pct.textContent=Math.round(shown)+'%';
    if(splash&&splash.classList.contains('hidden')){
      if(!hideTimer) hideTimer=setTimeout(function(){splash.style.display='none'},700);
      return;
    }
    raf=requestAnimationFrame(tick);
  }
  raf=requestAnimationFrame(tick);
  setTimeout(function(){ if(!finished) setStatus('Aguardando conexão…'); },12000);
  window.SplashFX={
    step:function(p,label){ if(finished) return; if(p>target) target=p; setStatus(label); },
    done:function(cb){
      if(finished){ if(cb) cb(); return; }
      finished=true;
      var wait=Math.max(0,MIN_MS-380-(performance.now()-t0));
      setTimeout(function(){
        target=100; setStatus('Tudo pronto');
        setTimeout(function(){
          if(splash) splash.classList.add('hidden');
          if(cb) cb();
        },420);
      },wait);
    }
  };
})();
