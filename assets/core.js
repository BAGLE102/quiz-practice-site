export const VERSION = 1;
export const usesText = q => q.textVerified === true || !q.questionImages?.length;
export function validateImages(value) {
  if(value == null)return [];
  if(!Array.isArray(value)||value.length>20)throw new Error('掃描圖片格式無效。');
  return value.map(x=>{
    if(!x||typeof x.src!=='string'||!/^assets\/questions\/[a-zA-Z0-9_/-]+\.(jpg|png|webp)$/.test(x.src)||x.src.includes('..')||!Number.isInteger(x.width)||!Number.isInteger(x.height)||x.width<1||x.height<1||x.width>10000||x.height>20000)throw new Error('掃描圖片路徑或尺寸無效。');
    return {src:x.src,width:x.width,height:x.height};
  });
}
export function validateBank(raw) {
  if (!raw || typeof raw !== 'object' || !/^[a-zA-Z0-9_-]{1,80}$/.test(raw.id || '') || typeof raw.title !== 'string' || !raw.title.trim() || raw.title.length > 200 || !Array.isArray(raw.questions) || raw.questions.length > 5000) throw new Error('題庫格式不符：需要 id、title 與 questions。');
  const seen = new Set();
  const questions = raw.questions.map(q => {
    if (!q || typeof q.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(q.id) || seen.has(q.id)) throw new Error('題目 ID 無效或重複。');
    seen.add(q.id);
    if (typeof q.stem !== 'string' || !q.stem.trim() || q.stem.length > 20000 || !Array.isArray(q.options) || q.options.length !== 4 || q.options.some(o => typeof o !== 'string' || !o.trim() || o.length > 10000) || !Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) throw new Error('每題需要題幹、四個選項與 0–3 的答案索引。');
    if (q.explanation != null && (typeof q.explanation !== 'string' || q.explanation.length > 30000)) throw new Error('解析格式無效。');
    if(q.source != null && (typeof q.source !== 'object' || Array.isArray(q.source))) throw new Error('來源格式無效。');
    if(q.textVerified != null && typeof q.textVerified!=='boolean')throw new Error('文字校對標記格式無效。');
    const source = q.source || {};
    return {id:q.id, number:String(q.number ?? q.id).slice(0,100), stem:q.stem, options:[...q.options], answer:q.answer, explanation:q.explanation || '', textVerified:q.textVerified===true,questionImages:validateImages(q.questionImages),explanationImages:validateImages(q.explanationImages),sourceNotice:String(q.sourceNotice||'').slice(0,500),source:{file:String(source.file || '').slice(0,300),page:Number.isInteger(source.page) && source.page > 0 ? source.page : null}, bankId:raw.id, bankTitle:raw.title};
  });
  return {id:raw.id,title:raw.title,questions};
}
export const keyOf = q => q.bankId + ':' + q.id;
export function shuffle(items, random = Math.random) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {const j = Math.floor(random() * (i + 1)); [a[i],a[j]]=[a[j],a[i]];}
  return a;
}
export function grade(questions, answers) {
  const correct=questions.filter(q=>answers[keyOf(q)]===q.answer).length;
  const unanswered=questions.filter(q=>!Object.hasOwn(answers,keyOf(q))).length;
  return {total:questions.length,correct,wrong:questions.length-correct,unanswered,score:questions.length ? Math.round(correct/questions.length*100) : 0};
}
export function formatTime(seconds) {
  const n=Math.max(0,Math.floor(seconds));
  return [Math.floor(n/3600),Math.floor(n/60)%60,n%60].map(x=>String(x).padStart(2,'0')).join(':');
}
export const emptyState = () => ({version:VERSION,session:null,bookmarks:[],records:{},history:[],customBanks:[]});
export function validateState(value) {
  if(!value || value.version!==VERSION || !Array.isArray(value.bookmarks) || value.bookmarks.some(x=>typeof x!=='string') || !Array.isArray(value.history) || value.history.length>100 || !Array.isArray(value.customBanks) || value.customBanks.length>100 || !value.records || typeof value.records!=='object' || Array.isArray(value.records)) throw new Error('備份格式或版本不符。');
  const banks=value.customBanks.map(validateBank);
  if(new Set(banks.map(b=>b.id)).size!==banks.length) throw new Error('備份有重複題庫。');
  const state=emptyState();state.customBanks=banks;state.bookmarks=[...new Set(value.bookmarks)].slice(0,50000);
  for(const [k,r] of Object.entries(value.records)) {
    if(r && typeof r.correct==='boolean') state.records[k]={correct:r.correct};
  }
  state.history=value.history.map(h=>{
    if(!h || typeof h.id!=='string' || typeof h.title!=='string' || !Number.isInteger(h.total) || h.total<1 || !Number.isInteger(h.correct) || h.correct<0 || h.correct>h.total || !Number.isFinite(h.duration) || h.duration<0 || !Number.isFinite(h.completedAt)) throw new Error('測驗紀錄格式無效。');
    return {id:h.id,title:h.title.slice(0,200),total:h.total,correct:h.correct,score:Math.round(h.correct/h.total*100),duration:h.duration,completedAt:h.completedAt};
  });
  if(value.session) {
    const s=value.session;
    if(typeof s.id!=='string' || typeof s.title!=='string' || !['instant','exam'].includes(s.mode) || typeof s.submitted!=='boolean' || !Array.isArray(s.questions) || !s.questions.length || s.questions.length>5000 || !Number.isFinite(s.startedAt) || s.startedAt<0 || !s.answers || typeof s.answers!=='object' || Array.isArray(s.answers)) throw new Error('測驗進度格式無效。');
    const questions=s.questions.map(q=>{
      if(typeof q.bankId!=='string' || typeof q.bankTitle!=='string') throw new Error('題目來源不完整。');
      return validateBank({id:q.bankId,title:q.bankTitle,questions:[q]}).questions[0];
    });
    if(new Set(questions.map(keyOf)).size!==questions.length) throw new Error('測驗有重複題目。');
    const answers={};for(const q of questions){const a=s.answers[keyOf(q)];if(a!==undefined){if(!Number.isInteger(a)||a<0||a>3)throw new Error('答案格式無效。');answers[keyOf(q)]=a;}}
    if(s.submitted && (!Number.isFinite(s.completedAt)||s.completedAt<s.startedAt)) throw new Error('交卷時間無效。');
    state.session={id:s.id,title:s.title.slice(0,200),mode:s.mode,questions,answers,startedAt:s.startedAt,submitted:s.submitted,completedAt:s.submitted?s.completedAt:null};
  }
  return state;
}
