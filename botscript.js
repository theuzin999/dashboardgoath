// ===================== FIREBASE (history/) =====================
const firebaseConfig = {
  apiKey: "AIzaSyB-35zQDrQbz8ohZUdqpFkayYdAUDrLw6g",
  authDomain: "history-dashboard-a70ee.firebaseapp.com",
  databaseURL: "https://history-dashboard-a70ee-default-rtdb.firebaseio.com",
  projectId: "history-dashboard-a70ee",
  storageBucket: "history-dashboard-a70ee.firebasestorage.app",
  messagingSenderId: "969153856969",
  appId: "1:969153856969:web:6b50fae1db463b8352d418",
  measurementId: "G-9MVGBX2KLX"
};

// ===================== UI HOOKS =====================
const $ = s=>document.querySelector(s);
const liveStatus=$("#liveStatus"), engineStatus=$("#engineStatus");
const predStatus=$("#predStatus"), blueRunPill=$("#blueRun");
const chanceCard=$("#chanceCard"), chanceTitle=$("#chanceTitle"), chanceSub=$("#chanceSub");
const strategyTag=$("#strategyTag"), gateTag=$("#gateTag"), martingaleTag=$("#martingaleTag");
const winsEl=$("#wins"), lossesEl=$("#losses"), streakEl=$("#streak");
const normalWinsEl=$("#normalWins"), g1WinsEl=$("#g1Wins"), g2WinsEl=$("#g2Wins"), maxStreakEl=$("#maxStreak");
const feed=$("#feed"), historyGrid=$("#history");
const clearStatsBtn=$("#clearStatsBtn");

function addFeed(type,text){
  const div=document.createElement("div"); div.className="item";
  const left=document.createElement("div"); left.textContent=text;
  const right=document.createElement("div"); right.className="chip "+(type==="ok"?"ok":type==="err"?"err":"warn");
  right.textContent= type==="ok"?"WIN": type==="err"?"LOSS":"INFO";
  div.appendChild(left); div.appendChild(right); feed.prepend(div);
}
function setCardState({active=false, awaiting=false, title="Chance de 2x", sub="identificando padrão"}){
  chanceTitle.textContent=title; chanceSub.textContent=sub;
  chanceCard.classList.remove("chance-active","chance-awaiting","chance-blocked");
  if(active) chanceCard.classList.add("chance-active");
  else if(awaiting) chanceCard.classList.add("chance-awaiting");
}
function renderHistory(list){
  historyGrid.innerHTML="";
  list.slice(-15).reverse().forEach(r=>{
    const b=document.createElement("div"); b.className="hbox "+r.color;
    const top=document.createElement("div"); top.className="row"; top.style.justifyContent="space-between";
    const val=document.createElement("div"); val.className="val"; val.textContent=r.mult.toFixed(2)+"x";
    const dot=document.createElement("div"); dot.className= r.color==="blue"?"dot-blue":(r.color==="purple"?"dot-purple":"dot-pink");
    const c=document.createElement("div"); c.className="c"; c.textContent=r.color;
    top.appendChild(val); top.appendChild(dot); b.appendChild(top); b.appendChild(c); historyGrid.appendChild(b);
  });
}

// ===================== PERSISTÊNCIA =====================
const store={ get(){try{return JSON.parse(localStorage.getItem("stats2x")||"{}")}catch{return{}}}, set(d){localStorage.setItem("stats2x",JSON.stringify(d))} };
let stats=Object.assign({wins:0,losses:0,streak:0,maxStreak:0,normalWins:0,g1Wins:0,g2Wins:0}, store.get());
function syncStats(){ winsEl.textContent=stats.wins; lossesEl.textContent=stats.losses; streakEl.textContent=stats.streak;
  maxStreakEl.textContent=stats.maxStreak; normalWinsEl.textContent=stats.normalWins; g1WinsEl.textContent=stats.g1Wins; g2WinsEl.textContent=stats.g2Wins; }
syncStats();
clearStatsBtn?.addEventListener("click",()=>{ if(confirm("Limpar estatísticas?")){ stats={wins:0,losses:0,streak:0,maxStreak:0,normalWins:0,g1Wins:0,g2Wins:0}; store.set(stats); syncStats(); }});

