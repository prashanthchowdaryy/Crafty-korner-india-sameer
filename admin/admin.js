const $=s=>document.querySelector(s), H=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let S={}, products=[], cur=null, photos=[];
async function api(url,opt={}){
  opt.headers={...(opt.headers||{}),"X-CSRF":S.csrf||""}; if(opt.json!==undefined){opt.body=JSON.stringify(opt.json);opt.headers["Content-Type"]="application/json";delete opt.json}
  const r=await fetch(url,opt); let d={}; try{d=await r.json()}catch{}
  if(r.status===401&&url!=="/api/login"){boot();throw new Error(d.error||"Please log in.")}
  if(!r.ok) throw new Error(d.error||"Something went wrong."); return d;
}
function toast(msg,bad,link){const t=document.createElement("div");t.className="toast"+(bad?" bad":"");t.setAttribute("role","status");t.innerHTML=H(msg)+(link?` <a href="${H(link)}" target="_blank" rel="noopener">View on website</a>`:"");document.body.append(t);setTimeout(()=>t.remove(),bad?6000:5000)}
async function boot(){
  S=await (await fetch("/api/session")).json();
  $("#login").hidden=S.authed; $("#app").hidden=!S.authed;
  if(!S.authed){ $("#lt").textContent=S.setup?"Welcome! Set your password":"Shop manager"; $("#ls").textContent=S.setup?"Choose a password (10+ characters) to protect this panel.":"Log in to manage your products."; $("#ll").textContent=S.setup?"New password":"Password"; $("#lb").textContent=S.setup?"Save password and continue":"Log in"; $("#pw").autocomplete=S.setup?"new-password":"current-password"; $("#pw").focus(); return }
  $("#cat").innerHTML=S.cats.map(c=>`<option>${H(c)}</option>`).join(""); $("#st").innerHTML=S.status.map(c=>`<option>${c}</option>`).join("");
  $("#fc").innerHTML='<option value="">All categories</option>'+S.cats.map(c=>`<option>${H(c)}</option>`).join(""); $("#fs").innerHTML='<option value="">All statuses</option>'+S.status.map(c=>`<option>${c}</option>`).join("");
  load();loadEnq();
}
let noPrice=false;
async function load(){
  try{const y=await api("/api/sync",{method:"POST"}); if(y.changed)toast("Excel changes found and published to the website."); if(y.error)toast("Excel not applied: "+y.error,true)}catch(e){}
  products=await api("/api/products");render()}
function render(){
  const q=$("#q").value.trim().toLowerCase(), c=$("#fc").value, s=$("#fs").value;
  const np=products.filter(p=>p.price==null&&p.status!=="Hidden").length; $("#np").hidden=!np&&!noPrice;
  $("#np").innerHTML=noPrice?`Showing products with no price. <button class="btn sm ghost" id="npx">Show all</button>`:`${np} product${np==1?" has":"s have"} no price yet. <button class="btn sm gold" id="npb">Add prices</button>`;
  const L=products.filter(p=>(!noPrice||p.price==null)&&(!c||p.category===c)&&(!s||p.status===s)&&(!q||(p.name+" "+p.material+" "+p.category).toLowerCase().includes(q)));
  $("#cnt").textContent=`${L.length} of ${products.length} products`;
  $("#list").innerHTML=L.length?L.map(p=>`<div class="row"><img src="/media/${H(p.photo)}" alt="" loading="lazy"><div><h3>${H(p.name)}<span class="pill ${p.status}">${p.status}</span></h3><div class="meta">${H(p.category)} · ${p.price!=null?"₹"+p.price.toLocaleString("en-IN")+(p.show_price?"":" (hidden from customers)"):"No price"}${p.material?" · "+H(p.material):""}</div>${p.price==null?`<form class="qp" data-q="${p.id}"><input type="number" min="0" step="1" inputmode="numeric" placeholder="Price ₹" aria-label="Price for ${H(p.name)}" required><button class="btn sm gold">Add price</button></form>`:""}</div>
  <div class="acts"><button class="btn sm" data-e="${p.id}">Edit</button>${p.url?`<a class="btn sm ghost" href="${p.url}" target="_blank" rel="noopener">View</a>`:""}<button class="btn sm ghost" data-d="${p.id}">Delete</button></div></div>`).join(""):`<div class="empty">${products.length?"No products match your search.":"No products yet. Add your first one."}</div>`;
}
const drawPhotos=()=>{$("#photos").innerHTML=photos.map((f,i)=>`<div class="ph"><img src="/media/${H(f)}" alt="Photo ${i+1}">${i?"":'<span class="main">Main photo</span>'}<button type="button" class="rm" data-r="${i}" aria-label="Remove photo ${i+1}">×</button>${i?`<button type="button" class="mk" data-m="${i}">Make main</button>`:""}</div>`).join("")+`<button type="button" class="add" id="addph">+ Add photos</button>`;}
function openEd(p){
  cur=p||null; photos=p?[p.photo,...p.more]:[]; $("#dt").textContent=p?"Edit product":"Add product"; $("#fe").textContent="";
  const v=(id,x)=>$(id).value=x??""; v("#name",p?.name); v("#cat",p?.category||S.cats[0]); v("#st",p?.status||"Available"); v("#price",p?.price); $("#sp").checked=p?!!p.show_price:false;
  v("#mat",p?.material); v("#era",p?.era); v("#size",p?.size); v("#desc",p?.description); drawPhotos(); $("#dr").hidden=false; document.body.style.overflow="hidden"; $("#name").focus();
}
const closeEd=()=>{$("#dr").hidden=true;document.body.style.overflow=""};
async function upload(files){
  if(!files.length)return; const fd=new FormData(); [...files].forEach(f=>fd.append("files",f)); $("#fe").textContent="Uploading…";
  try{const d=await api("/api/upload",{method:"POST",body:fd}); photos.push(...d.files); drawPhotos(); $("#fe").textContent=""}catch(e){$("#fe").textContent=e.message}
}
$("#photos").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
  if(b.id==="addph")return $("#file").click(); if(b.dataset.r!==undefined)photos.splice(+b.dataset.r,1); if(b.dataset.m!==undefined)photos.unshift(...photos.splice(+b.dataset.m,1)); drawPhotos()});
