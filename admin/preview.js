document.addEventListener('DOMContentLoaded',()=>{
  try {
    const raw=sessionStorage.getItem('bramble-preview');if(!raw)return;
    const result=Bramble.validate(JSON.parse(raw));if(result.errors.length)throw Error(result.errors.join(' '));
    document.querySelector('#card-preview').innerHTML=Bramble.card(result.item);
    document.querySelector('#latest-preview').innerHTML=Bramble.card({...result.item,is_latest_reel:true},{latest:true});
    renderGuide(result.item,{metadata:false});
  }catch(error){document.querySelector('#guide-root').textContent=error.message;}
});
