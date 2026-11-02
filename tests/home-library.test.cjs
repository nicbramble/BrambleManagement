const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Bramble = require('../resource-core.js');
const BrambleLibrary = require('../library-collections.js');
const code = fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const resource = (slug,overrides={}) => ({slug,title:`Useful idea ${slug}`,category:'Creator Tools',description:'Make something useful.',body:'Hidden body sentinel.',format:'Prompt pack',published:true,...overrides});
function harness(resources) {
  const listeners = {};
  let focused = null;
  const node = () => ({hidden:false,innerHTML:'',textContent:'',value:'',attributes:{},listeners:{},
    addEventListener(type,handler){this.listeners[type]=handler;},setAttribute(name,value){this.attributes[name]=value;},focus(){focused=this;}});
  const nodes = Object.fromEntries(['#year','#latest-reel','#resource-grid','#filter-status','#resource-filters','#resource-search','#clear-filters'].map(key=>[key,node()]));
  let buttons=[],filterHTML='';
  Object.defineProperty(nodes['#resource-filters'],'innerHTML',{
    get:()=>filterHTML,set(value){filterHTML=value;buttons=[...value.matchAll(/data-filter="([^"]*)"/g)].map(([,filter])=>{
      const b=Object.assign(node(),{dataset:{filter},classList:{toggle(){}}});b.closest=()=>b;return b;
    });}
  });
  nodes['#resource-filters'].querySelectorAll=()=>buttons;
  const document={addEventListener:(type,handler)=>listeners[type]=handler,querySelector:key=>nodes[key]||null};
  const context=vm.createContext({document,Bramble:{...Bramble,load:async()=>resources},BrambleLibrary});
  vm.runInContext(code,context);
  return {nodes,context,start:()=>listeners.DOMContentLoaded(),focused:()=>focused,
    slugs:()=>[...nodes['#resource-grid'].innerHTML.matchAll(/data-slug="([^"]*)"/g)].map(([,slug])=>slug),
    search(value){nodes['#resource-search'].value=value;nodes['#resource-search'].listeners.input();},
    filter(value){const b=buttons.find(b=>b.dataset.filter===value);assert.ok(b);nodes['#resource-filters'].listeners.click({target:b});return b;},
    clear(){nodes['#clear-filters'].listeners.click();}
  };
}
test('all published guides have a valid collection with no duplicates or omissions',async()=>{
  const resources=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/resources.json'),'utf8')).filter(r=>r.published);
  for(const item of resources)assert.ok(BrambleLibrary.collections.includes(BrambleLibrary.collectionFor(item)),`${item.slug} needs a valid collection`);
  const h=harness(resources);await h.start();
  assert.equal(new Set(h.slugs()).size,resources.length);
  assert.deepEqual([...h.slugs()].sort(),resources.map(r=>r.slug).sort());
  assert.equal((h.nodes['#resource-grid'].innerHTML.match(/class="guide-collection"/g)||[]).length,5);
  assert.ok(!h.nodes['#resource-grid'].innerHTML.includes('<img'));
  assert.match(h.nodes['#resource-filters'].innerHTML,/All guides/);
});
test('new resources automatically get a collection even for unknown or inherited-property names',()=>{
  assert.equal(BrambleLibrary.collectionFor(resource('new-video')).id,'create');
  assert.equal(BrambleLibrary.collectionFor(resource('new-trip',{category:'Travel Smarter'})).id,'everyday');
  assert.equal(BrambleLibrary.collectionFor(resource('new-topic',{category:'Something new'})).id,'work');
  assert.equal(BrambleLibrary.collectionFor(resource('constructor',{category:'__proto__'})).id,'work');
  assert.equal(BrambleLibrary.collectionFor(resource('set-up-noop-whoop')).id,'everyday');
});
test('collection and case-insensitive search intersect; clearing restores all guides and focus',async()=>{
  const h=harness([resource('one',{title:'Plan a film'}),resource('two',{title:'Plan your week',category:'AI + Automation'}),resource('three',{title:'Plan a trip',category:'Travel'})]);
  await h.start();h.search('  PLAN  ');assert.equal(h.slugs().length,3);
  const selected=h.filter('work');assert.equal(selected.attributes['aria-pressed'],'true');assert.deepEqual(h.slugs(),['two']);
  assert.match(h.nodes['#filter-status'].textContent,/Work smarter: 1 resource\. Matching “PLAN”/);
  h.search('film');assert.deepEqual(h.slugs(),[]);assert.match(h.nodes['#resource-grid'].innerHTML,/No matches/);
  assert.equal(h.nodes['#clear-filters'].hidden,false);h.clear();
  assert.equal(h.slugs().length,3);assert.equal(h.nodes['#resource-search'].value,'');assert.equal(h.nodes['#clear-filters'].hidden,true);assert.equal(h.focused(),h.nodes['#resource-search']);
});
test('search includes collection and legacy metadata but not the hidden guide body',async()=>{
  const h=harness([resource('one',{title:'Better ideas',description:'Make a film.',format:'Download'}),resource('two',{category:'Study'})]);await h.start();
  for(const term of ['better','film','creator tools','download','create content']){h.search(term);assert.deepEqual(h.slugs(),['one'],term);}
  h.search('Hidden body sentinel');assert.deepEqual(h.slugs(),[]);
});
test('all collection members are visible without pagination and preserve ordering within each group',async()=>{
  const resources=Array.from({length:20},(_,i)=>resource(`idea-${i}`,{category:i%2?'Study':'Creator Tools'}));
  const h=harness(resources);await h.start();assert.equal(h.slugs().length,20);
  h.filter('create');assert.deepEqual(h.slugs(),resources.filter((_,i)=>i%2===0).map(r=>r.slug));
  h.filter('learn');assert.deepEqual(h.slugs(),resources.filter((_,i)=>i%2===1).map(r=>r.slug));
});
test('Latest Reel is shown exactly once across collections and searches',async()=>{
  const latest=resource('latest',{title:'Latest video',is_latest_reel:true});const h=harness([latest,resource('normal')]);await h.start();
  assert.equal(h.nodes['#latest-reel'].hidden,false);assert.match(h.nodes['#latest-reel'].innerHTML,/data-slug="latest"/);assert.deepEqual(h.slugs(),['normal']);
  h.search('latest');assert.equal(h.nodes['#latest-reel'].hidden,true);assert.deepEqual(h.slugs(),['latest']);
  h.clear();h.filter('create');assert.deepEqual(h.slugs(),['latest','normal']);assert.equal(h.nodes['#latest-reel'].hidden,true);
  h.filter('Latest Reel');assert.deepEqual(h.slugs(),['latest']);
});
test('collection cards escape imported text and preserve attributed guide links and tracking',()=>{
  const html=Bramble.card(resource('safe',{title:'<script>bad</script>',description:'<img onerror=bad>'}),{collection:BrambleLibrary.collections[0]});
  assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img'));
  assert.match(html,/href="\/guides\/safe\/"/);assert.match(html,/data-event="resource_click"/);assert.match(html,/data-slug="safe"/);assert.match(html,/<svg/);
});