$("#photos").addEventListener("dragover",e=>{e.preventDefault()}); $("#photos").addEventListener("drop",e=>{e.preventDefault();upload(e.dataTransfer.files)});
$("#file").onchange=e=>{upload(e.target.files);e.target.value=""};
$("#f").onsubmit=async e=>{e.preventDefault(); const b=$("#save"); b.disabled=true; b.textContent="Publishing…"; $("#fe").textContent="";
  const body={name:$("#name").value,category:$("#cat").value,status:$("#st").value,price:$("#price").value,show_price:$("#sp").checked,material:$("#mat").value,era:$("#era").value,size:$("#size").value,description:$("#desc").value,photo:photos[0],more:photos.slice(1)};
  try{const p=await api(cur?"/api/products/"+cur.id:"/api/products",{method:cur?"PUT":"POST",json:body}); closeEd(); await load(); toast((p.status==="Hidden"?"Saved. This product is hidden from the website.":"Published. The change is live on the website.")+(p.excel_ok===false?" Excel file could not be updated (is it open?).":" Excel updated."),false,p.status==="Hidden"?null:p.url)}
  catch(err){$("#fe").textContent=err.message} b.disabled=false; b.textContent="Save and publish"};
$("#np").addEventListener("click",e=>{if(e.target.id==="npb"||e.target.id==="npx"){noPrice=e.target.id==="npb";render()}});
$("#list").addEventListener("submit",async e=>{e.preventDefault();const f=e.target,p=products.find(x=>x.id===f.dataset.q),b=f.querySelector("button");b.disabled=true;
  try{const r=await api("/api/products/"+p.id,{method:"PUT",json:{...p,price:f.querySelector("input").value,show_price:true,description:p.description}});await load();toast("Price added and published."+(r.excel_ok===false?" Excel file could not be updated (is it open?).":""),false,r.url)}catch(err){toast(err.message,true);b.disabled=false}});
$("#price").addEventListener("change",()=>{if($("#price").value&&!cur?.price)$("#sp").checked=true});
$("#xup").onclick=()=>$("#xfile").click();
$("#xfile").onchange=async e=>{const f=e.target.files[0];e.target.value="";if(!f)return;
  if(!confirm("The website and admin will be updated to match this Excel file. Products that are not in the file will be removed. Continue?"))return;
  const fd=new FormData();fd.append("file",f);try{const r=await api("/api/excel",{method:"POST",body:fd});await load();toast(`Excel applied. ${r.count} products are live on the website.`)}catch(err){toast(err.message,true)}};
$("#list").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return; const id=b.dataset.e||b.dataset.d,p=products.find(x=>x.id===id);
  if(b.dataset.e)openEd(p); if(b.dataset.d){cur=p;$("#ddp").textContent=`“${p.name}” will be removed from the website. This cannot be undone from here.`;$("#dd").showModal()}});
