import {validateBank,validateState,emptyState,keyOf,shuffle,grade,formatTime,usesText} from './core.js';
const STORE='quiz-practice:v1', $=id=>document.getElementById(id), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state=emptyState(),catalog={banks:[],sources:[]},builtIn=[],view='home',filter='all',toastTimer,loadWarning='';
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),5000);}
function save(){try{localStorage.setItem(STORE,JSON.stringify(state));return true;}catch{toast('無法保存到瀏覽器，請立即匯出備份；目前操作仍保留在此頁。');return false;}}
function restore(){try{const raw=localStorage.getItem(STORE);if(raw)state=validateState(JSON.parse(raw));}catch{loadWarning='無法讀取原有紀錄，已暫用空白狀態。可先匯出原始備份保留資料，再匯入有效備份；避免直接清除瀏覽器資料。';}}
function banks(){const custom=new Map(state.customBanks.map(b=>[b.id,b]));return [...builtIn.filter(b=>!custom.has(b.id)),...state.customBanks];}
function allQuestions(){return banks().flatMap(b=>b.questions);}
function sourceUrl(file){return 'https://github.com/BAGLE102/quiz-practice/blob/main/pdf/'+encodeURIComponent(file);}
function scans(images,label){return (images||[]).map((im,i)=>'<figure class="scan-block"><img src="./'+esc(im.src)+'" width="'+im.width+'" height="'+im.height+'" alt="'+esc(label)+'，第 '+(i+1)+' 部分掃描圖" loading="lazy" decoding="async"><button data-zoom="'+esc(im.src)+'" aria-label="放大'+esc(label)+'第 '+(i+1)+' 部分">放大原圖 ↗</button></figure>').join('');}
function sourceDetails(images,label){return images?.length?'<details class="source-images"><summary>查看'+esc(label)+'原圖（'+images.length+' 張）</summary>'+scans(images,label)+'</details>':'';}
function duration(s){return Math.max(0,((s.submitted?s.completedAt:Date.now())-s.startedAt)/1000);}
function confirmAction(title,text){const d=$('confirm');$('confirm-title').textContent=title;$('confirm-text').textContent=text;return new Promise(resolve=>{d.addEventListener('close',()=>resolve(d.returnValue==='ok'),{once:true});d.showModal();});}
function title(text){document.title=text+' · 刷題小站';}
function render(){document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===view));$('resume').hidden=!state.session;$('resume').textContent=state.session?.submitted?'檢視本次解析':'繼續作答';$('progress').style.width='0%';if(view==='quiz')renderQuiz();else if(view==='setup'){}else if(view==='history')renderHistory();else if(view==='bookmarks')renderBookmarks();else renderHome();}
function go(next){view=next;render();window.scrollTo({top:0,behavior:'instant'});$('main').focus({preventScroll:true});}
function renderHome(){
 title('題庫首頁');const qs=allQuestions(),n=qs.filter(q=>state.records[keyOf(q)]).length;
 $('main').innerHTML='<section class="hero"><div><div class="eyebrow">YOUR PERSONAL STUDY SPACE</div><h1>每次練習，多懂一點。</h1><p>選一份題庫，依自己的步調練習。錯題、收藏與進度，都替你留在這裡。</p></div><div class="hero-icon" aria-hidden="true">✎</div></section>'+
 (loadWarning?'<div class="notice">'+esc(loadWarning)+'</div>':'')+
 '<div class="stats"><div class="stat"><strong>'+banks().length+'</strong>可用題庫</div><div class="stat"><strong>'+qs.length+'</strong>可練習題目</div><div class="stat"><strong>'+n+'</strong>已練習題目</div></div>'+
 (state.session?'<section class="panel"><h2>'+ (state.session.submitted?'查看上次測驗':'接著上次的進度')+'</h2><p class="muted">'+esc(state.session.title)+' · 已答 '+Object.keys(state.session.answers).length+' / '+state.session.questions.length+'</p><button class="primary" data-action="resume">'+(state.session.submitted?'檢視解析':'繼續作答')+'</button></section>':'')+
 '<div class="section-title"><h2>我的題庫</h2><span class="count">即時練習 / 模擬測驗</span></div><div class="grid">'+banks().map(b=>'<section class="bank"><span class="tag">可開始練習</span><h3>'+esc(b.title)+'</h3><p>'+b.questions.length+' 題 · 已練習 '+b.questions.filter(q=>state.records[keyOf(q)]).length+' 題'+(b.questions.some(q=>q.textVerified)?' · 前 '+b.questions.filter(q=>q.textVerified).length+' 題為文字版':'')+'</p><div class="actions"><button class="primary" data-bank="'+esc(b.id)+'">開始練習 →</button></div></section>').join('')+'</div>'+
 (!qs.length?'<div class="panel empty"><h2>題庫整理中</h2><p>已收到原始 PDF，尚未完成題目與答案核對。<br>整理完成後，這裡就能開始練習。</p></div>':'')+
 '<div class="section-title"><h2>原始 PDF</h2><span class="count">'+catalog.sources.length+' 份來源</span></div><section class="panel"><p class="muted">已校對的題目以文字顯示，原圖收在「查看原圖」；其他題目保留掃描版。答案依原書印刷標記，內容未另核對現行法規。部分原始掃描有頁邊裁切，可對照紙本核對。</p><ul class="file-list">'+catalog.sources.map(s=>'<li><a href="'+sourceUrl(s.file)+'" target="_blank" rel="noopener">'+esc(s.file)+'</a> <small>'+esc(s.status || '待整理')+'</small></li>').join('')+'</ul></section>'+
 '<div class="section-title"><h2>資料與備份</h2></div><section class="panel"><p class="muted">紀錄只存在此瀏覽器。換裝置或清除資料前，請先匯出備份。</p><div class="tools"><button data-action="export">匯出備份</button><button data-action="import">匯入備份</button><button data-action="bank-import">匯入 JSON 題庫</button><button class="danger" data-action="clear">清除本機紀錄</button></div></section>';
}
function setup(bankId,customQuestions=null,customTitle=null){
 const bank=banks().find(b=>b.id===bankId), qs=customQuestions||bank?.questions;
 if(!qs?.length){toast('目前沒有可練習的題目。');return;}
 view='setup';render();title('測驗設定');
 $('main').innerHTML='<section class="hero"><div><div class="eyebrow">READY WHEN YOU ARE</div><h1>'+esc(customTitle||bank.title)+'</h1><p>設定這次練習方式，開始後整份試卷會依序顯示。</p></div></section><form id="setup-form" class="panel setup"><div class="setup-grid"><div><label for="mode">作答模式</label><select id="mode"><option value="instant">即時練習：選答後看解析</option><option value="exam">模擬測驗：交卷後看解析</option></select></div><div><label for="scope">練習範圍</label><select id="scope"><option value="all">全部題目（'+qs.length+' 題）</option><option value="wrong">曾答錯／未答</option><option value="bookmarks">已收藏題目</option></select></div><div><label for="amount">題數上限</label><input type="number" id="amount" min="1" max="'+qs.length+'" value="'+qs.length+'" required></div></div><label class="check"><input id="shuffle" type="checkbox">打亂題目順序（選項順序保持原文）</label><p class="muted">計時從開始作答至交卷，包含離開頁面的時間。此站沒有登入，紀錄只保存在本機。</p><div class="actions"><button type="button" data-nav="home">返回首頁</button><button class="primary" type="submit">開始作答</button></div></form>';
 $('setup-form').addEventListener('submit',async e=>{
  e.preventDefault();const mode=$('mode').value,scope=$('scope').value,limit=Number($('amount').value),random=$('shuffle').checked;
  let chosen=qs.filter(q=>scope==='all'||(scope==='wrong'&&state.records[keyOf(q)]?.correct===false)||(scope==='bookmarks'&&state.bookmarks.includes(keyOf(q))));
  if(!chosen.length){toast('此範圍沒有題目，請改選全部題目。');return;}
  if(random)chosen=shuffle(chosen);chosen=chosen.slice(0,limit);
  if(state.session && !await confirmAction('開始新的測驗？','目前測驗將被取代。已交卷的成績、錯題與收藏會保留，未交卷的模擬測驗不會列入紀錄。'))return;
  state.session={id:crypto.randomUUID(),title:customTitle||bank.title,mode,questions:chosen,answers:{},startedAt:Date.now(),submitted:false,completedAt:null};filter='all';save();go('quiz');
 });
}
function visible(q,s){const k=keyOf(q),a=s.answers[k],reveal=s.submitted||(s.mode==='instant'&&a!==undefined);return filter==='all'||(filter==='unanswered'&&a===undefined)||(filter==='bookmarks'&&state.bookmarks.includes(k))||(filter==='wrong'&&reveal&&a!==q.answer);}
function renderQuiz(){
 const s=state.session;if(!s){view='home';renderHome();return;}title(s.title);
 const revealAll=s.submitted,answered=Object.keys(s.answers).length,result=grade(s.questions,s.answers);
 const currentById=new Map(allQuestions().map(q=>[keyOf(q),q]));const hasNewText=s.questions.some(q=>!q.textVerified&&currentById.get(keyOf(q))?.textVerified);
 $('progress').style.width=answered/s.questions.length*100+'%';
 $('main').innerHTML='<section class="panel"><span class="tag">'+(s.mode==='instant'?'即時練習':'模擬測驗')+(s.submitted?' · 已交卷':'')+'</span><h1 style="font-size:1.5rem;margin-top:.7rem">'+esc(s.title)+'</h1><div class="quiz-tools"><span class="timer" id="timer">'+formatTime(duration(s))+'</span><span class="count">已答 '+answered+' / '+s.questions.length+'</span><button data-action="export">備份進度</button>'+(s.submitted?'<button data-action="retry" class="primary">重練錯題</button>':'<button data-action="submit" class="primary">交卷計分</button>')+'</div>'+
 (hasNewText?'<div class="notice">這份試卷保留開始時的版本。返回首頁開始新的總則測驗，即可查看前 10 題文字版；既有成績與收藏會保留。</div>':'')+
 (s.submitted?'<div class="notice">本次得分 <strong>'+result.score+'</strong> 分 · 答對 '+result.correct+' 題 · 答錯／未答 '+result.wrong+' 題（其中未答 '+result.unanswered+' 題）。下方已展開解析。</div>':'')+
 '<div class="quiz-tools"><label for="filter">顯示題目</label><select id="filter"><option value="all">全部</option><option value="unanswered">未答</option><option value="bookmarks">收藏</option>'+((s.submitted||s.mode==='instant')?'<option value="wrong">錯題</option>':'')+'</select><span class="muted count">題號底線表示已收藏</span></div></section>'+
 '<div class="quiz-layout"><div class="quiz-main" id="questions"></div><aside class="panel side"><h3>題號導覽</h3><div class="numbers">'+s.questions.map((q,i)=>{const a=s.answers[keyOf(q)],revealed=revealAll||(s.mode==='instant'&&a!==undefined);return '<button data-jump="'+i+'" aria-label="跳至第 '+(i+1)+' 題" class="'+(revealed?(a===q.answer?'correct':'wrong'):(a!==undefined?'answered':''))+(state.bookmarks.includes(keyOf(q))?' star':'')+'">'+(i+1)+'</button>';}).join('')+'</div></aside></div>';
 $('filter').value=filter;$('filter').addEventListener('change',()=>{filter=$('filter').value;renderQuestions();});
 renderQuestions();
}
function renderQuestions(){
 const s=state.session;let count=0;
 $('questions').innerHTML=s.questions.map((q,i)=>{
 if(!visible(q,s))return '';count++;const k=keyOf(q),a=s.answers[k],reveal=s.submitted||(s.mode==='instant'&&a!==undefined),star=state.bookmarks.includes(k),text=usesText(q);
 return '<article class="question" id="q-'+i+'"><div class="question-head"><span class="qnum">第 '+(i+1)+' 題 <span class="muted">/ 原題 '+esc(q.number)+'</span>'+(q.textVerified?'<span class="text-tag">文字版</span>':'')+'</span><button class="bookmark '+(star?'selected':'')+'" data-star="'+i+'" aria-pressed="'+star+'">'+(star?'★ 已收藏':'☆ 收藏')+'</button></div>'+(text?'<p class="stem">'+esc(q.stem)+'</p>':scans(q.questionImages,'原題 '+q.number+' 題面'))+'<div class="options '+(!text?'scan-options':'')+'" role="group" aria-label="第 '+(i+1)+' 題選項">'+q.options.map((o,j)=>'<button class="option '+(a===j?'chosen ':'')+(reveal&&j===q.answer?'correct ':'')+(reveal&&a===j&&a!==q.answer?'wrong':'')+'" data-answer="'+i+','+j+'" aria-label="選項 '+(j+1)+(text?'，'+esc(o):'')+(reveal&&j===q.answer?'，正確答案':'')+(reveal&&a===j&&a!==q.answer?'，你的答案，錯誤':'')+'" aria-pressed="'+(a===j)+'" '+(s.submitted?'disabled':'')+'><span>'+(j+1)+'</span><span>'+esc(o)+(reveal&&j===q.answer?'<em class="answer-badge"> ✓ 正確答案</em>':'')+(reveal&&a===j&&a!==q.answer?'<em class="answer-badge"> ✗ 你的答案</em>':'')+'</span></button>').join('')+'</div>'+(text?sourceDetails(q.questionImages,'題目'):'')+
 (reveal?'<div class="explanation"><strong>'+(a===undefined?'未作答':a===q.answer?'✓ 答對了':'✗ 答錯了')+' · 正確答案（'+(q.answer+1)+'）</strong>'+'<div class="explanation-text">'+esc(q.explanation||'原始題庫未提供解析。')+'</div>'+(text?sourceDetails(q.explanationImages,'解析'):scans(q.explanationImages,'原題 '+q.number+' 解析'))+'</div>':'')+(q.sourceNotice?'<p class="source-notice">'+esc(q.sourceNotice)+'</p>':'')+
 '<div class="source">'+esc(q.bankTitle)+(q.source.file?' · '+esc(q.source.file):'')+(q.source.page?' · PDF 第 '+q.source.page+' 頁':'')+(q.source.file?'<a href="'+sourceUrl(q.source.file)+(q.source.page?'#page='+q.source.page:'')+'" target="_blank" rel="noopener">查看來源</a>':'')+'</div></article>';
 }).join('');
 if(!count)$('questions').innerHTML='<div class="panel empty">這個篩選範圍沒有題目。</div>';
}
async function submit(){
 const s=state.session;if(!s||s.submitted)return;const missing=s.questions.length-Object.keys(s.answers).length;
 if(!await confirmAction('確認交卷？',missing?'還有 '+missing+' 題未答，交卷後會計為錯題。':'交卷後將統一計分，答案不再修改。'))return;
 s.submitted=true;s.completedAt=Date.now();const r=grade(s.questions,s.answers);
 for(const q of s.questions)state.records[keyOf(q)]={correct:s.answers[keyOf(q)]===q.answer};
 state.history.unshift({id:s.id,title:s.title,total:r.total,correct:r.correct,score:r.score,duration:duration(s),completedAt:s.completedAt});state.history=state.history.slice(0,100);save();filter='all';renderQuiz();
 $('result-body').innerHTML='<div class="result-hero"><span class="tag">本次測驗完成</span><h2 style="margin-top:1rem">'+esc(s.title)+'</h2><div class="score">'+r.score+'<small style="font-size:1rem"> / 100</small></div></div><div class="stats"><div class="stat"><strong>'+r.correct+'</strong>答對</div><div class="stat"><strong>'+r.wrong+'</strong>答錯／未答</div><div class="stat"><strong style="font-size:1rem">'+formatTime(duration(s))+'</strong>總用時</div></div><p class="muted">本次分數依答對比例計算，非官方測驗評分或及格判定。</p>';
 $('result-retry').disabled=!r.wrong;$('result').showModal();
}
function retry(){
 const s=state.session;if(!s?.submitted)return;
 const qs=s.questions.filter(q=>s.answers[keyOf(q)]!==q.answer);
 if(!qs.length){toast('這次全部答對，沒有錯題。');return;}
 if($('result').open)$('result').close();setup(null,qs,'錯題重練');
}
function renderBookmarks(){
 title('收藏複習');const qs=allQuestions().filter(q=>state.bookmarks.includes(keyOf(q)));
 $('main').innerHTML='<section class="hero"><div><div class="eyebrow">SAVE IT FOR LATER</div><h1>收藏複習</h1><p>把還不熟悉的題目留在這裡，下次集中練習。</p></div></section><section class="panel"><h2>'+qs.length+' 題可複習</h2><p class="muted">收藏會跨測驗保留。題庫若被移除，相關收藏會在題庫恢復後重新出現。</p><button class="primary" id="practice-bookmarks" '+(!qs.length?'disabled':'')+'>練習收藏題目</button></section><div class="grid">'+qs.map(q=>'<section class="bank"><span class="tag">'+esc(q.bankTitle)+' · 原題 '+esc(q.number)+'</span>'+(usesText(q)?'<p>'+esc(q.stem)+'</p>':scans(q.questionImages.slice(0,1),'原題 '+q.number))+'</section>').join('')+'</div>';
 $('practice-bookmarks').onclick=()=>setup(null,qs,'收藏題目複習');
}
function renderHistory(){
 title('測驗紀錄');$('main').innerHTML='<section class="hero"><div><div class="eyebrow">ONE STEP AT A TIME</div><h1>測驗紀錄</h1><p>保留最近 100 次交卷成績。單題即時練習需交卷後，才會出現在這裡。</p></div></section><section class="panel">'+(state.history.length?state.history.map(h=>'<div class="history-row"><div><strong>'+esc(h.title)+'</strong><small>'+esc(new Date(h.completedAt).toLocaleString('zh-TW'))+' · '+formatTime(h.duration)+'</small><p class="count">答對 '+h.correct+' / '+h.total+' 題</p></div><strong style="font-size:1.5rem;color:var(--blue)">'+h.score+' 分</strong></div>').join(''):'<div class="empty">還沒有測驗紀錄，完成一次測驗後就會出現。</div>')+'</section>';
}
function exportBackup(){
 let data=JSON.stringify(state,null,2),name='quiz-practice-backup-';
 if(loadWarning){try{data=localStorage.getItem(STORE)||data;name='quiz-practice-raw-recovery-';}catch{}}
 const blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('備份已匯出，請保留下載檔案。');
}
async function readJson(file){if(!file)return null;if(file.size>20*1024*1024)throw new Error('檔案超過 20 MiB，請拆分後匯入。');return JSON.parse(await file.text());}
$('backup-input').addEventListener('change',async e=>{try{const raw=await readJson(e.target.files[0]);if(!raw)return;const next=validateState(raw);if(await confirmAction('匯入備份？','此備份將取代目前本機的進度、紀錄、收藏及自訂題庫。建議先匯出目前資料。')){state=next;loadWarning='';save();go('home');toast('備份已匯入。');}}catch(err){toast('匯入失敗：'+err.message);}finally{e.target.value='';}});
$('bank-input').addEventListener('change',async e=>{try{const raw=await readJson(e.target.files[0]);if(!raw)return;const b=validateBank(raw);if(!b.questions.length)throw new Error('題庫沒有題目。');if(banks().some(x=>x.id===b.id)&&!await confirmAction('取代相同 ID 的題庫？','新的題庫會取代此瀏覽器中的同 ID 題庫。既有測驗仍使用開始時的題目快照；若修改題意或答案，請改用新的題目 ID。'))return;state.customBanks=state.customBanks.filter(x=>x.id!==b.id).concat(b);save();go('home');toast('已匯入 '+b.questions.length+' 題。');}catch(err){toast('匯入失敗：'+err.message);}finally{e.target.value='';}});
document.addEventListener('click',async e=>{
 const button=e.target.closest('button');if(!button)return;
 if(button.dataset.zoom){$('scan-image').src='./'+button.dataset.zoom;$('scan-image').classList.remove('enlarged');$('scan-size').textContent='放大原圖';$('scan-viewer').showModal();return;}
 if(button.dataset.nav){go(button.dataset.nav);return;}
 if(button.dataset.bank){setup(button.dataset.bank);return;}
 if(button.dataset.answer){const [i,a]=button.dataset.answer.split(',').map(Number),s=state.session;if(!s||s.submitted)return;const q=s.questions[i],k=keyOf(q);s.answers[k]=a;if(s.mode==='instant')state.records[k]={correct:a===q.answer};save();const y=window.scrollY;renderQuiz();window.scrollTo({top:y,behavior:'instant'});document.querySelector('[data-answer="'+i+','+a+'"]')?.focus({preventScroll:true});return;}
 if(button.dataset.star){const q=state.session.questions[Number(button.dataset.star)],k=keyOf(q);state.bookmarks=state.bookmarks.includes(k)?state.bookmarks.filter(x=>x!==k):state.bookmarks.concat(k);save();renderQuiz();document.querySelector('[data-star="'+button.dataset.star+'"]')?.focus({preventScroll:true});return;}
 if(button.dataset.jump){const i=button.dataset.jump;if(!document.getElementById('q-'+i)){filter='all';$('filter').value='all';renderQuestions();}document.getElementById('q-'+i)?.scrollIntoView({behavior:'smooth',block:'start'});return;}
 const action=button.dataset.action;
 if(action==='resume')go('quiz');
 if(action==='submit')await submit();
 if(action==='retry')retry();
 if(action==='export')exportBackup();
 if(action==='import')$('backup-input').click();
 if(action==='bank-import')$('bank-input').click();
 if(action==='clear'&&await confirmAction('清除本機紀錄？','這會刪除此瀏覽器的作答進度、測驗紀錄、收藏與匯入題庫。建議先匯出備份。')){state=emptyState();loadWarning='';save();go('home');}
});
$('brand').onclick=e=>{e.preventDefault();go('home');};$('resume').onclick=()=>go('quiz');$('result-review').onclick=()=>$('result').close();$('result-retry').onclick=retry;
$('scan-close').onclick=()=>$('scan-viewer').close();$('scan-size').onclick=()=>{const enlarged=$('scan-image').classList.toggle('enlarged');$('scan-size').textContent=enlarged?'縮回畫面':'放大原圖';};
setInterval(()=>{if(view==='quiz'&&state.session&&$('timer'))$('timer').textContent=formatTime(duration(state.session));},1000);
async function init(){
 restore();
 try{const response=await fetch('./data/catalog.json');if(!response.ok)throw new Error('題庫目錄讀取失敗');catalog=await response.json();
 const loaded=await Promise.allSettled(catalog.banks.map(async item=>{const r=await fetch('./data/'+item.path);if(!r.ok)throw new Error(item.path+' 讀取失敗');return validateBank(await r.json());}));
 loaded.forEach((r,i)=>{if(r.status==='fulfilled')builtIn.push(r.value);else loadWarning+=' 題庫 '+catalog.banks[i].path+' 載入失敗。';});
 if(new Set(builtIn.map(b=>b.id)).size!==builtIn.length)throw new Error('內建題庫 ID 重複');
 }catch(err){loadWarning+=' '+err.message+'，請確認使用 HTTP 預覽網站，或稍後重試。';}
 go('home');
}
init();
