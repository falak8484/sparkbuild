export const qs = (s, scope=document) => scope.querySelector(s);
export const qsa = (s, scope=document) => Array.from(scope.querySelectorAll(s));
export function showStatus(el,type,message){if(!el)return;el.className=`status show ${type}`;el.textContent=message;}
export function clearStatus(el){if(!el)return;el.className='status';el.textContent='';}
export function formatDate(ts){try{const d=ts?.toDate?ts.toDate():new Date(ts);return new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short'}).format(d)}catch{return 'Just now'}}
export const uid=()=>crypto.randomUUID?crypto.randomUUID():`id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
export const getQueryParam=(n)=>new URLSearchParams(location.search).get(n);
export async function readFileAsDataURL(file){return await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});}
export function downloadBlob(blob,filename){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function copyText(text){return navigator.clipboard.writeText(text);}