// ===================== UTILS =====================
const colorFrom = m => m<2 ? "blue" : (m<10 ? "purple" : "pink");
const positivesRatio = list => list.filter(c=>c.color!=="blue").length/(list.length||1);
function predominancePositive(arr,N=8){ const last=arr.slice(-N); const pct=positivesRatio(last); return {pct, ok:pct>=0.50, strong:pct>=0.60}; }
function consecutiveBlueCount(arr){ let c=0; for(let i=arr.length-1;i>=0;i--){ if(arr[i].color==="blue") c++; else break; } return c; }
function lastPink(arr){ for(let i=arr.length-1;i>=0;i--) if(arr[i].color==="pink") return arr[i]; return null; }
function minutesSince(now,ts){ return (now-ts)/60000; }
function window40m(arr, now){ const from=now-40*60*1000; return arr.filter(r=>typeof r.ts==="number" && r.ts>=from && r.ts<=now); }
function hasSurfWithin(arr){ let run=0; for(const r of arr){ if(r.color!=="blue"){ run++; if(run>=3) return true; } else run=0;} return false; }
function isSurfValidated(colors){ let run=0; for(let i=colors.length-1;i>=0;i--){ if(colors[i]!=="blue"){ run++; if(run>=4) return true; } else break; } return false; }
function isSurfConstruction(colors){ const last8=colors.slice(-8); let pos=0, corr=0; last8.forEach(c=> c==="blue"?corr++:pos++); return pos/Math.max(1,last8.length)>=0.50 && corr<=2; }

const TIME_AFTER_PINK=[5,7,10,20], TIME_TOL=2, COOL_100X=10;
function macroConfirm(arr40, now){ return inPinkTimeWindow(now, arr40) || roseResetBooster(arr40) || hasSurfWithin(arr40); }
function inPinkTimeWindow(now, arr){ const p=lastPink(arr); if(!p||!p.ts) return false; const diff=Math.abs(minutesSince(now,p.ts)); return TIME_AFTER_PINK.some(w=>Math.abs(diff-w)<=TIME_TOL); }
function roseResetBooster(arr){ const last=arr[arr.length-1], prev=arr[arr.length-2]; if(last?.color==="pink"||prev?.color==="pink") return true;
  for(let i=arr.length-1;i>=0;i--){ const r=arr[i]; if(r.color!=="blue") return r.mult>=5; } return false; }
function hasRecent100x(arr,k=COOL_100X){ return arr.slice(-k).some(r=> r.color==="pink" && r.mult>=100); }

// ===================== DECISOR =====================
let pending=null; // {stage:0|1|2|'G1_WAIT'|'G2_WAIT', enterAtIdx:number|null, reason, strategy}
function clearPending(){ pending=null; martingaleTag.style.display="none"; setCardState({active:false,awaiting:false}); }

function detectMicroStrategy(colors, predPct){
  const L=colors.length, pos = c=>c==="purple"||c==="pink";
  if(L>=3 && pos(colors[L-1]) && pos(colors[L-2]) && pos(colors[L-3])){
    let run=0; for(let i=L-1;i>=0;i--){ if(pos(colors[i])) run++; else break; }
    if(run>=4) return {name:"surf 4+", gate:`${run} positivas ⇒ 2x`};
    if(run===3) return {name:"surf 3", gate:"3 positivas ⇒ 2x"};
  }
  // predominância forte + fim de correção
  if(predPct>=0.60 && colors[L-1]==="blue") return {name:"pred forte", gate:"pred≥60% + azul ⇒ 2x"};
  // xadrez simples na ponta
  if(L>=3 && colors[L-3]==="blue" && colors[L-2]!=="blue" && colors[L-1]==="blue") return {name:"xadrez", gate:"B-P-B ⇒ 2x"};
  return null;
}

