/* Ferramentas de campo: densidade, tela ligada, tempo de visita */
/* Funções de campo: densidade, tela ligada e tempo de visita */
let _wake=null;
function setDensity(on){document.body.classList.toggle('compact',on);try{localStorage.setItem('ti-density',on?'1':'0')}catch(e){}}
async function setWake(on){try{if(on&&navigator.wakeLock){_wake=await navigator.wakeLock.request('screen')}else if(_wake){await _wake.release();_wake=null}localStorage.setItem('ti-wake',on?'1':'0')}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&localStorage.getItem('ti-wake')==='1')setWake(true)});
window.addEventListener('load',()=>{
  const d=localStorage.getItem('ti-density')==='1',w=localStorage.getItem('ti-wake')==='1';
  setTimeout(()=>{const a=document.getElementById('densityToggle'),b=document.getElementById('wakeToggle');if(a)a.checked=d;if(b)b.checked=w;if(d)setDensity(true);if(w)setWake(true);
    const info=document.querySelector('.brand-info');if(info){const t=document.createElement('div');t.className='visit-timer';info.appendChild(t);
      let st=+localStorage.getItem('ti-visit-start')||0;if(!st||Date.now()-st>864e5){st=Date.now();localStorage.setItem('ti-visit-start',st)}
      const tick=()=>{const m=Math.floor((Date.now()-st)/6e4);t.textContent='Visita: '+Math.floor(m/60)+'h'+String(m%60).padStart(2,'0')};tick();setInterval(tick,3e4)}},400)});