$("#ddy").onclick=async e=>{e.preventDefault(); const b=e.target; b.disabled=true; try{await api("/api/products/"+cur.id,{method:"DELETE"}); $("#dd").close(); await load(); toast("Deleted. It is no longer on the website.")}catch(err){$("#dd").close();toast(err.message,true)} b.disabled=false};
$("#new").onclick=()=>openEd(); $("#x").onclick=$("#cancel").onclick=$("#scrim").onclick=closeEd; document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#dr").hidden)closeEd()});
["#q","#fc","#fs"].forEach(s=>$(s).addEventListener("input",render));
$("#lf").onsubmit=async e=>{e.preventDefault();$("#le").textContent="";try{await api("/api/login",{method:"POST",json:{password:$("#pw").value}});$("#pw").value="";boot()}catch(err){$("#le").textContent=err.message}};
$("#out").onclick=async()=>{await api("/api/logout",{method:"POST"});boot()};
$("#chpw").onclick=()=>$("#pd").showModal(); $("#pc").onclick=()=>$("#pd").close();
$("#pf").onsubmit=async e=>{e.preventDefault();try{await api("/api/password",{method:"POST",json:{old:$("#po").value,new:$("#pn").value}});$("#pd").close();$("#pf").reset();toast("Password changed.")}catch(err){$("#pe").textContent=err.message}};
document.addEventListener("click",e=>{const m=$("#mn");if(m&&m.open&&(!m.contains(e.target)||e.target.closest(".mm>*")))m.open=false});

/* ---------- enquiries (messages from the website) ---------- */
let enqs=[];
function showTab(v){const e=v==="e";$("#pv").hidden=e;$("#ev").hidden=!e;$("#tp").classList.toggle("on",!e);$("#te").classList.toggle("on",e);if(e)loadEnq()}
async function loadEnq(){try{enqs=await api("/api/enquiries");renderEnq()}catch(e){}}
const BADD=v=>/^(failed|text sent|not set up)/.test(v||"");
const chip=(n,v)=>{v=v||"waiting";const cls=v==="sent"?"Available":BADD(v)?"Sold":"Hidden";const t=v==="sent"?"sent":/^failed/.test(v)?"failed":/^text sent/.test(v)?"photos not sent":v;return `<span class="pill ${cls}" title="${H(v)}">${n}: ${H(t)}</span>`};
function renderEnq(){
  $("#ec").textContent=enqs.length?`(${enqs.length})`:"";
  $("#ecnt").textContent=enqs.length?`${enqs.length} message${enqs.length>1?"s":""}, newest first`:"";
  $("#elist").innerHTML=enqs.length?enqs.map(e=>{const d=String(e.phone).replace(/\D/g,""),wa=d.length===10?"91"+d:d,d2=e.delivery||{};
  return `<div class="ecard"><h3>${H(e.name)} <span class="pill Hidden">${H(e.kind)}</span></h3>
  <div class="meta">${H(e.time)} · <a href="tel:+${wa}">${H(e.phone)}</a> · <a href="https://wa.me/${wa}" target="_blank" rel="noopener">Reply on WhatsApp</a>${e.email?` · <a href="mailto:${H(e.email)}">${H(e.email)}</a>`:""}${e.product?" · "+(e.product_url?`<a href="${H(e.product_url)}" target="_blank" rel="noopener">${H(e.product)}</a>`:H(e.product)):""}</div>
  <p class="msg">${H(e.message)}</p>
  ${(e.photos||[]).length?`<div class="photos">${e.photos.map(f=>`<a class="ph" href="/api/enquiry-photo/${H(f)}" target="_blank" rel="noopener"><img src="/api/enquiry-photo/${H(f)}" alt="Photo from customer" loading="lazy"></a>`).join("")}</div>`:""}
  <div class="acts" style="justify-content:space-between;align-items:center"><span>${chip("WhatsApp",d2.whatsapp)} ${chip("Email",d2.email)}</span><span class="acts">${BADD(d2.whatsapp)||BADD(d2.email)?`<button class="btn sm" data-rs="${H(e.id)}">Send again</button>`:""}<button class="btn sm ghost" data-ed="${H(e.id)}">Delete</button></span></div></div>`}).join(""):`<div class="empty">No messages yet. Enquiries and custom orders from the website will show here, and arrive on your WhatsApp and Gmail.</div>`}
$("#tp").onclick=()=>showTab("p");$("#te").onclick=()=>showTab("e");
$("#elist").addEventListener("click",async e=>{const b=e.target.closest("button");if(!b)return;
  if(b.dataset.rs){b.disabled=true;b.textContent="Sending…";try{const r=await api("/api/enquiries/"+b.dataset.rs+"/resend",{method:"POST"});enqs=r.enquiries;renderEnq();toast("Tried again. Check the status next to the message.")}catch(err){toast(err.message,true)}}
  if(b.dataset.ed&&confirm("Delete this message and its photos?")){try{await api("/api/enquiries/"+b.dataset.ed,{method:"DELETE"});enqs=enqs.filter(x=>x.id!==b.dataset.ed);renderEnq()}catch(err){toast(err.message,true)}}});
setInterval(()=>{if(S.authed&&!$("#ev").hidden&&!document.hidden)loadEnq()},20000);
boot();