function onNewCandle(arr){
  if(arr.length<2) return;
  renderHistory(arr);

  const now=arr.at(-1)?.ts || Date.now();
  const arr40=window40m(arr, now);
  const pred8=predominancePositive(arr,8);
  const blueRun=consecutiveBlueCount(arr);
  const cooled=!hasRecent100x(arr, COOL_100X);
  const colors=arr.map(r=>r.color);

  predStatus.textContent=`Predominância: ${(pred8.pct*100).toFixed(0)}%`+(pred8.strong?" · forte":"");
  blueRunPill.textContent=`Azuis seguidas: ${blueRun}`;

  // regras de pausa dura
  const hardPause = (!cooled) || (pred8.pct<0.50) || (blueRun>=3);
  engineStatus.textContent = hardPause ? "aguardando" : "operando";
  if(hardPause){
    const reason = !cooled ? "cooldown pós 100x" : (pred8.pct<0.50 ? "aguardando estabilidade" : "Risco Azul: aguardando estabilidade");
    setCardState({awaiting:true,title:"aguardando estabilidade",sub:reason});
    addFeed("warn", reason);
    return;
  }

  // fechar pendente (avaliar WIN/LOSS da vela que acabou)
  if(pending && typeof pending.enterAtIdx==="number"){
    const closed=arr.at(-1);
    if(closed.idx===pending.enterAtIdx){
      const win = closed.mult>=2.0;
      if(win){
        stats.wins++; stats.streak++; stats.maxStreak=Math.max(stats.maxStreak,stats.streak);
        if(pending.stage===0) stats.normalWins++; else if(pending.stage===1) stats.g1Wins++; else if(pending.stage===2) stats.g2Wins++;
        store.set(stats); syncStats(); addFeed("ok", pending.stage===0?"WIN 2x":`WIN 2x (G${pending.stage})`); clearPending(); 
      }else{
        // ----- LOSS no estágio atual -----
        if(pending.stage===0){
          // G1 direto apenas se: red com apenas 1 correção E pague ativo (pred≥50 e ≤2 correções na micro)
          const corrNow = blueRun; // azuis consecutivas após a vela perdida
          const pagueAtivo = pred8.ok && (blueRun<=2);
          if(corrNow===1 && pagueAtivo){
            pending.stage=1; pending.enterAtIdx=closed.idx+1; martingaleTag.style.display="inline-block";
            setCardState({active:true,title:"Chance de 2x G1",sub:`entrar após (${closed.mult.toFixed(2)}x)`});
            addFeed("warn","Ativando G1 (pague + 1 correção)");
          }else{
            // espera 1 vela para confirmar (anti-entrar na frente de azul / 2 correções)
            pending.stage='G1_WAIT'; pending.enterAtIdx=null; martingaleTag.style.display="inline-block";
            setCardState({awaiting:true,title:"aguardando estabilidade G1",sub:"aguardar 1 vela"});
            addFeed("warn","G1 aguardando 1 vela (filtro de azul)");
          }
        }else if(pending.stage===1){
          // G2 só se pague FORTE (≥60%) e ≤1 correção; caso contrário cancela operação
          const pagueForte = pred8.strong && (blueRun<=1);
          if(pagueForte){
            pending.stage='G2_WAIT'; pending.enterAtIdx=null; martingaleTag.style.display="inline-block";
            setCardState({awaiting:true,title:"aguardando estabilidade G2",sub:"confirmando pague forte"});
            addFeed("warn","G2 aguardando estabilidade (pague forte)");
          }else{
            // cancelar totalmente
            stats.losses++; stats.streak=0; store.set(stats); syncStats();
            addFeed("err","LOSS 2x (G1) — G2 cancelado por risco azul"); clearPending();
          }
        }else if(pending.stage===2){
          stats.losses++; stats.streak=0; store.set(stats); syncStats();
          addFeed("err","LOSS 2x (G2)"); clearPending();
        }
      }
    }
  }

  const last=arr.at(-1), lastTxt=last.mult.toFixed(2)+"x";

  // retomadas pós-espera
  if(pending && pending.stage==='G1_WAIT'){
    // depois de 1 vela, se gráfico ok (pred≥50, não 3 azuis, e algum macro OU micro padrão), liberar G1
    const micro = detectMicroStrategy(colors, pred8.pct);
    const macroOk = macroConfirm(arr40, now);
    if(pred8.ok && blueRun<=2 && (micro || macroOk)){
      pending.stage=1; pending.enterAtIdx=last.idx+1; martingaleTag.style.display="inline-block";
      setCardState({active:true,title:"Chance de 2x G1",sub:`entrar após (${lastTxt})`});
      addFeed("warn","Retomando G1 (ok após 1 vela)");
      return;
    }
  }
  if(pending && pending.stage==='G2_WAIT'){
    const macroOk = macroConfirm(arr40, now);
    if(pred8.strong && blueRun<=1 && macroOk){
      pending.stage=2; pending.enterAtIdx=last.idx+1; martingaleTag.style.display="inline-block";
      setCardState({active:true,title:"Chance de 2x G2",sub:`entrar após (${lastTxt})`});
      addFeed("warn","Ativando G2 (pague forte)");
      return;
    }else{
      // ainda não seguro, continua aguardando (não faz nada)
      return;
    }
  }

  // ======== NOVO SINAL (G0) ========
  if(!pending){
    const micro = detectMicroStrategy(colors, pred8.pct);
    const macroOk = macroConfirm(arr40, now);
    const surfNow = isSurfValidated(colors) || isSurfConstruction(colors);

    // regra de entrada G0 (liberada, estilo “antigo melhorado”):
    // - pred ≥ 50%
    // - sem 3 azuis seguidas
    // - (micro válido OU surf em construção/validado OU macro de 40m)
    const allowG0 = pred8.ok && blueRun<=2 && (micro || surfNow || macroOk);

    if(allowG0){
      pending = {stage:0, enterAtIdx:last.idx+1, reason: micro?micro.gate:(surfNow?"surf":"macro"), strategy: micro?micro.name:(surfNow?(isSurfValidated(colors)?"surf 4+":"surf 3"):"tempo/rosa/surf")};
      setCardState({active:true,title:"Chance de 2x",sub:`entrar após (${lastTxt})`});
      strategyTag.textContent=""; gateTag.textContent="";
      addFeed("warn",`SINAL 2x — entrar após (${lastTxt})`);
      return;
    }else{
      // mostrar status neutro
      setCardState({active:false,awaiting:false,title:"Chance de 2x",sub:"identificando padrão"});
    }
  }
}

