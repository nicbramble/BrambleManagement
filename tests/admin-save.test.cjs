const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const B=require('../resource-core.js');
const base={slug:'new-guide',title:'A useful guide',category:'Study',description:'A useful result.',body:'## Start\nA useful step.',sort_order:0};
function harness({initial=[],existing=null,confirm=true,assetOK=true,storageOK=true}={}){
 const nodes={};for(const [key,value] of Object.entries({...base,sources:'[]'}))nodes['#'+key]={value:String(value)};
 for(const key of ['badge','published_at','format','read_time','image_url','image_alt','download_url','download_label','action_url','action_label','cta_label','cta_url','cta_eyebrow','cta_heading','cta_description'])nodes['#'+key]={value:''};
 for(const key of ['published','featured','is_latest_reel'])nodes['#'+key]={checked:false};
 nodes['#save-button']={disabled:false};nodes['#editor-message']={textContent:''};nodes['#studio-status']={textContent:''};
 let saved=null;const confirmations=[];
 const ctx=vm.createContext({Bramble:B,document:{querySelector:s=>nodes[s]},structuredClone,console,window:{},localStorage:{setItem(k,v){if(!storageOK)throw Error('Storage full');saved=JSON.parse(v);}},fetch:async()=>({ok:assetOK,headers:{get:()=> 'image/jpeg'}}),confirm:msg=>{confirmations.push(msg);return confirm;}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../admin/admin.js'),'utf8').replace(/init\(\);\s*$/,''),ctx);
 ctx.initial=initial;ctx.existing=existing;vm.runInContext('resources=initial; editingBase=existing; current={}; renderList=()=>{};',ctx);
 return {nodes,ctx,confirmations,saved:()=>saved,save:()=>ctx.save({preventDefault(){}})};
}
test('admin saves a new draft, preserves existing records and honors zero order',async()=>{const h=harness({initial:[{...base,slug:'older',published:true}]});await h.save();assert.equal(h.saved().length,2);const fresh=h.saved().find(r=>r.slug==='new-guide');assert.equal(fresh.published,false);assert.equal(fresh.sort_order,0);assert.equal(h.saved().find(r=>r.slug==='older').published,true);assert.match(h.nodes['#editor-message'].textContent,/live site has not changed/);});
test('admin refuses to publish an unverified asset and saves a recoverable draft',async()=>{const h=harness({assetOK:false});h.nodes['#image_url'].value='/assets/missing.jpg';h.nodes['#published'].checked=true;await h.save();assert.equal(h.saved()[0].published,false);assert.equal(h.nodes['#published'].checked,false);assert.match(h.nodes['#editor-message'].textContent,/Saved as a draft/);});
test('admin asks before duplicate replacement and Latest Reel reassignment',async()=>{
 const old={...base,published:true,is_latest_reel:true};const refused=harness({initial:[old],confirm:false});await refused.save();assert.equal(refused.saved(),null);assert.match(refused.confirmations[0],/Replace existing/);
 const h=harness({initial:[{...old,slug:'previous'}]});h.nodes['#published'].checked=true;h.nodes['#is_latest_reel'].checked=true;await h.save();assert.match(h.confirmations[0],/removes that label/);assert.equal(h.saved().filter(r=>r.published&&r.is_latest_reel).length,1);assert.equal(h.saved()[0].slug,'new-guide');
});
test('storage failure never reports success or mutates the in-memory library',async()=>{const initial=[{...base,slug:'older'}],h=harness({initial,storageOK:false});await h.save();assert.equal(h.saved(),null);assert.equal(vm.runInContext('resources.length',h.ctx),1);assert.equal(h.nodes['#editor-message'].textContent,'Storage full');assert.equal(h.nodes['#save-button'].disabled,false);});
test('resource export produces a valid downloadable JSON backup',async()=>{
 let blob,clicked=false,filename;
 const ctx=vm.createContext({Bramble:B,Blob,URL:{createObjectURL:value=>{blob=value;return 'blob:test';},revokeObjectURL(){}},setTimeout(){},document:{createElement:()=>({set download(v){filename=v;},set href(v){},click(){clicked=true;}})}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../admin/admin.js'),'utf8').replace(/init\(\);\s*$/,''),ctx);
 ctx.downloadJSON([base],'resources.json');assert.equal(clicked,true);assert.equal(filename,'resources.json');const parsed=JSON.parse(await blob.text());assert.equal(parsed[0].body,base.body);assert.equal(B.parseImport(await blob.text()).items[0].published,false);
});
