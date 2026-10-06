'use strict';
const KEY = 'harumoa.tasks.v1';
const $ = id => document.getElementById(id);
const labels = { company: '회사', personal: '개인', todo: '할 일', event: '일정', planned: '예정', progress: '진행 중', done: '완료' };
const localDate = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const today = () => localDate(new Date());
let tasks = [], editing = null, view = 'dashboard', month = new Date(new Date().getFullYear(),new Date().getMonth(),1), reviewText = '';
function notify(message) { $('notice').textContent = message; $('notice').style.display = 'block'; clearTimeout(notify.timer); notify.timer = setTimeout(() => $('notice').style.display = 'none', 4500); }
function validDate(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && localDate(new Date(value+'T12:00:00')) === value; }
function validate(data) {
  if (!Array.isArray(data) || data.length > 10000) throw new Error('잘못된 백업 형식입니다.');
  const ids = new Set();
  return data.map(t => {
    if (!t || typeof t !== 'object' || typeof t.id !== 'string' || !t.id || t.id.length > 100 || ids.has(t.id) || typeof t.title !== 'string' || !t.title.trim() || t.title.length > 150 || !validDate(t.date) || !['company','personal'].includes(t.category) || !['todo','event'].includes(t.kind) || !['planned','progress','done'].includes(t.status)) throw new Error('백업에 올바르지 않은 계획이 있습니다.');
    ids.add(t.id);
    const result = {id:t.id,title:t.title,date:t.date,category:t.category,kind:t.kind,status:t.status};
    for (const [key,max] of [['company',80],['project',80],['notes',5000],['time',5]]) { if (typeof t[key] !== 'string' || t[key].length > max) throw new Error('백업 항목 형식이 올바르지 않습니다.'); result[key] = t[key]; }
    if (t.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(t.time)) throw new Error('시간 형식이 올바르지 않습니다.');
    return result;
  });
}
let demoMode = false, originalTasks = null, storageBlocked = false;
function persist(next, recovery=false) { if(demoMode) { notify('예시 모드를 종료한 뒤 내 계획을 저장하세요.'); return false; } if(storageBlocked && !recovery) { notify('기존 데이터를 읽을 수 없어 저장을 중단했습니다. 백업을 내려받아 확인하세요.'); return false; } try { const previous=tasks; localStorage.setItem(KEY,JSON.stringify(next)); tasks = next; storageBlocked=false; render(); if(window.CloudSync?.user && !recovery) window.CloudSync.save(next,previous); return true; } catch { notify('저장하지 못했습니다. 브라우저 저장 공간과 설정을 확인하세요.'); return false; } }
try { tasks = validate(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { storageBlocked = true; notify('저장된 데이터를 읽을 수 없습니다. 기존 저장 내용은 덮어쓰지 않았습니다. 백업을 확인하세요.'); }
function filtered() { const query = $('search').value.trim().toLocaleLowerCase(); return tasks.filter(t => ($('category').value === 'all' || t.category === $('category').value) && (!query || [t.company,t.project,t.title].some(s => s.toLocaleLowerCase().includes(query)))).sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.title.localeCompare(b.title)); }
function element(tag,className,text) { const node=document.createElement(tag); if(className) node.className=className; if(text !== undefined) node.textContent=text; return node; }
function taskList(container,list) {
  container.replaceChildren();
  if(!list.length) { container.append(element('div','empty','아직 등록된 계획이 없어요.\n새 계획을 추가하고 하루를 채워보세요.')); return; }
  for(const t of list) {
    const card=element('article','task'), check=element('button',`check ${t.status==='done'?'done':''}`,t.status==='done'?'✓':'');
    check.setAttribute('aria-label',`${t.title} ${t.status==='done'?'완료 취소':'완료 처리'}`); check.setAttribute('aria-pressed',String(t.status==='done'));
    check.onclick=()=>persist(tasks.map(item=>item.id===t.id?{...item,status:t.status==='done'?'planned':'done'}:item));
    const body=element('div','task-body'), title=element('button',`task-title ${t.status==='done'?'done-title':''}`,t.title); title.onclick=()=>openEditor(t);
    const meta=element('div','meta'); meta.append(element('span',`badge ${t.category}`,labels[t.category]),element('span','task-date',t.date),element('span','task-kind',labels[t.kind]),element('span','',labels[t.status]));
    if(t.company) meta.append(element('span','',t.company)); if(t.project) meta.append(element('span','',t.project));
    body.append(title,meta); if(t.time) body.append(element('span','task-time',t.time)); if(t.notes) body.append(element('p','notes',t.notes)); card.append(check,body); container.append(card);
  }
}
function render() {
  const list=filtered(), daily=list.filter(t=>t.date===$('day').value);
  syncCompanyOptions(); renderDashboard(list, daily);
  $('collection-title').textContent=view==='personal'?'개인 일정과 할 일':'회사별 업무';
  $('collection-company').hidden=view==='personal';
  taskList($('collection-list'), list.filter(t=>t.category===(view==='personal'?'personal':'company') && (view!=='company'||!$('collection-company').value||t.company===$('collection-company').value)));
  $('day-title').textContent=new Date($('day').value+'T12:00:00').toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'long'});
  $('stats').replaceChildren(); for(const [label,count] of [['전체 계획',daily.length],['진행 중',daily.filter(t=>t.status==='progress').length],['완료',daily.filter(t=>t.status==='done').length]]) { const stat=element('div','stat',label); stat.append(element('strong','',String(count))); $('stats').append(stat); }
  taskList($('day-list'),daily);
  renderCalendar($('calendar'), $('month-title'), list);
  const from=$('review-start').value,to=$('review-end').value;
  if(!validDate(from)||!validDate(to)||from>to) { reviewText='시작일과 종료일을 올바르게 선택하세요.'; $('review-summary').textContent=reviewText; $('review-list').replaceChildren(); return; }
  const review=list.filter(t=>t.date>=from&&t.date<=to && (!$('review-company').value || (t.category==='company' && t.company===$('review-company').value))),done=review.filter(t=>t.status==='done'),ongoing=review.filter(t=>t.status!=='done');
  reviewText=`${$('review-company').value||$('search').value.trim()||'전체'} · ${from} ~ ${to}\n계획 ${review.length}개 / 완료 ${done.length}개 / 남은 계획 ${ongoing.length}개\n\n완료한 업무\n${done.map(t=>'• '+t.title+(t.company?' ('+t.company+')':'')+(t.notes?' — '+t.notes:'')).join('\n')||'아직 완료한 업무가 없습니다.'}\n\n다음 할 일\n${ongoing.map(t=>'• '+t.title+' · '+t.date+' · '+labels[t.status]).join('\n')||'남은 계획이 없습니다.'}`;
  $('review-summary').textContent=reviewText; taskList($('review-list'),review);
}
function switchView(next) {
  view=next; $('category').disabled=['company','personal'].includes(view);
  for(const name of ['dashboard','day','month','review','collection']) $(name+'-view').hidden = name !== (['company','personal'].includes(view)?'collection':view);
  if(view==='company') $('category').value='company'; else if(view==='personal') $('category').value='personal'; else $('category').value='all';
  document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  $('heading').textContent={dashboard:'오늘도, 하나씩 차분하게',day:'오늘의 할 일',month:'한 달의 흐름을 한눈에',company:'회사별 업무',personal:'나를 위한 시간',review:'기록이 다음 계획이 되도록'}[view];
  $('subtitle').textContent=new Date($('day').value+'T12:00:00').toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric',weekday:'long'});
  render();
}
function syncCompanyOptions() {
  const companies=[...new Set(tasks.filter(t=>t.category==='company'&&t.company).map(t=>t.company))].sort((a,b)=>a.localeCompare(b));
  for(const id of ['dashboard-company','collection-company','review-company']) {
    const select=$(id),old=select.value;
    select.replaceChildren();
    if(id!=='dashboard-company'||!companies.length) { const option=element('option','',id==='review-company'?'전체 회사 · 개인':id==='dashboard-company'?'등록된 회사 없음':'모든 회사'); option.value='';select.append(option); }
    for(const company of companies) { const option=element('option','',company);option.value=company;select.append(option); }
    if(companies.includes(old))select.value=old;
  }
}
function renderCalendar(container,heading,list) {
  heading.textContent=month.toLocaleDateString('ko-KR',{year:'numeric',month:'long'})+' 계획';container.replaceChildren();
  const offset=(month.getDay()+6)%7,start=new Date(month.getFullYear(),month.getMonth(),1-offset);
  const days=new Date(month.getFullYear(),month.getMonth()+1,0).getDate(),cells=Math.ceil((offset+days)/7)*7;
  for(let i=0;i<cells;i++) {
    const date=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i),key=localDate(date),items=list.filter(t=>t.date===key),cell=element('button',`calendar-cell ${date.getMonth()!==month.getMonth()?'other':''} ${key===today()?'current':''} ${i%7===5?'saturday':''} ${i%7===6?'sunday':''}`);
    cell.setAttribute('aria-label',`${key}, 계획 ${items.length}개`);cell.append(element('span','day-number',String(date.getDate())));
    for(const t of items.slice(0,2))cell.append(element('span',`calendar-item ${t.category}`,`${t.status==='done'?'✓ ':''}${t.title}`));
    if(items.length>2)cell.append(element('span','calendar-item',`+${items.length-2}개`));
    cell.onclick=()=>{$('day').value=key;switchView('day');};container.append(cell);
  }
}
function statCard(label,count,icon,done,total,accent='') {
  const card=element('div',`stat ${accent}`),symbol=element('span','stat-icon',icon),body=element('div','stat-content');
  body.append(element('span','stat-label',label));const value=element('strong','',String(count));value.append(element('small','',' 개'));body.append(value);
  if(total!==undefined) {const track=element('div','progress-track'),bar=element('span','progress-fill');bar.style.width=`${total?Math.round(done/total*100):0}%`;track.append(bar);const row=element('div','progress-row');row.append(track,element('span','',`${done} / ${total}`));body.append(row);}
  card.append(symbol,body);return card;
}
function renderDashboard(list,daily) {
  const monthly=list.filter(t=>t.date.slice(0,7)===localDate(month).slice(0,7)),done=daily.filter(t=>t.status==='done').length;
  $('dashboard-stats').replaceChildren(statCard('오늘의 할 일',daily.length,'☷',done,daily.length),statCard('완료한 일',done,'✓',done,daily.length),statCard('이번 달 계획',monthly.length,'⚑',monthly.filter(t=>t.status==='done').length,monthly.length,'amber'));
  $('dashboard-day-title').textContent=$('day').value===today()?'오늘의 할 일':'선택한 날의 할 일';
  taskList($('dashboard-list'),daily.slice(0,5));renderCalendar($('dashboard-calendar'),$('dashboard-month-title'),list);
  const company=$('dashboard-company').value,period=$('dashboard-review-month').value;
  const records=list.filter(t=>t.category==='company'&&company&&t.company===company&&t.date.slice(0,7)===period),completed=records.filter(t=>t.status==='done'),remaining=records.filter(t=>t.status!=='done');
  $('company-stats').replaceChildren(statCard('전체 업무',records.length,'▤'),statCard('완료',completed.length,'✓'),statCard('남은 업무',remaining.length,'⋮','',undefined,'amber'));
  $('company-excerpt').textContent=records.length?(completed.length?completed.slice(0,2).map(t=>t.title+(t.notes?' — '+t.notes:'')).join('\n'):'완료한 업무가 아직 없습니다. 업무를 완료하고 결과를 기록해보세요.'):'회사와 월을 선택하면 업무 기록이 여기에 모입니다.';
  $('company-next').textContent=remaining.length?'→ 다음 할 일 · '+remaining[0].title:'✓ 남은 업무가 없습니다.';
}
function openEditor(t=null) { editing=t?.id||null; $('task-form').reset(); $('title').setCustomValidity(''); $('form-title').textContent=t?'계획 수정':'새 계획'; $('delete').hidden=!t; for(const name of ['title','kind','date','time','company','project','status','notes']) $(name).value=t?t[name]:(name==='date'?$('day').value:name==='kind'?'todo':name==='status'?'planned':''); $('task-category').value=t?.category||($('category').value==='personal'?'personal':'company'); $('editor').showModal(); }
$('task-form').onsubmit=e=>{ e.preventDefault(); const title=$('title').value.trim(); if(!title){ $('title').setCustomValidity('제목을 입력하세요.'); $('title').reportValidity(); return; } const t={id:editing||crypto.randomUUID(),title,category:$('task-category').value}; for(const name of ['kind','date','time','company','project','status','notes']) t[name]=$(name).value; try { validate([t]); } catch(error) { notify(error.message); return; } if(persist(editing?tasks.map(old=>old.id===editing?t:old):[...tasks,t])) { $('editor').close(); notify('계획을 저장했습니다.'); } };
$('title').oninput=()=>$('title').setCustomValidity(''); $('add').onclick=()=>openEditor(); $('close').onclick=()=>$('editor').close(); $('delete').onclick=()=>{ if(confirm('이 계획을 삭제할까요?')) if(persist(tasks.filter(t=>t.id!==editing))) $('editor').close(); };
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
for(const id of ['category','day','review-start','review-end','review-company','collection-company','dashboard-company','dashboard-review-month']) $(id).onchange=render; $('search').oninput=render;
$('dashboard-previous').onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()-1,1);render();}; $('dashboard-next').onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()+1,1);render();};
$('previous').onclick=()=>{ month=new Date(month.getFullYear(),month.getMonth()-1,1); render(); }; $('next').onclick=()=>{ month=new Date(month.getFullYear(),month.getMonth()+1,1); render(); };
$('today').onclick=()=>{ $('day').value=today(); month=new Date(new Date().getFullYear(),new Date().getMonth(),1); render(); };
$('export').onclick=()=>{ if(storageBlocked){ notify('읽을 수 없는 저장 데이터를 보존하려면 브라우저 개발자 도구에서 원본을 확인하세요.');return; } const contents=JSON.stringify({version:1,tasks},null,2),filename=`forest-planner-${today()}.json`; if(window.AndroidBridge?.saveBackup){ window.AndroidBridge.saveBackup(contents,filename); return; } const blob=new Blob([contents],{type:'application/json'}),url=URL.createObjectURL(blob),link=element('a'); link.href=url; link.download=filename; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); notify('백업 파일을 내려받았습니다.'); };
$('import').onchange=async e=>{ const file=e.target.files[0]; if(!file)return; try { if(file.size>10*1024*1024) throw new Error('10MB 이하의 백업을 선택하세요.'); const data=JSON.parse(await file.text()); if(data.version!==1) throw new Error('지원하지 않는 백업 버전입니다.'); const incoming=validate(data.tasks); if(confirm(`${incoming.length}개 계획을 가져올까요? 현재 기록은 백업 내용으로 교체됩니다. 먼저 백업을 권장합니다.`)) if(persist(incoming,true)) notify('백업을 가져왔습니다.'); } catch(error) { notify(error.message); } finally { e.target.value=''; } };
$('copy-review').onclick=async()=>{ try { await navigator.clipboard.writeText(reviewText); notify('리뷰를 복사했습니다.'); } catch { notify('복사를 허용하지 않는 브라우저입니다. 리뷰 내용을 직접 선택해 복사하세요.'); } };
$('all-daily').onclick=()=>switchView('day'); $('dashboard-add').onclick=()=>openEditor();
$('open-review').onclick=()=>{const company=$('dashboard-company').value,period=$('dashboard-review-month').value;if(!period){notify('리뷰할 월을 선택하세요.');return;}const [year,m]=period.split('-').map(Number);$('review-start').value=localDate(new Date(year,m-1,1));$('review-end').value=localDate(new Date(year,m,0));$('search').value='';switchView('review');$('review-company').value=company;render();};
$('demo').onclick=()=>{if(demoMode){tasks=originalTasks;originalTasks=null;demoMode=false;}else{originalTasks=tasks;demoMode=true;const date=today(),monthDate=date.slice(0,7);tasks=[['A회사 서버 정기점검','company','A회사','done','09:30','서버 상태와 백업을 확인했습니다.'],['A회사 점검 결과 정리','company','A회사','done','11:00','점검 결과 전달 완료. 다음 점검에서 남은 이슈를 확인합니다.'],['제안서 수정 및 전달','company','A회사','progress','14:00','고객 의견을 반영하고 있습니다.'],['운동 30분','personal','','planned','19:00','']].map((row,i)=>({id:'demo-'+i,title:row[0],category:row[1],company:row[2],status:row[3],time:row[4],notes:row[5],date,kind:'todo',project:row[1]==='company'?'기술 지원':''}));tasks.push({id:'demo-future',title:'가족 일정',category:'personal',company:'',status:'planned',time:'',notes:'',date:monthDate+'-24',kind:'event',project:''});$('day').value=date;month=new Date(new Date().getFullYear(),new Date().getMonth(),1);$('dashboard-review-month').value=date.slice(0,7);}$('demo-label').hidden=!demoMode;$('demo').textContent=demoMode?'내 기록으로 돌아가기':'예시 둘러보기';$('export').disabled=demoMode;$('import').disabled=demoMode;render();};
$('dashboard-review-month').value=today().slice(0,7);
$('day').value=today(); $('review-start').value=localDate(month); $('review-end').value=localDate(new Date(month.getFullYear(),month.getMonth()+1,0)); switchView('dashboard');