// ===================== PARSE FIREBASE HISTORY =====================
function toArrayFromHistory(raw){
  const rows=[], vals=Object.values(raw||{});
  for(let i=0;i<vals.length;i++){
    const it=vals[i], mult=parseFloat(it?.multiplier); if(!Number.isFinite(mult)) continue;
    const color = (it?.color==="blue"||it?.color==="purple"||it?.color==="pink")? it.color : colorFrom(mult);
    let ts=null; if(it?.date && it?.time){ const d=new Date(`${it.date}T${it.time}`); if(!Number.isNaN(d.getTime())) ts=d.getTime(); }
    rows.push({idx:i, mult, color, ts});
  }
  return rows;
}

// ===================== INIT =====================
(function init(){
  try{
    const app=firebase.initializeApp(firebaseConfig);
    liveStatus.textContent="Conectado";
    liveStatus.style.background="rgba(34,197,94,.15)"; liveStatus.style.color="#b9f5c7"; liveStatus.style.borderColor="rgba(34,197,94,.35)";
    const dbRef=app.database().ref("history/");
    dbRef.on('value',(snap)=>{
      const data=snap.val(), arr=toArrayFromHistory(data);
      if(!arr.length){ engineStatus.textContent="sem dados"; return; }
      onNewCandle(arr);
    }, err=>{
      liveStatus.textContent="Erro: "+err.message;
      liveStatus.style.background="rgba(239,68,68,.15)"; liveStatus.style.color="#ffd1d1";
    });
  }catch(e){
    liveStatus.textContent="Falha ao iniciar Firebase";
    liveStatus.style.background="rgba(239,68,68,.15)"; liveStatus.style.color="#ffd1d1";
    console.error(e);
  }
})();

// ===================== BLOQUEIO DEVTOOLS =====================
(function(){
  const threshold=160; let open=false;
  const check=()=>{ const w=innerWidth,h=innerHeight; if(w<threshold||h<threshold){ if(!open){open=true; location.replace("https://www.google.com");} } else open=false; };
  addEventListener("resize",check); check();
  addEventListener("keydown",e=>{ if(e.key==="F12"||e.keyCode===123) e.preventDefault(); if(e.ctrlKey&&e.shiftKey&&(e.key==="I"||e.key==="i"||e.key==="J"||e.key==="j")) e.preventDefault(); });
  addEventListener("contextmenu",e=>e.preventDefault());
})();>
