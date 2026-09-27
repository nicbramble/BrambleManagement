'use strict';
const $ = selector=>document.querySelector(selector);
let resources=[],current=null,editingBase=null,queue=[],queueIndex=0,dirty=false,objectURL='',slugEdited=false;
const key='bramble_resources';
const extraFields=['id','created_at','updated_at','toc_title','toc_description','prompt_toolbar','prompt_copy_success','sources_intro'];
const labels={slug:'URL slug',title:'Title',category:'Category',description:'Short description',body:'Guide Markdown',badge:'Optional badge',published_at:'Publication date (ISO)',format:'Format',read_time:'Reading time (optional)',image_url:'Image path',image_alt:'Image description',download_url:'Download path',download_label:'Download button text',action_url:'Open / action URL',action_label:'Action button text',cta_label:'End-of-guide link text',cta_url:'End-of-guide URL',cta_eyebrow:'CTA eyebrow',cta_heading:'CTA heading',cta_description:'CTA description',sources:'Sources (JSON array)',sort_order:'Display order'};
function status(message){$('#studio-status').textContent=message;}
function message(text){$('#editor-message').textContent=text;}
function initFields(){
  $('#editor-fields').innerHTML=Object.entries(labels).map(([field,label])=>{
    const long=['description','body','sources','cta_description'].includes(field),wide=['title','description','body','sources'].includes(field);
    return `<label class="${wide?'wide':''}">${label}${long?`<textarea id="${field}" rows="${field==='body'?14:3}" ${Bramble.required.includes(field)?'required':''}></textarea>`:`<input id="${field}" ${field==='sort_order'?'type="number" step="1"':'type="text"'} ${Bramble.required.includes(field)?'required':''}>`}${field==='body'?'<span class="field-hint">## headings, ### subheadings, lists, **bold**, *italic* and fenced ```prompt blocks. HTML is displayed as text.</span>':''}</label>`;
  }).join('');
}
function renderList(){
  $('#resource-list').innerHTML='';
  for(const item of resources){const b=document.createElement('button');b.type='button';b.classList.toggle('active',item.slug===editingBase);const t=document.createElement('strong');t.textContent=item.title;const s=document.createElement('small');s.textContent=`${item.published?'Published in export':'Draft'} · ${Bramble.category(item.category)}${item.is_latest_reel?' · Latest Reel':''}`;b.append(t,s);b.addEventListener('click',()=>{if(canLeave()){queue=[];edit(item);}});$('#resource-list').append(b);}
  for(const [select,field] of [['#existing-image','image_url'],['#existing-download','download_url']]){
    const el=$(select);el.replaceChildren(new Option('Choose an existing repository asset',''));[...new Set(resources.map(r=>r[field]).filter(Boolean))].forEach(path=>el.add(new Option(path,path)));
  }
}
function canLeave(){return !dirty || confirm('You have unsaved edits. Discard them and continue?');}
function edit(item={},base=item.slug || null){
  current=structuredClone(item);editingBase=base;dirty=false;slugEdited=Boolean(item.slug);
  for(const field of Object.keys(labels))$('#'+field).value=field==='sources'?JSON.stringify(item.sources || [],null,2):item[field] ?? (field==='sort_order'?100:'');
  for(const field of ['published','featured','is_latest_reel'])$('#'+field).checked=item[field]===true;
  $('#editor-title').textContent=item.title || 'New draft';
  $('#queue-status').textContent=queue.length?`Review ${queueIndex+1} of ${queue.length}. Edit, preview and save each resource. Existing matching slugs require confirmation.`:'';
  $('#next-import').hidden=!queue.length || queueIndex>=queue.length-1;
  $('#delete-button').disabled=!editingBase;
  $('#preview-panel').open=false;message('');renderList();
}
function payload(){
  const item={};for(const field of extraFields)if(current?.[field]!==undefined)item[field]=current[field];
  for(const field of Object.keys(labels)){
    const value=$('#'+field).value.trim();
    if(field==='sources'){try{item.sources=JSON.parse(value || '[]');}catch{throw Error('Sources: paste a JSON array such as [{"label":"Reference","url":"https://example.com"}].');}}
    else if(field==='sort_order')item[field]=Number(value);
    else if(value)item[field]=value;
  }
  for(const field of ['published','featured','is_latest_reel'])item[field]=$('#'+field).checked;
  const result=Bramble.validate(item);if(result.errors.length)throw Error(result.errors.join('\n'));
  return result.item;
}
async function checkAssets(item){
  const errors=[];
  for(const field of ['image_url','download_url'])if(item[field]){
    try{const safe=Bramble.assetURL(item[field],field==='image_url'?'image':'download');if(!safe)throw Error();const response=await fetch(safe,{method:'HEAD'});if(!response.ok)throw Error();const type=response.headers.get('content-type') || '';if(field==='image_url'&&!type.startsWith('image/'))throw Error();if(field==='download_url'&&type.includes('text/html'))throw Error();}
    catch{errors.push(`${field}: “${item[field]}” is missing or cannot be verified. Add the file to the repository and reload before publishing.`);}
  }
  return errors;
}
async function save(event){
  event.preventDefault();$('#save-button').disabled=true;
  try{
    let item=payload();const warnings=await checkAssets(item);
    if(warnings.length && item.published){item.published=false;$('#published').checked=false;message(warnings.join('\n')+'\nSaved as a draft instead.');}else message('');
    const collision=resources.find(r=>r.slug===item.slug && (r.slug!==editingBase || queue.length));
    if(collision && !confirm(`Replace existing resource “${collision.title}” (${collision.slug}) with these edits? Export a backup first if you need the old version.`))return;
    const previous=resources.find(r=>r.published&&r.is_latest_reel&&r.slug!==editingBase&&r.slug!==item.slug);
    if(item.published&&item.is_latest_reel&&previous&&!confirm(`Make “${item.title}” the Latest Reel? This removes that label from “${previous.title}”.`))return;
    item.updated_at=new Date().toISOString();item.created_at ||= item.updated_at;if(item.published)item.published_at ||= item.updated_at;
    const next=Bramble.upsert(resources,item,{replaceSlug:editingBase,confirmOverwrite:true,confirmLatest:true});
    localStorage.setItem(key,JSON.stringify(next));resources=next;current=item;editingBase=item.slug;dirty=false;renderList();
    message(warnings.length?warnings.join('\n')+'\nSaved as a draft.':`Saved ${item.published?'as published in this browser’s export':'as a draft'}. Export all resources to update the repository; the live site has not changed.`);
  }catch(error){message(error.message);}finally{$('#save-button').disabled=false;}
}
function downloadJSON(data,name){const blob=new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'});const href=URL.createObjectURL(blob);const a=document.createElement('a');a.href=href;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);}
async function copyText(text,label){try{await navigator.clipboard.writeText(text);status(`${label} copied.`);}catch{status(`Clipboard unavailable. Use the linked ${label} file or export control instead.`);}}
async function copyFile(path,label){try{const r=await fetch(path);if(!r.ok)throw Error();await copyText(await r.text(),label);}catch{status(`Could not load ${label}. Open ${path} from the repository.`);}}
async function preview(){try{const item=payload();sessionStorage.setItem('bramble-preview',JSON.stringify(item));$('#preview-panel').open=true;$('#resource-preview').src='preview.html';message('Preview updated from the public card and guide renderers.');}catch(error){message(error.message);}}
function suggested(file,kind){const ext=file.name.split('.').pop().toLowerCase();const allowed=kind==='image'?['jpg','jpeg','png','webp','avif']:['pdf','txt','csv','json','zip'];if(!allowed.includes(ext))throw Error('Unsupported file type. Choose a standard image, PDF, text, CSV, JSON or ZIP file.');const base=file.name.replace(/\.[^.]+$/,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80)||'resource';return `/${kind==='image'?'assets':'downloads'}/${base}.${ext}`;}
function selectAsset(file,kind){
  if(!file)return;
  try{
    if(file.size>25*1024*1024)throw Error('Choose a file smaller than 25 MB. Optimize large assets first.');
    const path=suggested(file,kind);$('#'+(kind==='image'?'image_url':'download_url')).value=path;
    if(kind==='image'){if(objectURL)URL.revokeObjectURL(objectURL);objectURL=URL.createObjectURL(file);$('#asset-preview').src=objectURL;$('#asset-preview').hidden=false;}
    $('#published').checked=false;dirty=true;$('#asset-instructions').textContent=`Add the original file to BrambleManagement${path}. This selection is preview-only; the file has not been uploaded. The resource is now a draft. Use “Check asset paths” after adding it, then choose Published.`;
  }catch(error){$('#asset-instructions').textContent=error.message;}
}
async function init(){
  initFields();
  try{resources=await Bramble.load({local:true});edit();}catch(error){status(error.message);$('#resource-form').querySelectorAll('input,textarea,button').forEach(e=>e.disabled=true);return;}
  if(window.BRAMBLE_CONFIG?.supabaseUrl)status('Shared database reads remain configured on the public site. This studio still edits a local export; use authenticated database administration for shared publishing.');
  $('#resource-form').addEventListener('submit',save);
  $('#resource-form').addEventListener('input',()=>{dirty=true;});
  $('#title').addEventListener('input',()=>{$('#editor-title').textContent=$('#title').value || 'New draft';if(!slugEdited)$('#slug').value=$('#title').value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');});
  $('#slug').addEventListener('input',()=>{slugEdited=true;});
  $('#new-button').addEventListener('click',()=>{if(canLeave()){queue=[];edit();$('#title').focus();}});
  $('#import-button').addEventListener('click',()=>{$('#import-panel').hidden=!$('#import-panel').hidden;if(!$('#import-panel').hidden)$('#import-text').focus();});
  $('#import-file').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;if(file.size>2000000){$('#import-message').textContent='Import files must be smaller than 2 MB.';return;}$('#import-text').value=await file.text();});
  $('#validate-import').addEventListener('click',()=>{try{const result=Bramble.parseImport($('#import-text').value,{publish:$('#import-publish').checked});if(!canLeave())return;queue=result.items;queueIndex=0;const collisions=queue.filter(r=>resources.some(old=>old.slug===r.slug)).map(r=>r.slug);$('#import-message').textContent=`Validated ${queue.length} resource(s). ${collisions.length?'Existing slugs (saving will ask before replacing): '+collisions.join(', ')+'. ':''}${result.warnings.join('\n')}`;edit(queue[0],null);dirty=true;$('#editor').scrollIntoView();}catch(error){$('#import-message').textContent=error.message;}});
  $('#next-import').addEventListener('click',()=>{if(canLeave()){queueIndex++;edit(queue[queueIndex],null);dirty=true;}});
  $('#preview-button').addEventListener('click',preview);
  $('#verify-assets').addEventListener('click',async()=>{try{const warnings=await checkAssets(payload());$('#asset-status').textContent=warnings.length?warnings.join('\n'):'All asset paths are available. You can choose Published after previewing.';}catch(error){$('#asset-status').textContent=error.message;}});
  $('#export-all').addEventListener('click',()=>{if(dirty&&!confirm('The export contains saved resources only. Continue without your unsaved edits?'))return;downloadJSON(resources,'resources.json');status('Exported saved resources. Replace data/resources.json, add assets, then run node scripts/build-resources.cjs. Review before deploying.');});
  $('#export-one').addEventListener('click',()=>{try{const item=payload();downloadJSON(item,item.slug+'.json');status('Exported this resource. Import into the studio to merge into a complete resources.json.');}catch(error){message(error.message);}});
  $('#duplicate-button').addEventListener('click',()=>{try{const item=payload();if(!canLeave())return;let slug=item.slug+'-copy';while(resources.some(r=>r.slug===slug))slug+='-copy';delete item.id;delete item.created_at;delete item.updated_at;delete item.published_at;queue=[];edit({...item,slug,title:item.title+' (copy)',published:false,is_latest_reel:false},null);dirty=true;}catch(error){message(error.message);}});
  $('#copy-url').addEventListener('click',()=>{try{const item=payload();copyText('https://www.bramblemanagement.com'+Bramble.publicPath(item),'Public URL');message('This URL becomes public only after the resource and generated page are deployed.');}catch(error){message(error.message);}});
  $('#delete-button').addEventListener('click',()=>{if(!editingBase)return;if(!confirm(`Delete “${current.title}” from this browser’s workspace? Export a backup first. The live site will not change until an export is deployed.`))return;try{const next=resources.filter(r=>r.slug!==editingBase);localStorage.setItem(key,JSON.stringify(next));resources=next;queue=[];edit();status('Removed from the local workspace.');}catch(error){message(error.message);}});
  $('#copy-prompt').addEventListener('click',()=>copyFile('/AI_RESOURCE_PROMPT.md','AI creation prompt'));
  $('#copy-schema').addEventListener('click',()=>copyFile('/resource.schema.json','JSON schema'));
  $('#image-file').addEventListener('change',e=>selectAsset(e.target.files[0],'image'));
  $('#download-file').addEventListener('change',e=>selectAsset(e.target.files[0],'download'));
  $('#existing-image').addEventListener('change',e=>{$('#image_url').value=e.target.value;dirty=true;});
  $('#existing-download').addEventListener('change',e=>{$('#download_url').value=e.target.value;dirty=true;});
  window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
}
init();
