/* Desfazer/refazer e backup rápido */
(function(){
  'use strict';

  const undoStack=[], redoStack=[];
  function snap(){
    const o={}; for(const k in State.items) o[k]={...State.items[k]}; return JSON.stringify(o);
  }
  function restore(raw){
    try{
      State.items=JSON.parse(raw);
      if(typeof renderAll==='function') renderAll();
      else if(typeof render==='function') render();
      if(typeof updateDashboard==='function') updateDashboard();
      if(typeof autoSave==='function') autoSave();
    }catch(e){}
  }
  window.checklistHistory={
    checkpoint(){
      const s=snap();
      if(undoStack[undoStack.length-1]!==s){
        undoStack.push(s); if(undoStack.length>40) undoStack.shift(); redoStack.length=0;
      }
    },
    undo(){
      if(undoStack.length<2)return;
      redoStack.push(undoStack.pop()); restore(undoStack[undoStack.length-1]);
    },
    redo(){
      if(!redoStack.length)return;
      const s=redoStack.pop(); undoStack.push(s); restore(s);
    }
  };

  window.filterChecklist=function(q){
    q=String(q||'').trim().toLocaleLowerCase('pt-BR');
    document.querySelectorAll('.item-card').forEach(card=>{
      card.hidden=!!q && !card.textContent.toLocaleLowerCase('pt-BR').includes(q);
    });
  };

  window.downloadChecklistBackup=function(){
    try{
      const payload={
        version:1,
        exportedAt:new Date().toISOString(),
        form:{
          loja:document.getElementById('fLoja')?.value||'',
          data:document.getElementById('fData')?.value||'',
          responsavel:document.getElementById('fResp')?.value||'',
          regional:document.getElementById('fReg')?.value||''
        },
        items:State.items
      };
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob), a=document.createElement('a');
      a.href=url; a.download=`checklist-backup-${Date.now()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      if(typeof showToast==='function')showToast('Backup criado com sucesso!','success');
    }catch(e){ if(typeof showToast==='function')showToast('Não foi possível criar o backup.','error'); }
  };

  try{
    if((navigator.hardwareConcurrency && navigator.hardwareConcurrency<=4) ||
       matchMedia('(prefers-reduced-motion: reduce)').matches)
      document.documentElement.classList.add('performance-mode');
  }catch(e){}

  document.addEventListener('keydown',e=>{
    const typing=/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName);
    if((e.ctrlKey||e.metaKey)&&!typing&&e.key.toLowerCase()==='z'){
      e.preventDefault(); checklistHistory.undo();
    }else if((e.ctrlKey||e.metaKey)&&!typing&&e.key.toLowerCase()==='y'){
      e.preventDefault(); checklistHistory.redo();
    }
  },{passive:false});
})();
