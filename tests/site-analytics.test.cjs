const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const code = fs.readFileSync(path.join(__dirname,'../js/site-analytics.js'),'utf8');
function setup(options={}) {
 const page=options.page||'<div data-report-date="2026-11-11" data-analytics-view="brief"><a class="source-link" href="https://news.example.test/article?token=private#secret">Source</a><div data-analytics-reading-end></div></div>';
 const dom=new JSDOM('<!doctype html><html lang="zh-CN"><head></head><body>'+page+'</body></html>',{url:options.url||'https://yutaozhou.com/finance/?date=2026-11-11',runScripts:'outside-only'});
 const w=dom.window,sent=[],timers=new Set(),observers=[];let time=0,visible='visible';
 if(options.project){const boot=w.document.createElement('script');boot.dataset.project=options.project;w.document.head.appendChild(boot);Object.defineProperty(w.document,'currentScript',{value:boot});}
 const NativeObserver=w.MutationObserver;
 w.MutationObserver=class extends NativeObserver { constructor(callback){super(callback);observers.push(this);} };
 if(options.exclude)w.localStorage.setItem('umami.disabled','1');
 if(options.gpc)Object.defineProperty(w.navigator,'globalPrivacyControl',{value:true});
 if(options.storageBlocked)Object.defineProperty(w,'localStorage',{get(){throw new Error('Storage disabled');}});
 Object.defineProperty(w.document,'visibilityState',{get:()=>visible});
 Object.defineProperty(w.performance,'now',{value:()=>time});
 w.setInterval=fn=>{timers.add(fn);return fn;};w.clearInterval=id=>timers.delete(id);
 const capture=()=>{w.umami={track:(name,data)=>{sent.push({name,data});return Promise.resolve();}};};
 if(!options.delayed)capture();
 w.eval(code);
 return {w,sent,capture,close:()=>{observers.forEach(observer=>observer.disconnect());w.close();},advance:ms=>{time+=ms;for(const fn of [...timers])fn();},visibility:value=>{visible=value;w.document.dispatchEvent(new w.Event('visibilitychange'));}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('one shared website ID, project tag and privacy settings are applied to the tracker',()=>{const s=setup();const script=s.w.document.querySelector('script[src="https://cloud.umami.is/script.js"]');assert.equal(script.dataset.websiteId,'f8cf3636-b17d-4011-92dc-6ae29d0d91a3');assert.equal(script.dataset.tag,'finance');assert.equal(script.dataset.excludeSearch,'true');assert.equal(script.dataset.excludeHash,'true');s.close();});
for(const options of [{exclude:true},{gpc:true},{storageBlocked:true},{url:'http://localhost:5173/finance/'}])test('excluded, private or development visits do not initialize collection: '+JSON.stringify(options),()=>{const s=setup(options);assert.equal(s.w.document.querySelector('script[src="https://cloud.umami.is/script.js"]'),null);s.w.yzAnalytics.track('report_read',{report_date:'2026-11-11'});assert.equal(s.sent.length,0);s.close();});
test('mortgage and referrer queries/fragments are removed before transmission',()=>{const s=setup({url:'https://yutaozhou.com/house_shopping/?price=900000#income=100000'});const clean=s.w.yzAnalyticsBeforeSend('event',{url:'/house_shopping/?price=900000#income=100000',referrer:'https://example.test/path?email=private#secret'});assert.equal(clean.url,'/house_shopping/');assert.equal(clean.referrer,'https://example.test/path');s.close();});
test('events queued before tracker load are delivered once when it is ready',()=>{const s=setup({delayed:true});assert.equal(s.sent.length,0);s.capture();s.w.document.querySelector('script[src="https://cloud.umami.is/script.js"]').dispatchEvent(new s.w.Event('load'));assert.equal(s.sent.filter(e=>e.name==='report_read').length,1);s.close();});
test('initial and switched editions are tracked once each without React render duplicates',async()=>{const s=setup();assert.equal(s.sent.filter(e=>e.name==='report_read').length,1);const root=s.w.document.querySelector('[data-report-date]');root.dataset.reportDate='2026-11-10';await flush();root.dataset.reportDate='2026-11-11';await flush();assert.deepEqual(s.sent.filter(e=>e.name==='report_read').map(e=>e.data.report_date),['2026-11-11','2026-11-10']);s.close();});
test('only visible reading time contributes to the 30-second engagement event',()=>{const s=setup();s.advance(10000);s.visibility('hidden');s.advance(60000);assert.equal(s.sent.filter(e=>e.name==='report_engaged').length,0);s.visibility('visible');s.advance(20000);s.advance(20000);assert.equal(s.sent.filter(e=>e.name==='report_engaged').length,1);s.close();});
test('source clicks retain edition and destination but omit query and arbitrary properties',()=>{const s=setup();s.w.document.querySelector('a').click();const e=s.sent.find(e=>e.name==='source_click');assert.equal(e.data.report_date,'2026-11-11');assert.equal(e.data.path,'/article');assert.equal(e.data.destination,'news.example.test');assert.equal(s.sent.filter(e=>e.name==='outbound_click').length,0);s.w.yzAnalytics.track('source_click',{report_date:'2026-11-11',loanAmount:900000,email:'private'});assert.equal('loanAmount' in s.sent.at(-1).data,false);assert.equal('email' in s.sent.at(-1).data,false);s.close();});
test('reading completion requires visible time and scrolling to the edition end, and records once',()=>{const s=setup();s.w.document.querySelector('[data-analytics-reading-end]').getBoundingClientRect=()=>({top:500});Object.defineProperty(s.w,'scrollY',{value:100});s.advance(1000);assert.equal(s.sent.filter(e=>e.name==='report_complete').length,0);s.advance(3000);s.advance(5000);assert.equal(s.sent.filter(e=>e.name==='report_complete').length,1);s.close();});
test('archive browsing does not start a report reading session',()=>{const s=setup({page:'<div data-report-date="2026-11-11" data-analytics-view="archive"></div>'});s.advance(60000);assert.equal(s.sent.length,0);s.close();});
test('a duplicate bootstrap does not install another tracker or click handler',()=>{const s=setup();s.w.eval(code);assert.equal(s.w.document.querySelectorAll('script[src="https://cloud.umami.is/script.js"]').length,1);s.w.document.querySelector('a').click();assert.equal(s.sent.filter(e=>e.name==='source_click').length,1);s.close();});

test('tab restoration is counted after hydration and re-renders do not add views',async()=>{
 const s=setup({project:'house-shopping',url:'https://yutaozhou.com/house_shopping/#plan=private',page:'<div data-analytics-tool="" data-analytics-language="en"></div>'});
 assert.equal(s.sent.length,0);
 const root=s.w.document.querySelector('[data-analytics-tool]');root.dataset.analyticsTool='refinance';await flush();
 root.appendChild(s.w.document.createElement('span'));await flush();
 assert.deepEqual(s.sent.map(e=>({name:e.name,...e.data})),[{name:'tool_tab_view',project:'house-shopping',language:'en',tab:'refinance',entry:'initial'}]);
 s.close();
});

// The HTML tag is authoritative in production; the path fallback uses the repo name.
function house(){const s=setup({project:'house-shopping',url:'https://yutaozhou.com/house_shopping/',page:'<div data-analytics-tool="calculator" data-analytics-language="en"><button data-analytics-tab="refinance"><span>Refinance</span></button></div>'});return s;}
test('real tab clicks capture the previous tab before app handlers update state',async()=>{
 const s=house(),root=s.w.document.querySelector('[data-analytics-tool]'),button=s.w.document.querySelector('button');
 button.addEventListener('click',()=>{root.dataset.analyticsTool='refinance';});button.querySelector('span').click();await flush();
 assert.deepEqual(s.sent.filter(e=>e.name==='tool_tab_click').map(e=>({...e.data})),[{project:'house-shopping',language:'en',tab:'refinance',previous_tab:'calculator'}]);
 assert.equal(s.sent.filter(e=>e.name==='tool_tab_view').length,2);
 button.click();await flush();assert.equal(s.sent.filter(e=>e.name==='tool_tab_click').length,2);assert.equal(s.sent.filter(e=>e.name==='tool_tab_view').length,2);
 s.close();
});
test('all supported tabs have stable identifiers and sensitive arbitrary properties are discarded',async()=>{
 const s=house(),root=s.w.document.querySelector('[data-analytics-tool]');
 for(const tab of ['compare','schedule','recast','refinance','buy-rent','guide']){root.dataset.analyticsTool=tab;await flush();}
 assert.deepEqual(s.sent.filter(e=>e.name==='tool_tab_view').map(e=>e.data.tab),['calculator','compare','schedule','recast','refinance','buy-rent','guide']);
 s.w.yzAnalytics.track('tool_tab_view',{tab:'income=private',previous_tab:'loan=private',loanAmount:900000,planName:'private',entry:'private'});
 assert.deepEqual({...s.sent.at(-1).data},{project:'house-shopping',language:'en'});s.close();
});

function car(){return setup({url:'https://yutaozhou.com/showroom-talks/#drive/tesla-model-3',page:'<div data-analytics-car="tesla-model-3" data-analytics-car-name="Tesla Model 3" data-analytics-view="review"><div data-analytics-car-end></div></div>'});}
test('car views identify the exact model and count return visits without language or section duplicates',async()=>{
 const s=car(),article=s.w.document.querySelector('[data-analytics-car]');
 assert.equal(s.sent[0].name,'car_view');assert.equal(s.sent[0].data.car_name,'Tesla Model 3');
 article.innerHTML='<h2>Translated section</h2><div data-analytics-car-end></div>';s.w.document.documentElement.lang='en';await flush();assert.equal(s.sent.length,1);
 article.dataset.analyticsCar='bmw-550i-f10';article.dataset.analyticsCarName='BMW 550i (F10)';await flush();
 article.hidden=true;await flush();article.hidden=false;await flush();
 assert.deepEqual(s.sent.filter(e=>e.name==='car_view').map(e=>e.data.car_slug),['tesla-model-3','bmw-550i-f10','bmw-550i-f10']);s.close();
});
test('car engagement counts visible review time and not time spent on the journal',async()=>{
 const s=car(),article=s.w.document.querySelector('[data-analytics-car]');s.advance(10000);article.hidden=true;await flush();s.advance(60000);
 article.hidden=false;await flush();assert.equal(s.sent.filter(e=>e.name==='car_engaged').length,0);
 s.visibility('hidden');s.advance(60000);s.visibility('visible');s.advance(20000);s.advance(10000);
 assert.equal(s.sent.filter(e=>e.name==='car_engaged').length,1);assert.equal(s.sent.find(e=>e.name==='car_engaged').data.car_slug,'tesla-model-3');s.close();
});
test('car completion requires scroll plus visible time and records only once per car',()=>{
 const s=car();s.w.document.querySelector('[data-analytics-car-end]').getBoundingClientRect=()=>({top:500});
 s.advance(4000);assert.equal(s.sent.filter(e=>e.name==='car_complete').length,0);
 Object.defineProperty(s.w,'scrollY',{value:100});s.w.dispatchEvent(new s.w.Event('scroll'));s.advance(1000);
 assert.equal(s.sent.filter(e=>e.name==='car_complete').length,1);s.close();
});
test('missing car reviews and hidden review containers never produce car views',()=>{
 for(const page of ['<div data-analytics-car="unknown" data-analytics-view="not-found"></div>','<div hidden data-analytics-car="tesla-model-3" data-analytics-view="review"></div>']){
  const s=setup({url:'https://yutaozhou.com/showroom-talks/',page});assert.equal(s.sent.length,0);s.close();
 }
});
test('edition opens distinguish initial, switched and archive entries while reads remain deduplicated',async()=>{
 const s=setup(),root=s.w.document.querySelector('[data-report-date]');
 root.dataset.reportDate='2026-11-10';await flush();root.dataset.reportDate='2026-11-11';await flush();
 root.dataset.analyticsView='archive';await flush();s.advance(60000);root.dataset.analyticsView='brief';await flush();
 assert.deepEqual(s.sent.filter(e=>e.name==='report_open').map(e=>({date:e.data.report_date,entry:e.data.entry,previous:e.data.previous_report_date})),[
  {date:'2026-11-11',entry:'initial',previous:undefined},{date:'2026-11-10',entry:'edition_change',previous:'2026-11-11'},
  {date:'2026-11-11',entry:'edition_change',previous:'2026-11-10'},{date:'2026-11-11',entry:'archive',previous:'2026-11-11'}]);
 assert.equal(s.sent.filter(e=>e.name==='report_read').length,2);assert.equal(s.sent.filter(e=>e.name==='report_engaged').length,0);s.close();
});
test('leaving a report does not mark the old report complete using the new report end',async()=>{
 const s=setup(),root=s.w.document.querySelector('[data-report-date]');s.advance(4000);
 Object.defineProperty(s.w,'scrollY',{value:100});root.dataset.reportDate='2026-11-10';await flush();
 assert.equal(s.sent.filter(e=>e.name==='report_complete').length,0);s.close();
});
