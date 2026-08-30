const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let mode="qr", zoom=1, logoData=null, processedLogoData=null;

const qr = new QRCodeStyling({
  width:512,height:512,type:"canvas",data:"https://example.com",margin:24,
  qrOptions:{errorCorrectionLevel:"M"},
  dotsOptions:{type:"square",color:"#111827"},
  backgroundOptions:{color:"#ffffff"},
  cornersSquareOptions:{type:"square",color:"#111827"},
  cornersDotOptions:{type:"square",color:"#111827"}
});
qr.append($("#qrPreview"));

const tileValue = selector => {
  const a=$(selector+" .tile.active");
  return a ? a.dataset.value : "";
};
const setTile = (selector,value) => {
  $$(selector+" .tile").forEach(b=>b.classList.toggle("active",b.dataset.value===String(value)));
};
const setInput=(s,v)=>{if($(s))$(s).value=v};
const setCheck=(s,v)=>{if($(s))$(s).checked=!!v};

function toast(msg){
  let t=$(".toast");
  if(!t){t=document.createElement("div");t.className="toast";document.body.appendChild(t)}
  t.textContent=msg;t.classList.add("show");clearTimeout(toast._t);
  toast._t=setTimeout(()=>t.classList.remove("show"),1700);
}
function syncColor(color,text){
  $(color)?.addEventListener("input",()=>$(text).value=$(color).value);
  $(text)?.addEventListener("input",()=>{if(/^#[0-9a-fA-F]{6}$/.test($(text).value))$(color).value=$(text).value});
}
["dotColor","bgColor","barColor","barBg","cornerSquareColor","cornerDotColor","captionColor","frameColor"].forEach(id=>syncColor("#"+id,"#"+id+"Text"));

function fields(type){
  const map={
    wifi:[["ssid","Имя сети"],["password","Пароль"],["security","Защита (WPA/WEP/nopass)"]],
    email:[["email","Email"],["subject","Тема"],["body","Сообщение"]],
    phone:[["phone","Номер телефона"]],
    sms:[["phone","Номер телефона"],["message","Сообщение"]],
    geo:[["lat","Широта"],["lng","Долгота"]],
    vcard:[["name","Имя"],["phone","Телефон"],["email","Email"],["org","Организация"],["url","Сайт"]],
    whatsapp:[["phone","Номер с кодом страны"],["message","Сообщение"]],
    telegram:[["username","Username без @"]],
    event:[["title","Название"],["start","Начало YYYYMMDDTHHMMSS"],["end","Конец YYYYMMDDTHHMMSS"],["location","Место"]],
    crypto:[["scheme","Схема (bitcoin/ethereum)"],["address","Адрес"],["amount","Сумма"]]
  };
  $("#structuredFields").innerHTML=(map[type]||[]).map(x=>`<label>${x[1]}</label><input type="text" data-key="${x[0]}" placeholder="${x[1]}">`).join("");
  $$("#structuredFields input").forEach(i=>i.addEventListener("input",render));
}
function payload(){
  const type=tileValue("#qrType");
  if(type==="text"||type==="url") return $("#qrText").value;
  const vals={}; $$("#structuredFields input").forEach(i=>vals[i.dataset.key]=i.value);
  if(type==="wifi") return `WIFI:T:${vals.security||"WPA"};S:${vals.ssid||""};P:${vals.password||""};;`;
  if(type==="email") return `mailto:${vals.email||""}?subject=${encodeURIComponent(vals.subject||"")}&body=${encodeURIComponent(vals.body||"")}`;
  if(type==="phone") return `tel:${vals.phone||""}`;
  if(type==="sms") return `SMSTO:${vals.phone||""}:${vals.message||""}`;
  if(type==="geo") return `geo:${vals.lat||"0"},${vals.lng||"0"}`;
  if(type==="vcard") return `BEGIN:VCARD\nVERSION:3.0\nFN:${vals.name||""}\nTEL:${vals.phone||""}\nEMAIL:${vals.email||""}\nORG:${vals.org||""}\nURL:${vals.url||""}\nEND:VCARD`;
  if(type==="whatsapp") return `https://wa.me/${(vals.phone||"").replace(/\D/g,"")}?text=${encodeURIComponent(vals.message||"")}`;
  if(type==="telegram") return `https://t.me/${(vals.username||"").replace(/^@/,"")}`;
  if(type==="event") return `BEGIN:VEVENT\nSUMMARY:${vals.title||""}\nDTSTART:${vals.start||""}\nDTEND:${vals.end||""}\nLOCATION:${vals.location||""}\nEND:VEVENT`;
  if(type==="crypto") return `${vals.scheme||"bitcoin"}:${vals.address||""}${vals.amount?`?amount=${vals.amount}`:""}`;
  return "";
}
function gradient(){
  if(!$("#gradientToggle").checked)return undefined;
  return {type:"linear",rotation:Number(tileValue("#gradRotation"))*Math.PI/180,colorStops:[{offset:0,color:$("#grad1").value},{offset:1,color:$("#grad2").value}]};
}
async function preprocessLogo(){
  if(!logoData){processedLogoData=null;return}
  const img=new Image();
  await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=logoData});
  const c=document.createElement("canvas"), size=600;c.width=c.height=size;
  const ctx=c.getContext("2d"), r=(+$("#logoRadius").value/100)*(size/2);
  ctx.clearRect(0,0,size,size);
  ctx.save();
  roundedRect(ctx,0,0,size,size,r);ctx.clip();
  if($("#logoBg").checked){ctx.fillStyle="#fff";ctx.fillRect(0,0,size,size)}
  const scale=Math.min(size/img.width,size/img.height), w=img.width*scale,h=img.height*scale;
  ctx.drawImage(img,(size-w)/2,(size-h)/2,w,h);ctx.restore();
  processedLogoData=c.toDataURL("image/png");
}
function roundedRect(ctx,x,y,w,h,r){
  r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}
async function updateQR(){
  const bg=$("#transparentBg").checked ? "transparent" : $("#bgColor").value;
  const eyeLinked=$("#linkEyeColors").checked;
  const dotColor=$("#dotColor").value;
  const opts={
    width:+$("#qrSize").value,height:+$("#qrSize").value,data:payload()||" ",margin:+$("#qrMargin").value,
    qrOptions:{errorCorrectionLevel:tileValue("#qrLevel")},
    dotsOptions:{type:tileValue("#dotType"),color:dotColor,gradient:gradient()},
    backgroundOptions:{color:bg},
    image:processedLogoData||undefined,
    imageOptions:{hideBackgroundDots:$("#hideDots").checked,imageSize:+$("#logoSize").value/100,margin:+$("#logoMargin").value,crossOrigin:"anonymous"},
    cornersSquareOptions:{type:tileValue("#cornerSquareType"),color:eyeLinked?dotColor:$("#cornerSquareColor").value},
    cornersDotOptions:{type:tileValue("#cornerDotType"),color:eyeLinked?dotColor:$("#cornerDotColor").value}
  };
  qr.update(opts);
  $("#counter").textContent=(payload()||"").length;

  const cap=$("#qrCaption").value.trim(), cp=$("#qrCaptionPreview");
  cp.textContent=cap; cp.classList.toggle("hidden",!cap);
  cp.style.fontSize=$("#captionSize").value+"px";
  cp.style.marginTop=$("#captionGap").value+"px";
  cp.style.color=$("#captionColor").value;

  const paper=$("#paper"), frame=$("#frameToggle").checked;
  paper.classList.toggle("frame-on",frame);
  paper.style.borderWidth=frame?$("#frameWidth").value+"px":"0";
  paper.style.borderColor=frame?$("#frameColor").value:"transparent";
  paper.style.borderRadius=frame?$("#frameRadius").value+"px":"5px";
}
function updateBarcode(){
  const svg=$("#barcodePreview");
  try{
    JsBarcode(svg,$("#barcodeText").value||"0",{
      format:tileValue("#barcodeFormat"),width:+$("#barWidth").value,height:+$("#barHeight").value,
      displayValue:$("#showText").checked,lineColor:$("#barColor").value,background:$("#barBg").value,
      font:tileValue("#barFont"),fontSize:+$("#barFontSize").value,textAlign:tileValue("#barTextAlign"),
      textPosition:tileValue("#barTextPosition"),textMargin:+$("#barTextMargin").value,
      fontOptions:$("#barBold").checked?"bold":"",margin:+$("#barMargin").value
    });
    $("#counter").textContent=$("#barcodeText").value.length;
  }catch(e){svg.innerHTML="";$("#counter").textContent="Ошибка"}
  $("#paper").classList.remove("frame-on");$("#paper").style.borderWidth="0";
  $("#qrCaptionPreview").classList.add("hidden");
}
function render(){mode==="qr"?updateQR():updateBarcode()}

function setupTiles(){
  $$(".tile-grid .tile").forEach(btn=>btn.addEventListener("click",()=>{
    const group=btn.parentElement;
    group.querySelectorAll(".tile").forEach(x=>x.classList.remove("active"));
    btn.classList.add("active");
    if(group.id==="sizePresets") setInput("#qrSize",btn.dataset.value);
    render();
  }));
}
setupTiles();
$$("input,textarea").forEach(el=>el.addEventListener("input",render));

$("#qrType .tile").forEach(btn=>btn.addEventListener("click",()=>{fields(btn.dataset.value);render()}));
$("#gradientToggle").addEventListener("change",()=>{$("#gradientFields").classList.toggle("hidden",!$("#gradientToggle").checked);render()});
$("#linkEyeColors").addEventListener("change",()=>{$("#eyeColorFields").classList.toggle("hidden",$("#linkEyeColors").checked);render()});
$("#frameToggle").addEventListener("change",()=>{$("#frameFields").classList.toggle("hidden",!$("#frameToggle").checked);render()});

$$(".mode").forEach(btn=>btn.addEventListener("click",()=>{
  mode=btn.dataset.mode; $$(".mode").forEach(x=>x.classList.toggle("active",x===btn));
  $("#qrControls").classList.toggle("hidden",mode!=="qr");$("#barcodeControls").classList.toggle("hidden",mode!=="barcode");
  $("#qrPreview").classList.toggle("hidden",mode!=="qr");$("#barcodePreview").classList.toggle("hidden",mode!=="barcode");
  $("#modeTitle").textContent=mode==="qr"?"QR-код":"Штрихкод";render();
}));

$("#logoFile").addEventListener("change",e=>{
  const file=e.target.files[0];if(!file)return;
  const r=new FileReader();r.onload=async()=>{logoData=r.result;$("#logoOptions").classList.remove("hidden");await preprocessLogo();render()};r.readAsDataURL(file);
});
["logoRadius","logoBg"].forEach(id=>$("#"+id)?.addEventListener("input",async()=>{await preprocessLogo();render()}));
$("#removeLogo").addEventListener("click",()=>{logoData=processedLogoData=null;$("#logoFile").value="";$("#logoOptions").classList.add("hidden");render()});

$("#copyPayload").addEventListener("click",async()=>{await navigator.clipboard.writeText(payload());toast("Данные скопированы")});
$("#clearPayload").addEventListener("click",()=>{$("#qrText").value="";$$("#structuredFields input").forEach(i=>i.value="");render()});

const rand=()=>"#"+Math.floor(Math.random()*0xffffff).toString(16).padStart(6,"0");
$("#randomColors").addEventListener("click",()=>{const a=rand(),b=rand();setInput("#dotColor",a);setInput("#dotColorText",a);setInput("#bgColor",b);setInput("#bgColorText",b);render()});
$("#invertColors").addEventListener("click",()=>{const a=$("#dotColor").value,b=$("#bgColor").value;setInput("#dotColor",b);setInput("#dotColorText",b);setInput("#bgColor",a);setInput("#bgColorText",a);render()});

const qrPresets={
 classic:{dot:"#111827",bg:"#ffffff",type:"square",grad:false,eye:"square"},
 neon:{dot:"#00f0ff",bg:"#090b14",type:"dots",grad:true,g1:"#00f0ff",g2:"#8b5cf6",eye:"extra-rounded"},
 berry:{dot:"#7c3aed",bg:"#fff7ff",type:"rounded",grad:true,g1:"#ec4899",g2:"#7c3aed",eye:"extra-rounded"},
 mint:{dot:"#0f766e",bg:"#ecfdf5",type:"extra-rounded",grad:true,g1:"#14b8a6",g2:"#22c55e",eye:"dot"},
 mono:{dot:"#000000",bg:"#ffffff",type:"classy",grad:false,eye:"square"},
 sunset:{dot:"#f97316",bg:"#fff7ed",type:"classy-rounded",grad:true,g1:"#f97316",g2:"#ec4899",eye:"extra-rounded"}
};
$$(".preset").forEach(b=>b.addEventListener("click",()=>{
 const p=qrPresets[b.dataset.preset];setInput("#dotColor",p.dot);setInput("#dotColorText",p.dot);setInput("#bgColor",p.bg);setInput("#bgColorText",p.bg);
 setTile("#dotType",p.type);setTile("#cornerSquareType",p.eye);setCheck("#gradientToggle",p.grad);$("#gradientFields").classList.toggle("hidden",!p.grad);
 if(p.g1){setInput("#grad1",p.g1);setInput("#grad2",p.g2)}render();
}));

const barPresets={
 retail:{w:2,h:130,fg:"#111827",bg:"#ffffff",font:18,margin:18},
 compact:{w:2,h:80,fg:"#111827",bg:"#ffffff",font:14,margin:8},
 wide:{w:4,h:180,fg:"#111827",bg:"#ffffff",font:20,margin:24},
 dark:{w:3,h:150,fg:"#f8fafc",bg:"#111827",font:18,margin:20}
};
$$(".bar-preset").forEach(b=>b.addEventListener("click",()=>{
 const p=barPresets[b.dataset.preset];setInput("#barWidth",p.w);setInput("#barHeight",p.h);setInput("#barColor",p.fg);setInput("#barColorText",p.fg);
 setInput("#barBg",p.bg);setInput("#barBgText",p.bg);setInput("#barFontSize",p.font);setInput("#barMargin",p.margin);render();
}));

async function download(format){
  const scale=+tileValue("#exportScale")||1;
  if(mode==="qr" && !$("#qrCaption").value.trim() && !$("#frameToggle").checked && scale===1){
    qr.download({name:"qr-code",extension:format==="jpeg"?"jpg":format});return;
  }
  if(mode==="qr"){
    // Composite export to include caption/frame/scale
    const base=document.querySelector("#qrPreview canvas");
    if(!base){toast("QR ещё не готов");return}
    const caption=$("#qrCaption").value.trim(), gap=caption?+$("#captionGap").value:0, fs=caption?+$("#captionSize").value:0;
    const frame=$("#frameToggle").checked, fw=frame?+$("#frameWidth").value:0, pad=24;
    const w=(base.width+pad*2+fw*2)*scale, h=(base.height+pad*2+gap+fs*1.5+fw*2)*scale;
    const c=document.createElement("canvas");c.width=w;c.height=h;const ctx=c.getContext("2d");ctx.scale(scale,scale);
    if(!$("#transparentBg").checked || format==="jpeg"){ctx.fillStyle=$("#bgColor").value;ctx.fillRect(0,0,w/scale,h/scale)}
    if(frame){ctx.strokeStyle=$("#frameColor").value;ctx.lineWidth=fw;roundedRect(ctx,fw/2,fw/2,w/scale-fw,h/scale-fw,+$("#frameRadius").value);ctx.stroke()}
    ctx.drawImage(base,pad+fw,pad+fw);
    if(caption){ctx.fillStyle=$("#captionColor").value;ctx.font=`700 ${fs}px Arial`;ctx.textAlign="center";ctx.textBaseline="top";ctx.fillText(caption,w/(2*scale),pad+fw+base.height+gap,w/scale-pad*2)}
    const a=document.createElement("a");a.download=`qr-code.${format==="jpeg"?"jpg":"png"}`;a.href=c.toDataURL(format==="jpeg"?"image/jpeg":"image/png",.95);a.click();return;
  }

  const svg=$("#barcodePreview"), data=new XMLSerializer().serializeToString(svg), blob=new Blob([data],{type:"image/svg+xml;charset=utf-8"}), url=URL.createObjectURL(blob);
  if(format==="svg"){const a=document.createElement("a");a.href=url;a.download="barcode.svg";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return}
  const img=new Image();img.onload=()=>{const c=document.createElement("canvas");c.width=img.width*scale;c.height=img.height*scale;const ctx=c.getContext("2d");
    ctx.fillStyle=$("#barBg").value;ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);
    const a=document.createElement("a");a.href=c.toDataURL(format==="jpeg"?"image/jpeg":"image/png",.95);a.download=`barcode.${format==="jpeg"?"jpg":"png"}`;a.click();URL.revokeObjectURL(url);
  };img.src=url;
}
$$(".export").forEach(b=>b.addEventListener("click",()=>download(b.dataset.format)));
$("#downloadTop").addEventListener("click",()=>download("png"));

