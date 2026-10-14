const $=s=>document.querySelector(s), app=$('#app');
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const TIERS=['箱包','眼镜','珠宝腕表','服配','玉石翡翠'];
const cache={};const get=u=>cache[u]??=fetch(u,{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error(u);return r.json()});
const tag=t=>`<span class="tag t-${esc(t)}">${esc(t)}</span>`, lv=l=>`<span class="tag ${esc(l)}">${esc(l)}</span>`;
const link=(u,t)=>`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`;
const opts=(arr,all)=>`<option value="">${all}</option>`+arr.map(x=>`<option>${esc(x)}</option>`).join('');
const empty=t=>`<div class="empty">${t}</div>`;
async function route(){
  const h=location.hash.slice(1)||'/';
  document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('on',a.getAttribute('href')==='#'+h||(h.startsWith('/day')&&a.getAttribute('href')==='#/')||(h.startsWith('/brands/')&&a.getAttribute('href')==='#/brands')));
  try{
    const [idx,brands]=await Promise.all([get('data/index.json'),get('config/brands.json')]);
    if(h==='/archive')return archive(idx);
    if(h==='/brands'||h.startsWith('/brands/'))return brandsPage(brands,await yearItems(idx,brands),decodeURIComponent(h.slice(8)));
    if(h==='/year')return yearPage(await yearItems(idx,brands),brands);
    if(h==='/sources')return sourcesPage(idx,await get('config/sources.json').catch(()=>({tiers:[]})));
    const m=h.match(/^\/day\/(\d{4}-\d{2}-\d{2})/);
    const date=m?m[1]:idx[0]?.date;
    if(!date){app.innerHTML=`<h1>配饰雷达</h1>`+empty('暂无日报数据。首份日报发布后将在此显示。');return}
    day(await get(`data/${date}.json`),idx,brands);
  }catch(e){app.innerHTML=empty('数据加载失败：'+esc(e.message))}
  scrollTo(0,0);
}
function day(d,idx,brands){
  const bmap=Object.fromEntries(brands.map(b=>[b.name,b]));
  const i=idx.findIndex(x=>x.date===d.date), prev=idx[i+1], next=idx[i-1];
  const news=(d.industry_news||[]).slice().sort((a,b)=>b.importance-a.importance);
  const bn=(d.brand_news||[]).map(n=>({...n,watch_level:bmap[n.brand]?.watch_level||n.watch_level||'—',tier1:n.tier1||bmap[n.brand]?.tier1||'待确认'}));
  const cnt={};bn.forEach(n=>cnt[n.brand]=(cnt[n.brand]||0)+1);
  const cov=['P0','P1'].map(l=>{const L=brands.filter(b=>b.watch_level===l),y=L.filter(b=>cnt[b.name]),n=L.filter(b=>!cnt[b.name]);
    return `<div class="cov"><b>${l}</b>：有动态 ${y.length}/${L.length}<div class="chips">${y.map(b=>`<a class="chip yes" href="javascript:void 0" data-b="${esc(b.name)}">${esc(b.name)} ${cnt[b.name]}</a>`).join('')}</div><div class="chips">${n.map(b=>`<span class="chip no">${esc(b.name)}</span>`).join('')||'<span class="muted">全部有动态</span>'}</div></div>`}).join('');
  const scan=d.brand_scan?`<p class="muted">检索窗口 ${esc(d.brand_scan.window||'')}；${esc(d.brand_scan.method||'')}。${esc(d.brand_scan.note||'')}</p>`:'';
  app.innerHTML=`<div class="datebar"><div><span class="eyebrow">The Daily Report · ${esc(d.date)}</span><h1>行业日报</h1></div><div>
   ${prev?`<a href="#/day/${prev.date}">← ${prev.date}</a>`:''}${next?`<a href="#/day/${next.date}">${next.date} →</a>`:''}</div></div>
   ${d.headline?`<p class="lede">${esc(d.headline)}</p>`:''}${d.summary?`<div class="summary">${esc(d.summary)}</div>`:''}
   <h2><span class="num">I.</span>行业动态</h2><div class="filters"><select id="nt">${opts(TIERS,'全部赛道')}</select><select id="ns">${opts(['奢侈品','轻奢','大众'],'全部定位')}</select><select id="ni">${opts(['5','4','3','2','1'].map(x=>'≥'+x),'全部重要度')}</select></div><div id="newsT"></div>
   <h2><span class="num">II.</span>品牌动态</h2><div class="filters"><select id="bb"><option value="">全部品牌（${brands.length}）</option>${['P0','P1'].map(l=>`<optgroup label="${l}">${brands.filter(b=>b.watch_level===l).map(b=>`<option value="${esc(b.name)}">${esc(b.name)}${cnt[b.name]?`（${cnt[b.name]}）`:''}</option>`).join('')}</optgroup>`).join('')}</select><select id="bl">${opts(['P0','P1'],'全部级别')}</select><select id="bt">${opts(TIERS,'全部赛道')}</select></div><details class="card" open><summary><b>品牌覆盖</b>：${Object.keys(cnt).length} / ${brands.length} 个监测品牌有动态<span class="muted">　深色为有动态（可点击筛选），浅色为已检索、无动态</span></summary>${cov}${scan}</details><div id="brandT"></div>
   <h2><span class="num">III.</span>赛道洞察</h2>${(d.insights||[]).map(a=>`<div class="card article"><div>${tag(a.tier1)}</div><h3>${esc(a.title)}</h3>${String(a.body||'').split(/\n\n+/).map(p=>`<p>${esc(p)}</p>`).join('')}${(a.refs||[]).length?`<div class="muted">参考：${a.refs.map(r=>link(r.url,r.title)).join('；')}</div>`:''}</div>`).join('')||empty('今日无赛道洞察')}
   ${(d.reading_list||[]).length?`<details class="card reading"><summary><b>深度阅读清单</b>（${d.reading_list.length} 篇）</summary><ul>${d.reading_list.map(r=>`<li>${esc(r.date||'')} · ${esc(r.source)} · ${link(r.url,r.title)} ${r.tier1?tag(r.tier1):''}</li>`).join('')}</ul></details>`:''}
   <h2><span class="num">IV.</span>细分趋势与机会</h2><div class="grid">${(d.trends||[]).map(t=>`<div class="card"><div>${tag(t.tier1)} <span class="stage s-${esc(t.stage)}">${esc(t.stage)}</span></div><h3>${esc(t.title)}</h3><p>${esc(t.description)}</p><p><b>机会：</b>${esc(t.opportunity)}</p><div class="muted">证据：${(t.evidence||[]).map(e=>link(e.url,e.title)).join('；')}</div></div>`).join('')||empty('今日无趋势卡片')}</div>
   <h2><span class="num">V.</span>品牌深度洞察</h2>${(d.brand_insights||[]).map(a=>`<div class="card article"><div><span class="tag" style="color:var(--ink)">${esc(a.brand)}</span>${lv(bmap[a.brand]?.watch_level||'')}${tag(a.tier1||bmap[a.brand]?.tier1||'')}</div><h3>${esc(a.title)}</h3>${String(a.body||'').split(/\n\n+/).map(p=>`<p>${esc(p)}</p>`).join('')}<div class="views">${a.investor_view?`<div><span class="eyebrow">Investor View · 投资视角</span><p>${esc(a.investor_view)}</p></div>`:''}${a.operator_view?`<div><span class="eyebrow">Operator View · 经营视角</span><p>${esc(a.operator_view)}</p></div>`:''}</div><div class="muted">来源：${(a.sources||[]).map(r=>link(r.url,r.title)).join('；')}</div></div>`).join('')||empty('今日无品牌深度洞察')}`;
  const rn=()=>{const sg=$('#ns').value,t=$('#nt').value,m=+($('#ni').value.slice(1)||0);const r=news.filter(n=>(!t||n.tier1===t)&&(!sg||n.segment===sg)&&n.importance>=m);
   $('#newsT').innerHTML=r.length?`<table class="tbl"><thead><tr><th>日期</th><th>来源</th><th>标题</th><th>赛道</th><th>定位</th><th>类型</th><th>重要度</th><th>摘要</th></tr></thead><tbody>${r.map(n=>`<tr><td data-l="日期">${esc(n.date)}</td><td data-l="来源">${esc(n.source)}</td><td>${link(n.url,n.title)}</td><td>${tag(n.tier1)}</td><td data-l="定位">${n.segment?`<span class="tag seg">${esc(n.segment)}</span>`:'—'}</td><td data-l="类型">${esc(n.type)}</td><td data-l="重要度"><span class="stars">${'★'.repeat(n.importance)}${'☆'.repeat(5-n.importance)}</span></td><td>${esc(n.summary)}</td></tr>`).join('')}</tbody></table>`:empty('无匹配条目')};
  const rb=()=>{const b=$('#bb').value,l=$('#bl').value,t=$('#bt').value;const r=bn.filter(n=>(!b||n.brand===b)&&(!l||n.watch_level===l)&&(!t||n.tier1===t));
   $('#brandT').innerHTML=r.length?`<table class="tbl"><thead><tr><th>品牌</th><th>级别</th><th>赛道</th><th>日期</th><th>来源</th><th>标题</th><th>摘要</th></tr></thead><tbody>${r.map(n=>`<tr><td><b>${esc(n.brand)}</b></td><td>${lv(n.watch_level)}</td><td>${tag(n.tier1)}</td><td data-l="日期">${esc(n.date)}</td><td data-l="来源">${esc(n.source)}</td><td>${link(n.url,n.title)}</td><td>${esc(n.summary)}</td></tr>`).join('')}</tbody></table>`:empty('今日监测品牌无匹配动态')};
  ['#nt','#ns','#ni'].forEach(s=>$(s).onchange=rn);['#bb','#bl','#bt'].forEach(s=>$(s).onchange=rb);rn();rb();document.querySelectorAll('.chip.yes').forEach(c=>c.onclick=()=>{$('#bb').value=c.dataset.b;rb();$('#brandT').scrollIntoView({behavior:'smooth'})});
}
function archive(idx){app.innerHTML=`<span class="eyebrow">Archive</span><h1>日报归档</h1>`+(idx.length?`<table class="tbl"><thead><tr><th>日期</th><th>要点</th><th>条目数</th></tr></thead><tbody>${idx.map(x=>`<tr><td><a href="#/day/${x.date}">${x.date}</a></td><td>${esc(x.headline)}</td><td data-l="条目">动态 ${x.counts.industry_news} · 品牌 ${x.counts.brand_news} · 洞察 ${x.counts.insights} · 趋势 ${x.counts.trends}</td></tr>`).join('')}</tbody></table>`:empty('暂无归档'))}
async function yearItems(idx,brands){
  const bmap=Object.fromEntries(brands.map(b=>[b.name,b]));
  const y=await get('data/2026-backfill.json').catch(()=>({items:[],sector_reviews:[]}));
  const seen=new Set(),out=[];const K=n=>n.url+'|'+(n.brand||'')+'|'+n.title;
  const push=n=>{if(!n.url||seen.has(K(n))||!String(n.date).startsWith('2026'))return;seen.add(K(n));const b=bmap[n.brand];
    out.push({...n,month:String(n.date).slice(0,7),kind:n.brand?'brand':'industry',tier1:n.tier1||b?.tier1||'综合',watch_level:b?.watch_level||'',importance:n.importance||3,type:n.type||'动态',segment:n.segment||''})};
  (y.items||[]).forEach(push);
  for(const x of idx){const d=await get(`data/${x.date}.json`);(d.industry_news||[]).forEach(push);(d.brand_news||[]).forEach(push)}
  out.sort((a,b)=>String(b.date).localeCompare(String(a.date))||b.importance-a.importance);
  out.reviews=y.sector_reviews||[];out.meta=y;return out;
}
const yrow=n=>`<tr><td data-l="日期" class="nw">${esc(n.date)}${n.date_precision==='month'?'<span class="muted">（月）</span>':''}</td><td>${n.brand?`<a href="#/brands/${encodeURIComponent(n.brand)}"><b>${esc(n.brand)}</b></a> ${lv(n.watch_level)}`:'<span class="muted">行业</span>'}</td><td>${link(n.url,n.title)}${n.summary?`<div class="muted">${esc(n.summary)}</div>`:''}</td><td>${tag(n.tier1)}</td><td data-l="定位" class="nw">${esc(n.segment)}</td><td data-l="类型" class="nw">${esc(n.type)}</td><td data-l="重要度" class="nw">${'●'.repeat(n.importance)}</td><td data-l="来源">${esc(n.source)}</td></tr>`;
const ytbl=r=>r.length?`<table class="tbl"><thead><tr><th>日期</th><th>品牌</th><th>事件</th><th>赛道</th><th>定位</th><th>类型</th><th>重要度</th><th>来源</th></tr></thead><tbody>${r.map(yrow).join('')}</tbody></table>`:empty('无符合条件的事件');
function yearPage(Y,brands){
  const months=[...new Set(Y.map(n=>n.month))].sort().reverse();const types=[...new Set(Y.map(n=>n.type))];
  app.innerHTML=`<span class="eyebrow">The Year in Review · 2026</span><h1>2026 全年</h1><p class="lede">2026-01-01 至 2026-10-14 行业与品牌大事记，共 ${Y.length} 条，全部附原始链接。</p><p class="muted">${esc(Y.meta.method||'')}</p>
  <h2><span class="num">I.</span>年度赛道综述</h2>${Y.reviews.map(r=>`<div class="card article"><div>${tag(r.tier1)}</div><h3>${esc(r.title)}</h3><p>${esc(r.body)}</p>${r.refs.length?`<div class="muted">来源：${r.refs.map((u,i)=>link(u,'['+(i+1)+']')).join(' ')}</div>`:''}</div>`).join('')}
  <h2><span class="num">II.</span>月度时间线</h2><div class="filters"><select id="ym">${opts(months,'全部月份')}</select><select id="yb"><option value="">全部品牌/行业</option><option value="__ind">仅行业</option>${['P0','P1'].map(l=>`<optgroup label="${l}">${brands.filter(b=>b.watch_level===l).map(b=>{const c=Y.filter(n=>n.brand===b.name).length;return `<option value="${esc(b.name)}">${esc(b.name)}（${c}）</option>`}).join('')}</optgroup>`).join('')}</select><select id="yl">${opts(['P0','P1'],'全部级别')}</select><select id="yt">${opts(TIERS,'全部赛道')}</select><select id="ys">${opts(['奢侈品','轻奢','大众'],'全部定位')}</select><select id="yy">${opts(types,'全部类型')}</select><select id="yi">${opts(['5','4','3','2','1'].map(x=>'≥'+x),'全部重要度')}</select></div><div id="yT"></div>`;
  const r=()=>{const m=$('#ym').value,b=$('#yb').value,l=$('#yl').value,t=$('#yt').value,s=$('#ys').value,ty=$('#yy').value,im=+($('#yi').value.slice(1)||0);
    const x=Y.filter(n=>(!m||n.month===m)&&(!b||(b==='__ind'?!n.brand:n.brand===b))&&(!l||n.watch_level===l)&&(!t||n.tier1===t)&&(!s||n.segment===s)&&(!ty||n.type===ty)&&n.importance>=im);
    const g={};x.forEach(n=>(g[n.month]??=[]).push(n));
    $('#yT').innerHTML=Object.keys(g).length?Object.keys(g).sort().reverse().map(k=>`<h3 class="month">${k.slice(5)}<span class="muted"> 月 · ${g[k].length} 条</span></h3>${ytbl(g[k])}`).join(''):empty('无符合条件的事件')};
  ['#ym','#yb','#yl','#yt','#ys','#yy','#yi'].forEach(s=>$(s).onchange=r);r();
}
function brandsPage(brands,Y=[],sel=''){
  const cnt={};Y.forEach(n=>n.brand&&(cnt[n.brand]=(cnt[n.brand]||0)+1));
  app.innerHTML=`<span class="eyebrow">Brand Index</span><h1>品牌库</h1><p class="muted">P0 + P1 共 ${brands.length} 个监测品牌；数字为 2026 年事件数，点击品牌查看全年时间线。</p><div id="tl"></div><div class="filters"><input id="q" placeholder="搜索品牌"><select id="l">${opts(['P0','P1'],'全部级别')}</select><select id="t">${opts([...TIERS,'待确认'],'全部赛道')}</select></div><div id="bl"></div>`;
  if(sel){const x=Y.filter(n=>n.brand===sel);$('#tl').innerHTML=`<div class="card"><span class="eyebrow">2026 Timeline</span><h2 style="margin-top:4px">${esc(sel)}</h2>${ytbl(x)}<p><a href="#/brands">← 返回全部品牌</a></p></div>`}
  const r=()=>{const q=$('#q').value.toLowerCase(),l=$('#l').value,t=$('#t').value;const x=brands.filter(b=>b.name.toLowerCase().includes(q)&&(!l||b.watch_level===l)&&(!t||b.tier1===t));
   $('#bl').innerHTML=`<div class="grid">${x.map(b=>`<a class="card bcard" href="#/brands/${encodeURIComponent(b.name)}"><h3 style="margin:0 0 6px;font-size:19px">${esc(b.name)}</h3><div>${lv(b.watch_level)}${tag(b.tier1)}</div><div class="muted">2026 · ${cnt[b.name]||0} 条</div></a>`).join('')}</div>`};
  ['#q','#l','#t'].forEach(s=>$(s).oninput=r);r();
}
async function sourcesPage(idx,cfg){
  const days=await Promise.all(idx.map(x=>get(`data/${x.date}.json`)));const m=new Map();
  days.forEach(d=>{(d.sources||[]).forEach(s=>m.set(s.name,{...s,n:(m.get(s.name)?.n||0)}));[...(d.industry_news||[]),...(d.brand_news||[])].forEach(n=>{const k=n.source;const o=m.get(k)||{name:k,url:'',tier1:n.tier1||''};o.n=(o.n||0)+1;m.set(k,o)})});
  const L=[...m.values()].sort((a,b)=>b.n-a.n);
  const T=(cfg.tiers||[]).map(t=>`<h3 class="month">${esc(t.tier)}</h3><p>${(t.sources||[]).map(s=>s.url?link(s.url,s.name):esc(s.name)).join(' · ')}</p>`).join('');
  app.innerHTML=`<span class="eyebrow">Sources</span><h1>信源</h1>`+(T?`<p class="muted">监测信源清单（config/sources.json）。</p>${T}<h2>引用统计</h2>`:'')+`<p class="muted">日报中引用过的信源及引用次数。</p>`+(L.length?`<table class="tbl"><thead><tr><th>信源</th><th>赛道</th><th>引用次数</th></tr></thead><tbody>${L.map(s=>`<tr><td>${s.url?link(s.url,s.name):esc(s.name)}</td><td>${s.tier1?tag(s.tier1):''}</td><td data-l="引用">${s.n}</td></tr>`).join('')}</tbody></table>`:empty('暂无信源'));
}
get('config/site.json').then(c=>{const r=document.documentElement.style;Object.entries(c.palette||{}).forEach(([k,v])=>r.setProperty('--'+k,v));if(c.fonts?.serif)r.setProperty('--serif',c.fonts.serif);if(c.fonts?.sans)r.setProperty('--sans',c.fonts.sans);if(c.title)document.title=c.title;if(c.site_name)$('.logo-en').textContent=c.site_name;if(c.site_name_cn)$('.logo-cn').textContent=c.site_name_cn;Object.entries(c.sections||{}).forEach(([k,v])=>{if(!v)document.querySelectorAll(`nav a[data-sec="${k}"]`).forEach(a=>a.style.display='none')})}).catch(()=>{});
addEventListener('hashchange',route);route();
