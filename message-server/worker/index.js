const HOME = 'https://yeonsungai27-art.github.io';
const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
const hash = async s => hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))));
const json = (data, status=200) => new Response(JSON.stringify(data), {status, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
const uuid = s => typeof s==='string' && /^[a-f0-9-]{36}$/.test(s);
const keyOK = s => typeof s==='string' && /^[a-f0-9]{64}$/.test(s);
const admin = (r,e) => !!e.ADMIN_EMAIL && r.headers.get('oai-authenticated-user-email')?.toLowerCase()===e.ADMIN_EMAIL.toLowerCase();
const validBody = s => typeof s==='string' && s.trim().length>0 && s.length<=5000;
async function input(r){if(Number(r.headers.get('content-length'))>20000)throw Error('too large');const text=await r.text();if(text.length>20000)throw Error('too large');return JSON.parse(text);}
export async function api(r,env){
 const u=new URL(r.url), path=u.pathname;
 if(r.method==='OPTIONS')return new Response(null,{status:204});
 if(path==='/api/messages' && r.method==='POST'){
  let d;try{d=await input(r);}catch{return json({error:'입력 내용을 확인해주세요.'},400);}
  if(!uuid(d.id)||!keyOK(d.key)||typeof d.author!=='string'||!d.author.trim()||d.author.length>40||!validBody(d.body)||d.website)return json({error:'이름(40자 이내)과 내용(5,000자 이내)을 입력해주세요.'},400);
  const tokenHash=await hash(d.key);
  const existing=await env.DB.prepare('SELECT id,token_hash FROM messages WHERE id=?').bind(d.id).first();
  if(existing)return existing.token_hash===tokenHash?json({id:d.id},200):json({error:'다시 시도해주세요.'},409);
  const ipHash=await hash((r.headers.get('CF-Connecting-IP')||'unknown')+new Date().toISOString().slice(0,10));
  const rate=await env.DB.prepare('SELECT COUNT(*) AS n FROM messages WHERE ip_hash=? AND created_at>?').bind(ipHash,new Date(Date.now()-600000).toISOString()).first();
  if(rate.n>=5)return json({error:'잠시 후 다시 보내주세요. 10분에 5개까지 보낼 수 있습니다.'},429);
  await env.DB.prepare('INSERT INTO messages(id,token_hash,author,body,created_at,ip_hash) VALUES(?,?,?,?,?,?)').bind(d.id,tokenHash,d.author.trim(),d.body.trim(),new Date().toISOString(),ipHash).run();
  return json({id:d.id},201);
 }
 if(path==='/api/admin/messages'){
  if(!admin(r,env))return json({error:'운영자 계정으로 로그인해주세요.'},403);
  if(r.method!=='GET')return json({error:'지원하지 않는 요청입니다.'},405);
  const cursor=u.searchParams.get('before')||'9999';
  const {results}=await env.DB.prepare('SELECT id,author,body,created_at,read_at,(SELECT COUNT(*) FROM replies WHERE message_id=messages.id) AS reply_count FROM messages WHERE created_at<? ORDER BY created_at DESC LIMIT 31').bind(cursor).all();
  return json({messages:results.slice(0,30),next:results.length>30?results[29].created_at:null});
 }
 const match=path.match(/^\/api\/messages\/([a-f0-9-]{36})(\/replies)?$/);
 if(match){
  const id=match[1], isAdmin=admin(r,env);
  const key=(r.headers.get('Authorization')||'').replace(/^Bearer /,'');
  const message=await env.DB.prepare('SELECT id,author,body,created_at,read_at,token_hash FROM messages WHERE id=?').bind(id).first();
  if(!message||(!isAdmin&&(!keyOK(key)||await hash(key)!==message.token_hash)))return json({error:'메시지를 찾을 수 없거나 접근 권한이 없습니다.'},404);
  if(r.method==='GET'&&!match[2]){
   if(isAdmin&&!message.read_at)await env.DB.prepare('UPDATE messages SET read_at=? WHERE id=?').bind(new Date().toISOString(),id).run();
   const {results}=await env.DB.prepare('SELECT id,body,created_at FROM replies WHERE message_id=? ORDER BY created_at').bind(id).all();
   delete message.token_hash;return json({message,replies:results});
  }
  if(r.method==='POST'&&match[2]){
   if(!isAdmin)return json({error:'운영자만 답변할 수 있습니다.'},403);
   let d;try{d=await input(r);}catch{return json({error:'답변 내용을 확인해주세요.'},400);}
   if(!validBody(d.body))return json({error:'답변은 1~5,000자로 입력해주세요.'},400);
   await env.DB.prepare('INSERT INTO replies(id,message_id,body,created_at) VALUES(?,?,?,?)').bind(crypto.randomUUID(),id,d.body.trim(),new Date().toISOString()).run();return json({ok:true},201);
  }
  if(r.method==='DELETE'&&!match[2]){
   await env.DB.batch([env.DB.prepare('DELETE FROM replies WHERE message_id=?').bind(id),env.DB.prepare('DELETE FROM messages WHERE id=?').bind(id)]);return json({ok:true});
  }
 }
 return json({error:'요청한 기능을 찾을 수 없습니다.'},404);
}
const css=`:root{font-family:system-ui,sans-serif;color:#101629;background:#fff8eb;line-height:1.6}*{box-sizing:border-box}body{margin:0}header,main,footer{width:min(850px,calc(100% - 32px));margin:auto}header{padding:24px 0;display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;border-bottom:1px solid #ded5c6}a{color:inherit;text-underline-offset:4px}header strong{font-size:1.5rem}main{padding:32px 0 60px}h1{font-size:clamp(1.8rem,5vw,2.5rem);letter-spacing:-.04em;margin:0 0 12px}h2{font-size:1.25rem}p{overflow-wrap:anywhere}.muted{color:#5d606a;font-size:.9rem}form,article,.panel{border:1px solid #ded5c6;border-radius:12px;padding:22px;margin:20px 0;background:#fffdf7}label{display:block;font-weight:650;margin-bottom:16px}input,textarea{display:block;width:100%;font:inherit;padding:12px;border:1px solid #bcb6a9;border-radius:7px;margin-top:6px;color:inherit;background:#fff}textarea{resize:vertical;min-height:160px}button,.button{font:inherit;cursor:pointer;border:0;background:#101629;color:#fff8eb;padding:11px 18px;border-radius:7px;display:inline-block;text-decoration:none}button:disabled{opacity:.55;cursor:wait}button.secondary{background:#eae1d2;color:#101629}.actions{display:flex;flex-wrap:wrap;gap:12px;align-items:center}.message-body{white-space:pre-wrap;overflow-wrap:anywhere}article h2{margin:0}.meta{font-size:.8rem;color:#666}.reply{border-left:3px solid #101629;padding-left:16px;margin:18px 0}.notice{padding:14px;background:#f0e6d4;border-radius:8px}.hidden,[hidden]{display:none!important}:focus-visible{outline:3px solid #326b88;outline-offset:3px}footer{padding:20px 0;border-top:1px solid #ded5c6}.trap{position:absolute;left:-9999px}#status{white-space:pre-line}#receipt-url{word-break:break-all}`;
const formHTML=`<h1>운영자에게 글 남기기</h1><p>작품에 대한 감상, 질문, 제안을 보내주세요.<br>보낸 글은 운영자만 확인하며, 다른 방문자에게 공개되지 않습니다.</p><form id="send-form"><label>이름 또는 닉네임<input name="author" maxlength="40" required autocomplete="nickname" placeholder="어떤 이름으로 불러드릴까요?"></label><label>내용<textarea name="body" maxlength="5000" required placeholder="운영자에게 전할 이야기를 적어주세요."></textarea></label><label class="trap" aria-hidden="true">웹사이트<input name="website" tabindex="-1" autocomplete="off"></label><p class="muted">입력한 이름은 본인 인증된 이름이 아닙니다. 비밀번호 등 민감한 정보는 적지 마세요.</p><button type="submit">보내기</button><p id="status" role="status" aria-live="polite"></p></form><section id="receipt" class="panel" hidden><h2>메시지를 보냈습니다.</h2><p>아래 링크에서 보낸 글과 운영자의 답변을 확인할 수 있습니다. 링크를 저장해주세요.</p><p class="notice">이 링크를 가진 사람은 메시지를 볼 수 있습니다. 다른 사람에게 공유하지 마세요.</p><a id="receipt-url"></a><p><button id="copy" type="button">확인 링크 복사</button></p></section>`;
const visitorJS=`
const form=document.querySelector('#send-form'),status=document.querySelector('#status');let pending=null;
form.addEventListener('submit',async e=>{e.preventDefault();const data=new FormData(form);const author=data.get('author').trim(),body=data.get('body').trim();if(!author||!body){status.textContent='이름과 내용을 입력해주세요.';return;}if(!pending||pending.author!==author||pending.body!==body)pending={id:crypto.randomUUID(),key:Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join(''),author,body};const button=form.querySelector('button');button.disabled=true;status.textContent='보내는 중입니다…';try{const response=await fetch(API+'/api/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...pending,website:data.get('website')})});const result=await response.json();if(!response.ok)throw Error(result.error||'전송하지 못했습니다.');const url=API+'/message/'+result.id+'#'+pending.key;const a=document.querySelector('#receipt-url');a.href=url;a.textContent=url;document.querySelector('#receipt').hidden=false;status.textContent='운영자에게 전달했습니다.';form.reset();pending=null;document.querySelector('#receipt').scrollIntoView({behavior:'smooth',block:'nearest'});}catch(err){status.textContent=err.message==='Failed to fetch'?'연결하지 못했습니다. 입력 내용은 유지됩니다. 다시 보내주세요.':err.message;}finally{button.disabled=false;}});
document.querySelector('#copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(document.querySelector('#receipt-url').href);document.querySelector('#copy').textContent='복사했습니다';}catch{document.querySelector('#copy').textContent='위 링크를 길게 눌러 복사해주세요';}});
`;
const utilsJS=`const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};const fmt=s=>new Date(s).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'});async function request(path,opts={}){const r=await fetch(path,opts);const d=await r.json();if(!r.ok)throw Error(d.error||'처리하지 못했습니다.');return d;}function messageCard(m){const a=el('article');a.append(el('h2',m.author),el('p',fmt(m.created_at),'meta'),el('p',m.body,'message-body'));return a;}`;
function page(body,script='',title='ZERO° 메시지'){const nonce=crypto.randomUUID();return new Response(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title}</title><style nonce="${nonce}">${css}</style></head><body><header><a href="${HOME}/"><strong>ZERO°</strong></a><a href="/admin">운영자 로그인</a></header><main>${body}</main><footer><a href="${HOME}/">작품 모음으로 돌아가기 ↗</a></footer><script nonce="${nonce}">${script}</script></body></html>`,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':`default-src 'self'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors ${HOME}`}});}
export default {async fetch(r,env){
 const url=new URL(r.url),origin=r.headers.get('Origin');
 let res;
 try{
  if(url.pathname.startsWith('/api/')){
   if(['POST','DELETE'].includes(r.method)&&origin&&origin!==url.origin&&origin!==HOME)return json({error:'허용되지 않은 요청입니다.'},403);
   res=await api(r,env);
  }else if(url.pathname==='/admin'){
   if(!r.headers.get('oai-authenticated-user-id'))return Response.redirect(url.origin+'/signin-with-chatgpt?return_to=%2Fadmin',302);
   if(!admin(r,env))return page('<h1>운영자 전용 화면입니다.</h1><p>허용된 운영자 계정으로 로그인해주세요.</p><a href="/signout-with-chatgpt?return_to=%2Fadmin">다른 계정으로 로그인</a>');
   res=page(`<h1>받은 메시지</h1><p>방문자가 보낸 비공개 메시지를 확인하고 답변하세요.</p><div class="actions"><button id="refresh">새로고침</button><a href="/signout-with-chatgpt?return_to=%2F">로그아웃</a></div><p id="status" role="status"></p><div id="messages"></div><button id="more" hidden>이전 메시지 더 보기</button>`,utilsJS+`
let cursor=null;const box=document.querySelector('#messages'),status=document.querySelector('#status');
async function detail(id,target){try{const d=await request('/api/messages/'+id);target.replaceChildren();for(const reply of d.replies){const div=el('div',undefined,'reply');div.append(el('strong','운영자 답변 · '+fmt(reply.created_at)),el('p',reply.body,'message-body'));target.append(div);}const form=el('form'),label=el('label','답변'),text=el('textarea');text.required=true;text.maxLength=5000;label.append(text);const send=el('button','답변 보내기');send.type='submit';const state=el('p');state.setAttribute('role','status');form.append(label,send,state);form.addEventListener('submit',async e=>{e.preventDefault();if(!text.value.trim())return;send.disabled=true;state.textContent='답변을 저장하는 중입니다…';try{await request('/api/messages/'+id+'/replies',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({body:text.value})});await detail(id,target);}catch(err){state.textContent=err.message;send.disabled=false;}});target.append(form);}catch(err){target.textContent=err.message;}}
async function load(reset=false){const more=document.querySelector('#more');more.disabled=true;status.textContent='불러오는 중입니다…';try{const d=await request('/api/admin/messages'+(!reset&&cursor?'?before='+encodeURIComponent(cursor):''));if(reset)box.replaceChildren();for(const m of d.messages){const card=messageCard(m),open=el('button',(m.read_at?'읽음':'새 글')+' · 답변 '+m.reply_count+'개 · 열기'),target=el('div');open.addEventListener('click',()=>{open.textContent='읽음 · 답변 보기';detail(m.id,target);});const del=el('button','메시지 삭제','secondary');del.addEventListener('click',async()=>{if(!confirm('메시지와 답변을 모두 삭제할까요?'))return;try{await request('/api/messages/'+m.id,{method:'DELETE'});card.remove();status.textContent='삭제했습니다.';}catch(err){status.textContent=err.message;}});const actions=el('div',undefined,'actions');actions.append(open,del);card.append(actions,target);box.append(card);}cursor=d.next;more.hidden=!cursor;status.textContent=box.children.length?box.children.length+'개 메시지':'아직 받은 메시지가 없습니다.';}catch(err){status.textContent=err.message;}finally{more.disabled=false;}}
document.querySelector('#refresh').onclick=()=>load(true);document.querySelector('#more').onclick=()=>load();load(true);
`,'ZERO° 운영자 메시지함');
  }else if(/^\/message\/[a-f0-9-]{36}$/.test(url.pathname)){
   res=page('<h1>보낸 글과 답변 확인</h1><p class="muted">이 페이지의 링크는 본인만 보관해주세요. 답변은 이곳에서 확인할 수 있습니다.</p><button id="refresh">답변 새로고침</button><p id="status" role="status"></p><div id="message"></div>',utilsJS+`
const key=location.hash.slice(1),id=location.pathname.split('/').pop(),status=document.querySelector('#status'),box=document.querySelector('#message');async function load(){status.textContent='확인 중입니다…';try{const d=await request('/api/messages/'+id,{headers:{Authorization:'Bearer '+key}});box.replaceChildren(messageCard(d.message));if(!d.replies.length)box.append(el('p','아직 운영자 답변이 없습니다. 나중에 이 링크로 다시 확인해주세요.'));for(const reply of d.replies){const a=el('article');a.append(el('h2','운영자 답변'),el('p',fmt(reply.created_at),'meta'),el('p',reply.body,'message-body'));box.append(a);}const del=el('button','내 메시지 삭제','secondary');del.onclick=async()=>{if(!confirm('보낸 글과 답변을 영구 삭제할까요?'))return;try{await request('/api/messages/'+id,{method:'DELETE',headers:{Authorization:'Bearer '+key}});box.replaceChildren();status.textContent='삭제했습니다.';}catch(err){status.textContent=err.message;}};box.append(del);status.textContent='';}catch(err){status.textContent=err.message;}}document.querySelector('#refresh').onclick=load;load();`);
  }else if(url.pathname==='/')res=page(formHTML,`const API=location.origin;`+visitorJS);
  else if(url.pathname==='/robots.txt')res=new Response('User-agent: *\nDisallow: /\n');
  else res=new Response('Not found',{status:404});
 }catch(err){console.error('Request failed',err?.message);res=json({error:'일시적으로 처리하지 못했습니다. 잠시 후 다시 시도해주세요.'},500);}
 const headers=new Headers(res.headers);headers.set('Cache-Control','no-store');headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','no-referrer');if(origin===HOME||origin===url.origin){headers.set('Access-Control-Allow-Origin',origin);headers.set('Vary','Origin');headers.set('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS');headers.set('Access-Control-Allow-Headers','Content-Type,Authorization');}return new Response(res.body,{status:res.status,headers});
}};
export {formHTML,visitorJS};
