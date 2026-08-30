const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let mode="qr", zoom=1, logoData=null, bgImageData=null;

const qr = new QRCodeStyling({
  width:512,height:512,type:"canvas",data:"https://example.com",
  margin:24,qrOptions:{errorCorrectionLevel:"M"},
  dotsOptions:{type:"square",color:"#111827"},
  backgroundOptions:{color:"#ffffff"},
  cornersSquareOptions:{type:"square",color:"#111827"},
  cornersDotOptions:{type:"square",color:"#111827"}
});

qr.append($("#qrPreview"));

function syncColor(color,text){
  $(color).addEventListener("input",()=>$(text).value=$(color).value);
  $(text).addEventListener("input",()=>{if(/^#[0-9a-fA-F]{6}$/.test($(text).value))$(color).value=$(text).value});
}
syncColor("#dotColor","#dotColorText"); syncColor("#bgColor","#bgColorText");
syncColor("#barColor","#barColorText"); syncColor("#barBg","#barBgText");

function payload(){
  const type=$("#qrType").value;
  if(type==="text"||type==="url") return $("#qrText").value;
  const vals={}; $$("#structuredFields input").forEach(i=>vals[i.dataset.key]=i.value);
  if(type==="wifi") return `WIFI:T:${vals.security||"WPA"};S:${vals.ssid||""};P:${vals.password||""};H:${vals.hidden==="on"?"true":"false"};;`;
  if(type==="email") return `mailto:${vals.email||""}?subject=${encodeURIComponent(vals.subject||"")}&body=${encodeURIComponent(vals.body||"")}`;
  if(type==="phone") return `tel:${vals.phone||""}`;
  if(type==="sms") return `SMSTO:${vals.phone||""}:${vals.message||""}`;
  if(type==="geo") return `geo:${vals.lat||"0"},${vals.lng||"0"}`;
  if(type==="vcard") return `BEGIN:VCARD\nVERSION:3.0\nFN:${vals.name||""}\nTEL:${vals.phone||""}\nEMAIL:${vals.email||""}\nORG:${vals.org||""}\nURL:${vals.url||""}\nEND:VCARD`;
  return "";
}
function fields(type){
  const map={
    wifi:[["ssid","Имя сети"],["password","Пароль"],["security","Защита (WPA/WEP/nopass)"]],
    email:[["email","Email"],["subject","Тема"],["body","Сообщение"]],
    phone:[["phone","Номер телефона"]],
    sms:[["phone","Номер телефона"],["message","Сообщение"]],
    geo:[["lat","Широта"],["lng","Долгота"]],
    vcard:[["name","Имя"],["phone","Телефон"],["email","Email"],["org","Организация"],["url","Сайт"]]
  };
  $("#structuredFields").innerHTML=(map[type]||[]).map((x,i)=>`<label>${x[1]}</label><input type="text" data-key="${x[0]}" placeholder="${x[1]}">`).join("");
}
function gradient(){
  if(!$("#gradientToggle").checked)return undefined;
  return {type:"linear",rotation:Number($("#gradRotation").value),colorStops:[{offset:0,color:$("#grad1").value},{offset:1,color:$("#grad2").value}]};
}
function updateQR(){
  const bg=$("#transparentBg").checked ? "transparent" : $("#bgColor").value;
  const hasLogo=!!logoData;
  const opts={
    width:+$("#qrSize").value,height:+$("#qrSize").value,data:payload()||" ",
    margin:+$("#qrMargin").value,
    qrOptions:{errorCorrectionLevel:$("#qrLevel").value},
    dotsOptions:{type:$("#dotType").value,color:$("#dotColor").value,gradient:gradient()},
    backgroundOptions:{color:bg},
    image:logoData||undefined,
    imageOptions:{hideBackgroundDots:$("#hideDots").checked, imageSize:+$("#logoSize").value/100, margin:+$("#logoMargin").value, crossOrigin:"anonymous"},
    cornersSquareOptions:{type:$("#dotType").value==="dots"?"dot":$("#dotType").value,color:$("#dotColor").value},
    cornersDotOptions:{type:"dot",color:$("#dotColor").value}
  };
  qr.update(opts);
  $("#counter").textContent=(payload()||"").length;
}
function updateBarcode(){
  const svg=$("#barcodePreview");
  try{
    JsBarcode(svg,$("#barcodeText").value||"0",{
      format:$("#barcodeFormat").value,
      width:+$("#barWidth").value,height:+$("#barHeight").value,
      displayValue:$("#showText").checked,
      lineColor:$("#barColor").value,background:$("#barBg").value,
      font:$("#barFont").value,fontSize:+$("#barFontSize").value,
      textAlign:$("#barTextAlign").value,margin:20
    });
    $("#counter").textContent=$("#barcodeText").value.length;
  }catch(e){
    svg.innerHTML="";
    $("#counter").textContent="Ошибка";
  }
}
function render(){mode==="qr"?updateQR():updateBarcode()}
$$("input,select,textarea").forEach(el=>el.addEventListener("input",render));
$("#qrType").addEventListener("change",()=>{fields($("#qrType").value);render()});
$("#gradientToggle").addEventListener("change",()=>$("#gradientFields").classList.toggle("hidden",!$("#gradientToggle").checked));
$("#transparentBg").addEventListener("change",render);

$$(".mode").forEach(btn=>btn.addEventListener("click",()=>{
  mode=btn.dataset.mode; $$(".mode").forEach(x=>x.classList.toggle("active",x===btn));
  $("#qrControls").classList.toggle("hidden",mode!=="qr");
  $("#barcodeControls").classList.toggle("hidden",mode!=="barcode");
  $("#qrPreview").classList.toggle("hidden",mode!=="qr");
  $("#barcodePreview").classList.toggle("hidden",mode!=="barcode");
  $("#modeTitle").textContent=mode==="qr"?"QR-код":"Штрихкод";
  render();
}));

$("#logoFile").addEventListener("change",e=>{
  const file=e.target.files[0]; if(!file)return;
  const r=new FileReader(); r.onload=()=>{logoData=r.result;$("#logoOptions").classList.remove("hidden");render()}; r.readAsDataURL(file);
});
$("#removeLogo").addEventListener("click",()=>{logoData=null;$("#logoFile").value="";$("#logoOptions").classList.add("hidden");render()});

function download(format){
  if(mode==="qr"){ qr.download({name:"qr-code",extension:format==="jpeg"?"jpg":format}); return; }
  const svg=$("#barcodePreview"), data=new XMLSerializer().serializeToString(svg);
  const blob=new Blob([data],{type:"image/svg+xml;charset=utf-8"}), url=URL.createObjectURL(blob);
  const img=new Image(); img.onload=()=>{
    if(format==="svg"){const a=document.createElement("a");a.href=url;a.download="barcode.svg";a.click();URL.revokeObjectURL(url);return}
    const c=document.createElement("canvas"); c.width=img.width*2;c.height=img.height*2; const ctx=c.getContext("2d");
    ctx.fillStyle=$("#barBg").value;ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);
    const a=document.createElement("a");a.href=c.toDataURL(format==="jpeg"?"image/jpeg":"image/png",.95);a.download=`barcode.${format==="jpeg"?"jpg":"png"}`;a.click();URL.revokeObjectURL(url);
  }; img.src=url;
}
$$(".export").forEach(b=>b.addEventListener("click",()=>download(b.dataset.format)));
$("#downloadTop").addEventListener("click",()=>download("png"));
$("#zoomIn").addEventListener("click",()=>{zoom=Math.min(1.5,zoom+.1);$("#paper").style.transform=`scale(${zoom})`;$("#zoomValue").textContent=Math.round(zoom*100)+"%"});
$("#zoomOut").addEventListener("click",()=>{zoom=Math.max(.5,zoom-.1);$("#paper").style.transform=`scale(${zoom})`;$("#zoomValue").textContent=Math.round(zoom*100)+"%"});
$("#resetBtn").addEventListener("click",()=>location.reload());

fields("text"); render();