let signedInUser = null;
function updateSyncUI(configured,user,pending=false,cached=false) {
  signedInUser=user;
  $('sync-dot').classList.toggle('online',Boolean(user));
  $('sync-title').firstChild.textContent=user?'동기화 계정':'로컬 저장 중';
  $('sync-detail').textContent=user?(pending?'변경사항 전송 중':cached?'오프라인 · 연결 시 동기화':user.email):(configured?'로그인하면 기기 간 동기화':'Firebase 연결 전입니다');
  $('account').textContent=user?'로그아웃':'계정 연결';
  $('footer-sync').textContent=user?(cached?'오프라인 저장 중입니다. 연결되면 자동 동기화됩니다.':'PC와 휴대폰에 동기화됩니다.'):'이 기기에만 저장 중입니다.';
}
window.addEventListener('forest-auth',event=>{
  const previous=signedInUser,user=event.detail.user;
  if(previous&&!user){tasks=[];localStorage.removeItem(KEY);render();}
  updateSyncUI(event.detail.configured,user);
});
window.addEventListener('forest-cloud-tasks',event=>{
  if(!signedInUser)return;
  try {
    const incoming=validate(event.detail.items);
    if(demoMode) originalTasks=incoming; else tasks=incoming;
    localStorage.setItem(KEY,JSON.stringify(incoming));
    updateSyncUI(true,signedInUser,event.detail.pending,event.detail.cached);
    render();
  } catch { notify('동기화된 데이터 형식을 확인할 수 없습니다. 기존 기록을 유지합니다.'); }
});
window.addEventListener('forest-sync-message',event=>notify(event.detail));
window.addEventListener('forest-sync-error',event=>notify(event.detail));
$('account').onclick=async()=>{
  if(signedInUser){if(confirm('이 기기에서 로그아웃할까요? 클라우드 기록은 삭제되지 않습니다.'))await CloudSync.signOut();return;}
  if(!window.CloudSync?.configured){notify('Firebase 프로젝트 연결이 필요합니다. 설정 후 로그인할 수 있습니다.');return;}
  $('login-error').textContent='';$('login-dialog').showModal();
};
$('login-close').onclick=()=>$('login-dialog').close();
async function authenticate(mode){
  const email=$('login-email').value.trim(),password=$('login-password').value,error=$('login-error');
  if(!$('login-form').reportValidity())return;
  error.textContent='';
  try{await CloudSync[mode](email,password);$('login-dialog').close();$('login-form').reset();notify(mode==='signUp'?'계정을 만들고 동기화를 시작했습니다.':'로그인했습니다.');}
  catch(problem){error.textContent=CloudSync.friendlyError(problem);}
}
$('login-form').onsubmit=event=>{event.preventDefault();authenticate('signIn');};
$('signup').onclick=()=>authenticate('signUp');
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
window.CloudSync?.start(()=>tasks);
