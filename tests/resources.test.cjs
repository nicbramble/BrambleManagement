const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const B=require('../resource-core.js'),root=path.join(__dirname,'..');
const base={slug:'test-resource',title:'Test resource',category:'Study',description:'A useful outcome.',body:'## Start\n\n```prompt\nAsk [this].\n```',published:true};
test('AI imports accept object, array, fenced JSON and constrained front matter; default to drafts',()=>{
 for(const text of [JSON.stringify(base),JSON.stringify([base]),'Here is the guide:\n```json\n'+JSON.stringify(base)+'\n```'])assert.equal(B.parseImport(text).items[0].published,false);
 assert.equal(B.parseImport(JSON.stringify(base),{publish:true}).items[0].published,true);
 const md='---\nslug: test-resource\ntitle: A title\ncategory: Study\ndescription: A useful outcome\npublished: true\n---\n## Start\nA paragraph.';
 assert.equal(B.parseImport(md).items[0].body,'## Start\nA paragraph.');
 assert.throws(()=>B.parseImport(md.replace('title: A title','title: A title\ntitle: Duplicate')),/Duplicate/);
});
test('import errors are actionable and unknown keys do not pollute objects',()=>{
 for(const text of ['not JSON','{}','[]',JSON.stringify({...base,slug:'bad/slug'}),JSON.stringify({...base,published:'yes'}),JSON.stringify([base,base])])assert.throws(()=>B.parseImport(text));
 const result=B.parseImport(JSON.stringify({...base,unknown:'ignored'}));assert.match(result.warnings[0],/Unknown field/);assert.ok(!Object.hasOwn(result.items[0],'unknown'));
 const polluted=B.parseImport('{"__proto__":{"polluted":true},'+JSON.stringify(base).slice(1));assert.ok(!({}).polluted);assert.ok(!Object.hasOwn(polluted.items[0],'__proto__'));
 assert.throws(()=>B.parseImport('```json\n{}\n```\n```json\n{}\n```'),/exactly one/);
});
test('malicious imports reject executable or disallowed URLs and safely escape HTML',()=>{
 for(const field of ['action_url','cta_url','download_url','image_url'])for(const url of ['javascript:alert(1)','data:text/html,<script>','https://user:password@example.com/a.jpg'])assert.throws(()=>B.parseImport(JSON.stringify({...base,[field]:url})),new RegExp(field));
 assert.throws(()=>B.parseImport(JSON.stringify({...base,image_url:'https://unknown.example/a.jpg'})),/image_url/);
 assert.throws(()=>B.parseImport(JSON.stringify({...base,sources:[{label:'x',url:'javascript:alert(1)'}]})),/sources/);
 const imported=B.parseImport(JSON.stringify({...base,title:'<img src=x onerror=alert(1)>',body:'<script>alert(1)</script>'}));
 assert.ok(imported.warnings.length);const html=B.card(imported.items[0]);assert.ok(!html.includes('<img src=x'));assert.ok(html.includes('&lt;img'));
});
test('duplicate replacement and Latest Reel promotion require confirmation without mutating originals',()=>{
 const old={...base,slug:'old',is_latest_reel:true};const items=[old,{...base,slug:'another'}];
 assert.throws(()=>B.upsert(items,{...base,slug:'another'},{replaceSlug:null}),/already exists/);
 assert.throws(()=>B.upsert(items,{...base,is_latest_reel:true},{replaceSlug:null}),/Confirm replacing/);
 const next=B.upsert(items,{...base,is_latest_reel:true},{replaceSlug:null,confirmLatest:true});assert.equal(next[0].slug,base.slug);assert.equal(next.filter(r=>r.published&&r.is_latest_reel).length,1);assert.equal(old.is_latest_reel,true);
 const draft=B.upsert(items,{...base,is_latest_reel:true,published:false},{replaceSlug:null});assert.equal(draft.find(r=>r.slug==='old').is_latest_reel,true);
});
test('full backup round-trip preserves content while defaulting to draft',()=>{
 const items=JSON.parse(fs.readFileSync(path.join(root,'data/resources.json'),'utf8'));
 const imported=B.parseImport(JSON.stringify(items)).items;
 assert.equal(imported.length,items.length);imported.forEach((r,i)=>{assert.equal(r.body,items[i].body);assert.equal(r.published,false);});
});
test('public library ignores local drafts; local studio retains them, sort order zero is valid',async()=>{
 const items=[{...base,sort_order:0},{...base,slug:'hidden',published:false}];
 const context=vm.createContext({URL,URLSearchParams,fetch:async()=>({ok:true,json:async()=>items}),window:{location:{origin:'https://nicbuilds.com'},localStorage:{getItem:()=>JSON.stringify([{...base,slug:'private-draft',published:false}])}}});
 vm.runInContext(fs.readFileSync(path.join(root,'resource-core.js'),'utf8'),context);
 assert.equal((await context.window.Bramble.load()).length,1);assert.equal((await context.window.Bramble.load({local:true}))[0].slug,'private-draft');assert.equal(B.validate(items[0]).item.sort_order,0);
});
test('optional Supabase errors fall back to JSON and drafts stay hidden',async()=>{
 for(const online of [true,false]){
  const context=vm.createContext({URL,URLSearchParams,fetch:async url=>{if(url.startsWith('https://db.example')){if(!online)throw Error('offline');return {ok:true,json:async()=>[base,{...base,slug:'draft',published:false}]};}return {ok:true,json:async()=>[base]};},window:{BRAMBLE_CONFIG:{supabaseUrl:'https://db.example',supabaseAnonKey:'public'},location:{origin:'https://nicbuilds.com'}}});
  vm.runInContext(fs.readFileSync(path.join(root,'resource-core.js'),'utf8'),context);assert.equal((await context.window.Bramble.load()).length,1);
 }
});
test('guide preview and generated pages use the public renderer, including actions before body',()=>{
 const ctx=vm.createContext({Bramble:B,document:{addEventListener(){}},window:{}});vm.runInContext(fs.readFileSync(path.join(root,'guides/guide.js'),'utf8'),ctx);
 const item={...base,download_url:'/downloads/chatgpt-study-prompts.txt',is_latest_reel:true};const html=ctx.guideMarkup(item);
 assert.ok(html.indexOf('data-event="download"')<html.indexOf('id="guide-content"'));assert.equal((html.match(/data-event="download"/g)||[]).length,2);assert.ok(html.includes('From the latest Reel'));assert.ok(html.includes('data-share'));
 assert.match(fs.readFileSync(path.join(root,'admin/preview.js'),'utf8'),/Bramble\.card/);assert.match(fs.readFileSync(path.join(root,'admin/preview.js'),'utf8'),/renderGuide/);
 for(const file of JSON.parse(fs.readFileSync(path.join(root,'data/generated-pages.json'),'utf8'))){const page=fs.readFileSync(path.join(root,file),'utf8');assert.ok(page.includes('data-prerendered="true"'));assert.ok(page.includes('rel="canonical"'));assert.ok(page.includes('property="og:image"'));assert.ok(!page.includes('<title>Guide —'));}
});
test('a new published resource is rendered and addressable without homepage edits',()=>{
 const item=B.parseImport(JSON.stringify({...base,category:'A new category'}),{publish:true}).items[0];const items=B.upsert([],item,{replaceSlug:null});assert.equal(items.length,1);assert.equal(B.publicPath(item),'/guides/test-resource/');assert.match(B.card(item),/A new category/);
});
test('homepage renders Latest Reel first and filters it accessibly',()=>{
 const nodes={'#latest-reel':{hidden:true,innerHTML:''},'#resource-grid':{innerHTML:''},'#filter-status':{textContent:''}};
 const ctx=vm.createContext({Bramble:B,document:{addEventListener(){},querySelector:s=>nodes[s]}});vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),ctx);
 const latest={...base,is_latest_reel:true};const normal={...base,slug:'other',is_latest_reel:false};
 ctx.renderResources([latest,normal]);assert.equal(nodes['#latest-reel'].hidden,false);assert.match(nodes['#latest-reel'].innerHTML,/From the latest Reel/);assert.ok(!nodes['#resource-grid'].innerHTML.includes('data-slug="test-resource"'));assert.match(nodes['#filter-status'].textContent,/2 resources/);
 ctx.renderResources([latest,normal],'Latest Reel');assert.equal(nodes['#latest-reel'].hidden,true);assert.match(nodes['#filter-status'].textContent,/1 resource\./);assert.match(nodes['#resource-grid'].innerHTML,/From the latest Reel/);
});
test('builder adds a new guide without editing homepage, removes generated drafts, and rejects missing assets',()=>{
 const os=require('node:os'),cp=require('node:child_process');const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'bramble-build-'));
 try{
  for(const dir of ['scripts','guides','data'])fs.mkdirSync(path.join(tmp,dir));
  for(const file of ['resource-core.js','guides/guide.js','guides/index.html','scripts/build-resources.cjs'])fs.copyFileSync(path.join(root,file),path.join(tmp,file));
  const data=path.join(tmp,'data/resources.json');fs.writeFileSync(data,JSON.stringify([base]));
  cp.execFileSync(process.execPath,[path.join(tmp,'scripts/build-resources.cjs')]);assert.ok(fs.existsSync(path.join(tmp,'guides/test-resource/index.html')));assert.ok(fs.readFileSync(path.join(tmp,'sitemap.xml'),'utf8').includes('/guides/test-resource/'));
  fs.writeFileSync(data,JSON.stringify([{...base,published:false}]));cp.execFileSync(process.execPath,[path.join(tmp,'scripts/build-resources.cjs')]);assert.ok(!fs.existsSync(path.join(tmp,'guides/test-resource/index.html')));
  fs.writeFileSync(data,JSON.stringify([{...base,image_url:'/assets/missing.jpg'}]));assert.throws(()=>cp.execFileSync(process.execPath,[path.join(tmp,'scripts/build-resources.cjs')],{stdio:'pipe'}),/Missing asset/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
