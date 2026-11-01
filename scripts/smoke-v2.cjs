/* JaiyePass V2 dependency-light smoke tests. Run after npm ci: node scripts/smoke-v2.cjs */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
let checks = 0;
function test(name, fn) { fn(); checks++; console.log('PASS', name); }
function loadPureTS(relative) {
  const source = fs.readFileSync(relative, 'utf8');
  const result = ts.transpileModule(source, {fileName:relative,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}});
  assert.equal(result.diagnostics.filter(x=>x.category===ts.DiagnosticCategory.Error).length, 0);
  const mod = {exports:{}};
  vm.runInNewContext(result.outputText, {exports:mod.exports, module:mod, Date, Math}, {filename:relative});
  return mod.exports;
}
let sourceFiles = [];
function walk(dir) {for(const file of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,file.name);if(file.isDirectory())walk(p);else if(/\.(tsx?|mts)$/.test(p))sourceFiles.push(p);}}
walk('src');
test('All TypeScript and TSX files parse without syntax errors',()=>{for(const file of sourceFiles){const r=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}});assert.equal(r.diagnostics.filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,file)}});
const {sampleEvents,SAMPLE_CITIES,getSampleEvent} = loadPureTS('src/lib/sample-events.ts');
const events = sampleEvents(new Date('2026-10-26T12:00:00Z'));
test('Eight fictional events are labelled demo',()=>{assert.equal(events.length,8);assert.ok(events.every(e=>e.is_demo&&e.image_url.startsWith('/demo/')));});
test('Artwork exists for every sample event',()=>{for(const e of events) assert.ok(fs.existsSync('public'+e.image_url),e.image_url);});
test('Demo covers multiple cities without Accra',()=>{assert.ok(new Set(events.map(x=>x.city_name)).size>=4);assert.ok(!SAMPLE_CITIES.some(x=>x.slug==='accra'));});
test('Sample event detail can be found by slug',()=>assert.equal(getSampleEvent('naija-hitmaker-live').title,'Naija Hitmaker Live'));
test('Sample events cannot claim verified availability',()=>assert.ok(events.every(e=>!e.availability)));
const {eventDateRange} = loadPureTS('src/lib/date-filters.ts');
test('Nigeria today rolls over at 23:00 UTC',()=>{
  const w=eventDateRange('today',new Date('2026-10-26T20:00:00Z'));
  assert.equal(w.end,'2026-10-26T23:00:00.000Z');
});
test('Weekend filter starts next Saturday on Friday',()=>{
  const w=eventDateRange('weekend',new Date('2026-10-30T12:00:00Z'));
  assert.equal(w.start,'2026-10-30T23:00:00.000Z');
  assert.equal(w.end,'2026-11-01T23:00:00.000Z');
});
test('Weekend filter includes current Sunday only through Sunday night',()=>{
  const w=eventDateRange('weekend',new Date('2026-11-01T12:00:00Z'));
  assert.equal(w.start,'2026-11-01T12:00:00.000Z');
  assert.equal(w.end,'2026-11-01T23:00:00.000Z');
});
const {decorateEventCards} = loadPureTS('src/lib/event-card-logic.ts');
const base = {id:'e',slug:'e',title:'Sample',tagline:null,image_url:null,starts_at:'2026-10-30T16:00:00Z',is_demo:false,is_free:false};
const ticket = (overrides={})=>({price_kobo:500000,quantity:50,sold_count:20,status:'active',sales_start_at:null,sales_end_at:null,...overrides});
const at=Date.parse('2026-10-26T12:00:00Z');
const decorate=(tickets)=>decorateEventCards([{...base,ticket_types:tickets}],at)[0];
test('No open tickets have unknown price',()=>{const e=decorate([]);assert.equal(e.price_min_kobo,null);assert.equal(e.is_free,false);assert.equal(e.availability,'closed');});
test('Open tickets show correct price and availability',()=>{const e=decorate([ticket()]);assert.equal(e.price_min_kobo,500000);assert.equal(e.availability,'available');});
test('Future sales are not counted as currently on sale',()=>assert.equal(decorate([ticket({sales_start_at:'2026-11-01T12:00:00Z'})]).availability,'closed'));
test('Expired ticket tiers are excluded',()=>assert.equal(decorate([ticket({sales_end_at:'2026-10-22T12:00:00Z'})]).availability,'closed'));
test('Sold-out inventory is flagged',()=>assert.equal(decorate([ticket({quantity:50,sold_count:50})]).availability,'sold_out'));
test('Free open tickets stay free',()=>{const e=decorate([ticket({price_kobo:0})]);assert.equal(e.is_free,true);assert.equal(e.price_min_kobo,0);});
test('Price minimization respects only available tiers',()=>{const e=decorate([ticket({price_kobo:0,quantity:50,sold_count:50}),ticket({price_kobo:250000})]);assert.equal(e.price_min_kobo,250000);assert.equal(e.is_free,false);});
const sec=fs.readFileSync('supabase/migrations/20261026090106_harden_rpc.sql','utf8');
test('Sensitive RPCs revoke PUBLIC access',()=>{for(const name of ['finalize_paid_order','claim_check_in','create_inventory_hold','expire_inventory_holds'])assert.match(sec,new RegExp('REVOKE ALL ON FUNCTION public\\.'+name+'\\('));});
test('Role elevation and publish bypass guards are included',()=>{assert.match(sec,/prevent_profile_insert_escalation/);assert.match(sec,/protect_event_publication/);});
const seed=fs.readFileSync('supabase/migrations/20261026090105_seed.sql','utf8');
test('Seed uses valid demo SVG paths',()=>{assert.ok(seed.includes("'/demo/' || ev.slug || '.svg'"));});
console.log(`JaiyePass V2: ${checks} checks passed (${sourceFiles.length} TS/TSX source files parsed).`);
