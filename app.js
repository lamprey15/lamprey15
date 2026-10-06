'use strict';
const KEY = 'harumoa.tasks.v1';
const $ = id => document.getElementById(id);
const labels = { company: '회사', personal: '개인', todo: '할 일', event: '일정', planned: '예정', progress: '진행 중', done: '완료' };
const localDate = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const today = () => localDate(new Date());
let tasks = [], editing = null, view = 'day', month = new Date(new Date().getFullYear(),new Date().getMonth(),1), reviewText = '';
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
function persist(next) { try { localStorage.setItem(KEY,JSON.stringify(next)); tasks = next; render(); return true; } catch { notify('저장하지 못했습니다. 브라우저 저장 공간과 설정을 확인하세요.'); return false; } }
try { tasks = validate(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { notify('저장된 데이터를 읽을 수 없습니다. 기존 저장 내용은 덮어쓰지 않았습니다. 백업을 확인하세요.'); }
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
    const meta=element('div','meta'); meta.append(element('span',`badge ${t.category}`,labels[t.category]),element('span','',`${t.date}${t.time?' · '+t.time:''}`),element('span','',labels[t.kind]),element('span','',labels[t.status]));
    if(t.company) meta.append(element('span','',t.company)); if(t.project) meta.append(element('span','',t.project));
    body.append(title,meta); if(t.notes) body.append(element('p','notes',t.notes)); card.append(check,body); container.append(card);
  }
}
function render() {
  const list=filtered(), daily=list.filter(t=>t.date===$('day').value);
  $('day-title').textContent=new Date($('day').value+'T12:00:00').toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'long'});
  $('stats').replaceChildren(); for(const [label,count] of [['전체 계획',daily.length],['진행 중',daily.filter(t=>t.status==='progress').length],['완료',daily.filter(t=>t.status==='done').length]]) { const stat=element('div','stat',label); stat.append(element('strong','',String(count))); $('stats').append(stat); }
  taskList($('day-list'),daily);
  $('month-title').textContent=month.toLocaleDateString('ko-KR',{year:'numeric',month:'long'}); $('calendar').replaceChildren();
  const start=new Date(month.getFullYear(),month.getMonth(),1-month.getDay());
  for(let i=0;i<42;i++) { const date=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i), key=localDate(date), items=list.filter(t=>t.date===key), cell=element('button',`calendar-cell ${date.getMonth()!==month.getMonth()?'other':''} ${key===today()?'current':''}`); cell.setAttribute('aria-label',`${key}, 계획 ${items.length}개`); cell.append(element('span','day-number',String(date.getDate()))); for(const t of items.slice(0,2)) cell.append(element('span',`calendar-item ${t.category}`,`${t.status==='done'?'✓ ':''}${t.title}`)); if(items.length>2) cell.append(element('span','calendar-item',`+${items.length-2}개`)); cell.onclick=()=>{ $('day').value=key; switchView('day'); }; $('calendar').append(cell); }
  const from=$('review-start').value,to=$('review-end').value;
  if(!validDate(from)||!validDate(to)||from>to) { reviewText='시작일과 종료일을 올바르게 선택하세요.'; $('review-summary').textContent=reviewText; $('review-list').replaceChildren(); return; }
  const review=list.filter(t=>t.date>=from&&t.date<=to),done=review.filter(t=>t.status==='done'),ongoing=review.filter(t=>t.status!=='done');
  reviewText=`${$('search').value.trim()||'전체'} · ${from} ~ ${to}\n계획 ${review.length}개 / 완료 ${done.length}개 / 남은 계획 ${ongoing.length}개\n\n완료한 업무\n${done.map(t=>'• '+t.title+(t.company?' ('+t.company+')':'')+(t.notes?' — '+t.notes:'')).join('\n')||'아직 완료한 업무가 없습니다.'}\n\n다음 할 일\n${ongoing.map(t=>'• '+t.title+' · '+t.date+' · '+labels[t.status]).join('\n')||'남은 계획이 없습니다.'}`;
  $('review-summary').textContent=reviewText; taskList($('review-list'),review);
}
function switchView(next) { view=next; for(const name of ['day','month','review']) $(name+'-view').hidden=name!==view; document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.view===view)); $('heading').textContent={day:'하루 계획',month:'월간 달력',review:'모아보기 · 리뷰'}[view]; $('subtitle').textContent={day:'오늘의 할 일과 약속을 한곳에서.',month:'한 달의 흐름을 보고 여유 있게 계획하세요.',review:'회사와 프로젝트별 기록을 모아 돌아보세요.'}[view]; render(); }
function openEditor(t=null) { editing=t?.id||null; $('task-form').reset(); $('form-title').textContent=t?'계획 수정':'새 계획'; $('delete').hidden=!t; for(const name of ['title','kind','date','time','company','project','status','notes']) $(name).value=t?t[name]:(name==='date'?$('day').value:name==='kind'?'todo':name==='status'?'planned':''); $('task-category').value=t?.category||($('category').value==='personal'?'personal':'company'); $('editor').showModal(); }
$('task-form').onsubmit=e=>{ e.preventDefault(); const title=$('title').value.trim(); if(!title){ $('title').setCustomValidity('제목을 입력하세요.'); $('title').reportValidity(); return; } const t={id:editing||crypto.randomUUID(),title,category:$('task-category').value}; for(const name of ['kind','date','time','company','project','status','notes']) t[name]=$(name).value; try { validate([t]); } catch(error) { notify(error.message); return; } if(persist(editing?tasks.map(old=>old.id===editing?t:old):[...tasks,t])) { $('editor').close(); notify('계획을 저장했습니다.'); } };
$('title').oninput=()=>$('title').setCustomValidity(''); $('add').onclick=()=>openEditor(); $('close').onclick=()=>$('editor').close(); $('delete').onclick=()=>{ if(confirm('이 계획을 삭제할까요?')) if(persist(tasks.filter(t=>t.id!==editing))) $('editor').close(); };
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
for(const id of ['category','day','review-start','review-end']) $(id).onchange=render; $('search').oninput=render;
$('previous').onclick=()=>{ month=new Date(month.getFullYear(),month.getMonth()-1,1); render(); }; $('next').onclick=()=>{ month=new Date(month.getFullYear(),month.getMonth()+1,1); render(); };
$('today').onclick=()=>{ $('day').value=today(); month=new Date(new Date().getFullYear(),new Date().getMonth(),1); render(); };
$('export').onclick=()=>{ const blob=new Blob([JSON.stringify({version:1,tasks},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=element('a'); link.href=url; link.download=`harumoa-${today()}.json`; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); notify('백업 파일을 내려받았습니다.'); };
$('import').onchange=async e=>{ const file=e.target.files[0]; if(!file)return; try { if(file.size>10*1024*1024) throw new Error('10MB 이하의 백업을 선택하세요.'); const data=JSON.parse(await file.text()); if(data.version!==1) throw new Error('지원하지 않는 백업 버전입니다.'); const incoming=validate(data.tasks); if(confirm(`${incoming.length}개 계획을 가져올까요? 현재 기록은 백업 내용으로 교체됩니다. 먼저 백업을 권장합니다.`)) if(persist(incoming)) notify('백업을 가져왔습니다.'); } catch(error) { notify(error.message); } finally { e.target.value=''; } };
$('copy-review').onclick=async()=>{ try { await navigator.clipboard.writeText(reviewText); notify('리뷰를 복사했습니다.'); } catch { notify('복사를 허용하지 않는 브라우저입니다. 리뷰 내용을 직접 선택해 복사하세요.'); } };
$('day').value=today(); $('review-start').value=localDate(month); $('review-end').value=localDate(new Date(month.getFullYear(),month.getMonth()+1,0)); render();