function projectData(){
 const inputs={};$$("input[type=text],input[type=number],input[type=range],textarea").forEach(i=>{if(i.id)inputs[i.id]=i.value});
 const checks={};$$("input[type=checkbox]").forEach(i=>{if(i.id)checks[i.id]=i.checked});
 const tiles={};$$(".tile-grid[id]").forEach(g=>tiles[g.id]=tileValue("#"+g.id));
 const structured={};$$("#structuredFields input").forEach(i=>structured[i.dataset.key]=i.value);
 return {version:3,mode,inputs,checks,tiles,structured,logoData};
}
async function applyProject(p){
 if(!p)return;
 Object.entries(p.inputs||{}).forEach(([id,v])=>setInput("#"+id,v));
 Object.entries(p.checks||{}).forEach(([id,v])=>setCheck("#"+id,v));
 Object.entries(p.tiles||{}).forEach(([id,v])=>setTile("#"+id,v));
 mode=p.mode||"qr";logoData=p.logoData||null;if(logoData){await preprocessLogo();$("#logoOptions").classList.remove("hidden")}
 $$(".mode").forEach(x=>x.classList.toggle("active",x.dataset.mode===mode));
 $("#qrControls").classList.toggle("hidden",mode!=="qr");$("#barcodeControls").classList.toggle("hidden",mode!=="barcode");
 $("#qrPreview").classList.toggle("hidden",mode!=="qr");$("#barcodePreview").classList.toggle("hidden",mode!=="barcode");
 fields(tileValue("#qrType"));
 Object.entries(p.structured||{}).forEach(([k,v])=>{const el=$(`#structuredFields [data-key="${k}"]`);if(el)el.value=v});
 $("#gradientFields").classList.toggle("hidden",!$("#gradientToggle").checked);
 $("#eyeColorFields").classList.toggle("hidden",$("#linkEyeColors").checked);
 $("#frameFields").classList.toggle("hidden",!$("#frameToggle").checked);
 render();
}
$("#saveProject").addEventListener("click",()=>{localStorage.setItem("qr-barcode-studio-project",JSON.stringify(projectData()));toast("Проект сохранён в браузере")});
$("#loadProject").addEventListener("click",()=>{const s=localStorage.getItem("qr-barcode-studio-project");if(!s)return toast("Сохранённого проекта нет");applyProject(JSON.parse(s));toast("Проект загружен")});
$("#exportProject").addEventListener("click",()=>{const b=new Blob([JSON.stringify(projectData(),null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="qr-barcode-project.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)});
$("#importProjectFile").addEventListener("change",e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{applyProject(JSON.parse(r.result));toast("Проект импортирован")}catch{toast("Ошибка JSON")}};r.readAsText(f)});

$("#zoomIn").addEventListener("click",()=>{zoom=Math.min(1.5,zoom+.1);$("#paper").style.transform=`scale(${zoom})`;$("#zoomValue").textContent=Math.round(zoom*100)+"%"});
$("#zoomOut").addEventListener("click",()=>{zoom=Math.max(.5,zoom-.1);$("#paper").style.transform=`scale(${zoom})`;$("#zoomValue").textContent=Math.round(zoom*100)+"%"});
$("#resetBtn").addEventListener("click",()=>{if(confirm("Сбросить все настройки?"))location.reload()});

fields("text");render();
