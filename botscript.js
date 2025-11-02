// ===================== CHECAGEM DE LOGIN ===========================
(function checkLoginStatus() {
  const isLoggedIn = localStorage.getItem('isLoggedIn');
  if (isLoggedIn !== 'true') window.location.replace('/');
})();

// ===================== CONFIG FIREBASE (history/) ===========================
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

// ===================== UI Helpers ================================
const $ = s => document.querySelector(s);
const liveStatus = $("#liveStatus"), engineStatus = $("#engineStatus"), predStatus = $("#predStatus"), blueRunPill = $("#blueRun");
const streakEl = $("#streak"), winsEl = $("#wins"), lossesEl = $("#losses");
const chanceCard = $("#chanceCard"), chanceTitle = $("#chanceTitle"), chanceSub = $("#chanceSub");
const strategyTag = $("#strategyTag"), gateTag = $("#gateTag"), martingaleTag = $("#martingaleTag");
const feed = $("#feed"), historyGrid = $("#history"), topslide = $("#topslide");
const clearStatsBtn = $("#clearStatsBtn");

const winsSidebar = $("#winsSidebar"), streakSidebar = $("#streakSidebar");
const normalWinsEl = $("#normalWins"), g1WinsEl = $("#g1Wins"), g2WinsEl = $("#g2Wins"), maxStreakEl = $("#maxStreak");

$("#winsMoreBtn").onclick = () => winsSidebar.classList.add("open");
$("#streakMoreBtn").onclick = () => streakSidebar.classList.add("open");
$("#closeWins").onclick = () => winsSidebar.classList.remove("open");
$("#closeStreak").onclick = () => streakSidebar.classList.remove("open");
document.addEventListener("click", e => {
  if (!winsSidebar.contains(e.target) && !$("#winsMoreBtn").contains(e.target)) winsSidebar.classList.remove("open");
  if (!streakSidebar.contains(e.target) && !$("#streakMoreBtn").contains(e.target)) streakSidebar.classList.remove("open");
});

function flashCard(){ chanceCard.classList.add("chance-animate"); setTimeout(()=> chanceCard.classList.remove("chance-animate"), 260); }
function setCardState({active=false, awaiting=false, title="Chance de 2x", sub="identificando padrão"}){
  chanceTitle.textContent = title; chanceSub.textContent = sub;
  chanceCard.classList.remove("chance-active","chance-awaiting","chance-blocked");
  if(active){ chanceCard.classList.add("chance-active"); flashCard(); }
  else if(awaiting){ chanceCard.classList.add("chance-awaiting"); }
  else if(title==="SINAL BLOQUEADO"){ chanceCard.classList.add("chance-blocked"); }
}
function topSlide(msg, ok=true){ topslide.textContent = msg; topslide.className = "topslide " + (ok?"ok":"err"); topslide.classList.add("show"); setTimeout(()=> topslide.classList.remove("show"), 1000); }
function addFeed(type,text){
  const div=document.createElement("div"); div.className="item";
  const left=document.createElement("div"); left.textContent=text;
  const right=document.createElement("div"); right.className="chip "+(type==="ok"?"ok":type==="err"?"err":"warn");
  right.textContent= type==="ok"?"WIN": type==="err"?"LOSS":"INFO";
  div.appendChild(left); div.appendChild(right); feed.prepend(div);
}
function renderHistory(list){
  historyGrid.innerHTML=""; const last15 = list.slice(-15).reverse();
  last15.forEach(r=>{
    const box=document.createElement("div"); box.className="hbox "+r.color;
    const top=document.createElement("div"); top.className="row"; top.style.justifyContent="space-between";
    const val=document.createElement("div"); val.className="val"; val.textContent=r.mult.toFixed(2)+"x";
    const dot=document.createElement("div"); dot.className= r.color==="blue"?"dot-blue":(r.color==="purple"?"dot-purple":"dot-pink");
    const c=document.createElement("div"); c.className="c"; c.textContent=r.color;
    top.appendChild(val); top.appendChild(dot); box.appendChild(top); box.appendChild(c); historyGrid.appendChild(box);
  });
}

// ===================== Persistência ======================
const store = { get(){ try{ return JSON.parse(localStorage.getItem("stats2x")||"{}"); }catch{return {}} }, set(d){ localStorage.setItem("stats2x", JSON.stringify(d)); } };
let stats = Object.assign({wins:0,losses:0,streak:0,maxStreak:0,normalWins:0,g1Wins:0,g2Wins:0}, store.get());
function syncStatsUI(){ winsEl.textContent=stats.wins; lossesEl.textContent=stats.losses; streakEl.textContent=stats.streak; maxStreakEl.textContent=stats.maxStreak; normalWinsEl.textContent=stats.normalWins; g1WinsEl.textContent=stats.g1Wins; g2WinsEl.textContent=stats.g2Wins; }
syncStatsUI();
clearStatsBtn?.addEventListener("click", ()=>{ if(confirm("Limpar estatísticas salvas?")){ stats={wins:0,losses:0,streak:0,maxStreak:0,normalWins:0,g1Wins:0,g2Wins:0}; store.set(stats); syncStatsUI(); topSlide("Estatísticas limpas!", true);} });

// ===================== Utils / Core =======================
function colorFrom(mult){ if(mult<2.0) return "blue"; if(mult<10.0) return "purple"; return "pink"; }
function positivesRatio(list){ const pos = list.filter(c=>c.color==="purple"||c.color==="pink").length; return list.length ? pos/list.length : 0; }
function predominancePositive(list, N=8){ const lastN=list.slice(-N); const pct=positivesRatio(lastN); return {pct, ok:pct>=SOFT_PCT, strong:pct>=STRONG_PCT}; }
function consecutiveBlueCount(list){ let c=0; for(let i=list.length-1;i>=0;i--){ if(list[i].color==="blue") c++; else break; } return c; }
function minutesSince(tsNow, ts){ return (tsNow - ts)/60000; }
function lastPink(arr){ for(let i=arr.length-1;i>=0;i--){ if(arr[i].color==="pink") return arr[i]; } return null; }
function lastPurpleOrPink(arr){ for(let i=arr.length-1;i>=0;i--){ if(arr[i].color!=="blue") return arr[i]; } return null; }
function macroWindow40m(arr, nowTs){ const from = nowTs - (40*60*1000); return arr.filter(r=> typeof r.ts==="number" && r.ts>=from && r.ts<=nowTs); }
function toColors(arr){ return arr.map(r=>r.color); }

// Correções pesadas (BBB contagem em janela)
function countBBBSequences(colors, N=8){
  const window = colors.slice(-N); let cnt=0, run=0;
  for(const c of window){ if(c==="blue"){ run++; if(run===3) cnt++; } else run=0; }
  return cnt; // ≥2 → bloqueio
}

// ===== Surf (pague operável) =====
function isSurfValidated(colors){ let run=0; for(let i=colors.length-1;i>=0;i--){ if(colors[i]!=="blue"){ run++; if(run>=4) return true; } else break; } return false; }
function isSurfConstruction(colors){ const last8=colors.slice(-8); let positives=0, corrections=0; for(const c of last8){ if(c==="blue") corrections++; else positives++; } if(corrections>2) return false; return (positives/Math.max(1,last8.length))>=0.50; }

// ===== Tempo Rosa (5/7/10/20 ±2min) =====
const TIME_WINDOWS_AFTER_PINK = [5,7,10,20]; const TIME_TOLERANCE_MIN = 2;
function inPinkTimeWindow(nowTs, arr){
  const lp=lastPink(arr); if(!lp || !lp.ts) return false;
  const diff=Math.abs(minutesSince(nowTs, lp.ts));
  for(const w of TIME_WINDOWS_AFTER_PINK){ if(Math.abs(diff - w) <= TIME_TOLERANCE_MIN) return true; }
  return false;
}

// ===== 5ª casa após o rosa (±2 casas) =====
function fifthHouseAfterPink(arr){
  const lpIndex = (()=>{ for(let i=arr.length-1;i>=0;i--){ if(arr[i].color==="pink") return i; } return -1; })();
  if(lpIndex<0) return false;
  const dist = (arr.length-1) - lpIndex; // casas desde a rosa
  return dist>=3 && dist<=7 && Math.abs(dist-5)<=2;
}

// ===== Gatilho 04 (quebra de surf 3+) =====
function brokenSurfRetest(colors){
  // três+ positivas → 1 azul → contexto ainda positivo
  let run=0; for(let i=colors.length-1;i>=0;i--){
    if(colors[i]!=="blue"){ run++; }
    else { // azul encontrado
      return (run>=3); // tinha 3+ positivas antes de quebrar
    }
  }
  return false;
}

// ===== Ausência 06 (alto risco) =====
function absence06(arr){
  const last6 = arr.slice(-6); if(last6.length<6) return false;
  return last6.every(r=> r.mult<2.0);
}

// ===== Velas altas atraem altas (>=10x) =====
function highPullsHigh(arr){
  const lup=lastPurpleOrPink(arr); return !!(lup && lup.mult>=10);
}

// ===== Espelho e Espelho Invertido (reforços) =====
function mirrorPink(arr){
  // rosa com janela curta entre duas rosas (espelhamento simples)
  const idxs=[]; for(let i=0;i<arr.length;i++) if(arr[i].color==="pink") idxs.push(i);
  if(idxs.length<2) return false;
  const a = idxs[idxs.length-1], b = idxs[idxs.length-2];
  const gap = a-b; return gap>1 && gap<=6; // espelho curto
}
function mirrorInverted(colors){
  // sequência das últimas 6 velas espelhando invertido (simplificado)
  const w = colors.slice(-6); if(w.length<6) return false;
  const left = w.slice(0,3).join(""); const right = w.slice(3).reverse().map(x=> x==="blue"?"N":(x==="purple"?"P":"R")).join("");
  // Apenas um heurístico leve, não decisivo:
  return left.length===3 && right.length===3; // sinal de estudo (reforço fraco)
}

// ===== Xadrez / Triplacor (reforços) =====
function chess(colors){
  const w=colors.slice(-6); if(w.length<4) return false;
  // alternância curta B-P-B-P ou P-B-P-B ou com R entrada
  const s=w.join("-");
  return /^(blue|purple|pink)-(blue|purple|pink)-(blue|purple|pink)-(blue|purple|pink)/.test(s) && new Set(w.slice(-4)).size>=2;
}
function tricolorEntry(colors){
  const L=colors.length; if(L<4) return false;
  const seq = colors.slice(-4).join("-");
  return seq==="blue-blue-blue-purple" || seq==="blue-blue-purple" ;
}

// ===== Colunas / Diagonais / Horizontais (40min) =====
function columnsAndDiagonalsScore(arr40){
  if(arr40.length<8) return 0;
  // coluna por minuto (0..59):
  const byMinute = new Map();
  arr40.forEach(r=>{
    if(!r.ts) return;
    const m = new Date(r.ts).getMinutes();
    const k = m.toString().padStart(2,"0");
    const v = byMinute.get(k)||{total:0,pos:0}; v.total++; if(r.color!=="blue") v.pos++; byMinute.set(k,v);
  });
  // pega a coluna (minuto) da última vela:
  const last=arr40[arr40.length-1]; if(!last?.ts) return 0;
  const lastMin = new Date(last.ts).getMinutes().toString().padStart(2,"0");
  const col = byMinute.get(lastMin); const colScore = col ? (col.pos/Math.max(1,col.total)) : 0;

  // diagonais curtas: conta “tendência de +1” → última não-azul
  let diagScore=0, run=0;
  for(const r of arr40){ if(r.color!=="blue"){ run++; if(run>=3) diagScore=1; } else run=0; }

  // horizontais: sequência recente com correções pequenas
  let horizScore=0; const last8 = arr40.slice(-8); const pos=last8.filter(r=>r.color!=="blue").length; const cor=last8.length-pos;
  if(pos>=5 && cor<=2) horizScore=1;

  // score final simples 0..1..2..3 (normalizado)
  return Math.min(1, (colScore>=0.6?1:0) + diagScore + horizScore);
}

// ===== Falso Pague (bloqueio) =====
function isFalsePague(arr){
  // xadrez com picos altos alternando (>=10x) em 3/5 últimas + vai-e-vem
  const last10 = arr.slice(-10);
  const highs = last10.filter(r=> r.mult>=10).length;
  if(highs>=3){
    const colors = last10.map(r=>r.color);
    // alternância forte com picos: B-(R|P)-B-(R|P)...
    let alt=0; for(let i=1;i<colors.length;i++){ if(colors[i]!==colors[i-1]) alt++; }
    if(alt>=6) return true;
  }
  return false;
}

// ===== n-gramas simples (repetição de cores) =====
function ngramPositiveProb(colors, order){
  if(colors.length<=order) return null;
  const POS=new Set(["purple","pink"]); const window=colors.slice(-120); const counts=new Map();
  for(let i=order;i<window.length;i++){
    const ctx = window.slice(i-order,i).join("|"); const next=window[i];
    const obj=counts.get(ctx)||{total:0,pos:0}; obj.total+=1; if(POS.has(next)) obj.pos+=1; counts.set(ctx,obj);
  }
  const ctxNow = colors.slice(-order).join("|"); const stat=counts.get(ctxNow); if(!stat) return null;
  return {p: stat.pos/stat.total, n: stat.total};
}
function modelSuggest(colors){
  for(const k of [4,3,2]){
    const res = ngramPositiveProb(colors, k);
    if(res && res.n>=3 && res.p>=0.45){ return {name:`modelo n-grama k=${k}`, gate:`IA: P(positiva|ctx)=${(res.p*100).toFixed(0)}% · n=${res.n}`}; }
  }
  return null;
}

// ===================== Parâmetros (Ebook + suas regras) =======================
const SOFT_PCT = 0.50;   // ≥50% = pague operável
const STRONG_PCT = 0.60; // ≥60% = pague forte
const HARD_PAUSE_BLUE_RUN = 3; // 3 azuis seguidas → pausar micro
const COOLDOWN_AFTER_100X_CANDLES = 10; // esfriamento pós 100x

// ===== Bloqueios Azul (anti-gale) =====
function riskBlueRecent5(colors){ const last5=colors.slice(-5); return last5.filter(c=>c==="blue").length>=3; }
function riskBlueTrend20(colors){ const last20=colors.slice(-20); let bb=0; for(let i=1;i<last20.length;i++) if(last20[i]==="blue"&&last20[i-1]==="blue") bb++; return bb>=2; }
function riskBlue(colors){ return riskBlueRecent5(colors) || riskBlueTrend20(colors); }

// ===== Tempo macro (boost) =====
function macroConfirm(arr40, nowTs){
  return inPinkTimeWindow(nowTs, arr40) || hasSurfWithin(arr40) || roseResetBooster(arr40) || fifthHouseAfterPink(arr40);
}
function hasSurfWithin(arr){ let run=0; for(const r of arr){ if(r.color!=="blue"){ run++; if(run>=3) return true; } else run=0; } return false; }
function roseResetBooster(arr){
  const last = arr[arr.length-1], prev = arr[arr.length-2];
  if(last?.color==="pink" || prev?.color==="pink") return true;
  const lup = lastPurpleOrPink(arr); return !!(lup && lup.mult>=5);
}

// ===== Estratégia dos 2 minutos (pós-azul) =====
function twoMinutesAfterBlue(nowTs, arr){
  for(let i=arr.length-1;i>=0;i--){
    const r=arr[i]; if(r.color==="blue" && r.ts){
      const target = r.ts + 2*60*1000; const diffMin = Math.abs(minutesSince(nowTs, target));
      return diffMin<=0.5; // janela de ~30s
    }
  }
  return false;
}

// ===== DETECTOR PRINCIPAL (gatilhos + reforços) =====
function detectStrategies(arr, predPct, nowTs){
  const colors = toColors(arr); const L=colors.length; if(L<3) return null;
  const isPos = (c)=> c==="purple"||c==="pink";
  const a=colors[L-3], b=colors[L-2], c=colors[L-1];

  // BLOQUEIO: falso pague
  if(isFalsePague(arr)) return {blocked:true, reason:"falso pague"};

  // SURF
  if(L>=3 && isPos(a) && isPos(b) && isPos(c)){
    let run=0; for(let i=L-1;i>=0;i--){ if(isPos(colors[i])) run++; else break; }
    if(run>=4) return {name:"Surf Validado", gate:`Sequência de ${run} positivas (4+) ⇒ P (2x)`, score:2};
    if(run===3) return {name:"Surf em Construção", gate:"3 positivas ⇒ P (2x)", score:1};
  }

  // Predominância forte + fim de correção
  if(predPct>=STRONG_PCT && c==="blue") return {name:"Predominância Forte", gate:`Pred ${(predPct*100).toFixed(0)}% + Azul ⇒ P (2x)`, score:1};

  // Reforços do ebook
  const reinforcers = {
    chess: chess(colors),
    tricolor: tricolorEntry(colors),
    mirror: mirrorPink(arr),
    mirrorInv: mirrorInverted(colors),
    brokenSurf: brokenSurfRetest(colors),
    absence06: absence06(arr),          // ALTO RISCO — só reforço
    highPull: highPullsHigh(arr),
    fifthAfterPink: fifthHouseAfterPink(arr),
    twoMin: twoMinutesAfterBlue(nowTs, arr)
  };
  const macroScore = columnsAndDiagonalsScore(macroWindow40m(arr, nowTs));
  const ngram = modelSuggest(colors);
  let score = 0;
  if(reinforcers.chess) score+=0.5;
  if(reinforcers.tricolor) score+=0.5;
  if(reinforcers.mirror||reinforcers.mirrorInv) score+=0.25;
  if(reinforcers.brokenSurf) score+=0.5;
  if(reinforcers.highPull) score+=0.5;
  if(reinforcers.fifthAfterPink) score+=0.5;
  if(reinforcers.twoMin && predPct>=SOFT_PCT) score+=0.25; // só com pague operável
  score += macroScore; // 0..1
  if(ngram) score += 0.25;

  // Se não houve surf/Pred forte explícitos, sugere pela soma de reforços
  if(score>=1.0) return {name:"Repetição + Tempo", gate:`Reforços ${score.toFixed(2)} + tempo`, score, ngram};

  return null;
}

// ===================== Motor =======================
let pending=null;
function clearPending(){ pending=null; martingaleTag.style.display="none"; setCardState({active:false, awaiting:false}); }

function onNewCandle(arr){
  if(arr.length<2) return;
  renderHistory(arr);

  const nowTs = arr[arr.length-1]?.ts || Date.now();
  const arr40 = macroWindow40m(arr, nowTs);
  const pred8 = predominancePositive(arr, 8);
  const blueRun = consecutiveBlueCount(arr);
  const colors = toColors(arr);
  const bbbCount = countBBBSequences(colors, 8);

  predStatus.textContent = `Predominância: ${(pred8.pct*100).toFixed(0)}%` + (pred8.strong?" · forte":"");
  blueRunPill.textContent = `Azuis seguidas: ${blueRun}`;

  const cooled = !arr.slice(-COOLDOWN_AFTER_100X_CANDLES).some(r=> r.color==="pink" && r.mult>=100);
  const blockCorrections = bbbCount>=2; const weakPred = !pred8.ok;
  const hardPaused = (blueRun>=HARD_PAUSE_BLUE_RUN) || blockCorrections || weakPred || (!cooled);
  engineStatus.textContent = hardPaused ? "aguardando" : "operando";

  // ========== Fechamento de sinais (WIN/LOSS) e Gales ==========
  if(pending && typeof pending.enterAtIdx==="number"){
    const justClosed = arr[arr.length-1];
    if(justClosed.idx === pending.enterAtIdx){
      const win = justClosed.mult >= 2.0;
      if(win){
        stats.wins++; stats.streak++; stats.maxStreak=Math.max(stats.maxStreak, stats.streak);
        if(pending.stage===0) stats.normalWins++; else if(pending.stage===1) stats.g1Wins++; else if(pending.stage===2) stats.g2Wins++;
        store.set(stats); syncStatsUI(); addFeed("ok", pending.stage===0?"WIN 2x":`WIN 2x (G${pending.stage})`); topSlide("WIN 2x", true); clearPending();
      } else {
        const blueRiskNow = riskBlue(colors);
        if(pending.stage===0){
          // G1: só se motivo ainda existe + sem risco azul + macro ok
          const det = detectStrategies(arr, pred8.pct, nowTs);
          const macroOk = macroConfirm(arr40, nowTs);
          const samePattern = det && pending.strategy && det.name===pending.strategy;
          const surfNow = isSurfValidated(colors) || isSurfConstruction(colors);
          if(!blueRiskNow && pred8.ok && macroOk && (samePattern || surfNow)){
            pending.stage=1; pending.enterAtIdx=justClosed.idx+1; martingaleTag.style.display="inline-block";
            setCardState({active:true, title:"Chance de 2x G1", sub:`entrar após (${justClosed.mult.toFixed(2)}x)`}); addFeed("warn","Ativando G1");
          } else {
            pending.stage=null; pending.enterAtIdx=null;
            addFeed("warn", blueRiskNow?"Risco Azul: aguardando estabilidade":"G1 cancelado (padrão não confirmado)");
            setCardState({active:false, awaiting:true, title:"aguardando estabilidade", sub: blueRiskNow?"Risco Azul: aguardando estabilidade":"aguardar padrão"});
          }
        } else if(pending.stage===1){
          // G2: só se o mesmo padrão se repetir + confirmar 1 vela, sem risco azul
          const det = detectStrategies(arr, pred8.pct, nowTs);
          const macroOk = macroConfirm(arr40, nowTs);
          const samePattern = det && pending.strategy && det.name===pending.strategy;
          const allowRepeat = samePattern || isSurfValidated(colors) || isSurfConstruction(colors);
          if(!blueRiskNow && pred8.ok && macroOk && allowRepeat){
            pending.stage='G2_WAIT'; pending.enterAtIdx=null; martingaleTag.style.display="inline-block";
            setCardState({active:false, awaiting:true, title:"aguardando estabilidade G2", sub:"aguardar repetição do padrão"});
            addFeed("warn","G2 em avaliação (aguardar repetição)");
          } else {
            stats.losses++; stats.streak=0; store.set(stats); syncStatsUI();
            addFeed("err","LOSS 2x (G1 abortado)"); topSlide("LOSS 2x (G1)", false); clearPending();
          }
        } else if(pending.stage===2){
          stats.losses++; stats.streak=0; store.set(stats); syncStatsUI();
          addFeed("err","LOSS 2x (G2 falhou)"); topSlide("LOSS 2x (G2)", false); clearPending();
        }
      }
    }
  }

  // ========== Pausas / Cooldowns ==========
  if(hardPaused){
    let sub = (!cooled?"cooldown pós 100x": blockCorrections?"correção pesada repetida": weakPred?"aguardando estabilidade":"aguarde uma possibilidade");
    setCardState({active:false, awaiting:true, title:"aguardando estabilidade", sub});
    return;
  }

  const last = arr[arr.length-1]; const lastMultTxt = last.mult.toFixed(2)+"x";

  // ========== G2 armado (confirma 1 vela) ==========
  if(pending && pending.stage==='G2_WAIT'){
    const det = detectStrategies(arr, pred8.pct, nowTs);
    const macroOk = macroConfirm(arr40, nowTs);
    const samePattern = det && pending && pending.strategy && det.name===pending.strategy;
    const surfNow = isSurfValidated(colors) || isSurfConstruction(colors);
    const allowPatternRepeat = samePattern || surfNow;

    if(!riskBlue(colors) && pred8.ok && macroOk && allowPatternRepeat){
      pending.stage='G2_ARMED'; pending.confirmAtIdx = last.idx + 1;
      addFeed("warn","G2 armado (aguardando 1 vela de confirmação)");
      setCardState({active:false, awaiting:true, title:"G2 armado", sub:"aguardar confirmação 1 vela"});
      return;
    } else if(riskBlue(colors)){
      addFeed("warn","Risco Azul: aguardando estabilidade");
      pending.stage=null; pending.enterAtIdx=null;
      setCardState({active:false, awaiting:true, title:"aguardando estabilidade", sub:"Risco Azul: aguardando estabilidade"});
      return;
    }
  }
  if(pending && pending.stage==='G2_ARMED'){
    const justClosed = arr[arr.length-1];
    if(justClosed.idx >= (pending.confirmAtIdx||Infinity)){
      if(!riskBlue(colors) && pred8.ok && macroConfirm(arr40, nowTs)){
        pending.stage=2; pending.enterAtIdx=justClosed.idx+1; martingaleTag.style.display="inline-block";
        setCardState({active:true, title:"Chance de 2x G2", sub:`entrar após (${justClosed.mult.toFixed(2)}x)`});
        addFeed("warn","SINAL 2x (G2) — confirmação ok");
      } else {
        addFeed("warn","Risco Azul: aguardando estabilidade");
        pending.stage=null; pending.enterAtIdx=null;
        setCardState({active:false, awaiting:true, title:"aguardando estabilidade", sub:"Risco Azul: aguardando estabilidade"});
      }
      return;
    }
  }

  // ========== G1 retomar se macro voltou a ok ==========
  if(pending && pending.stage==='G1_WAIT' && pred8.ok && !blockCorrections && macroConfirm(arr40, nowTs)){
    pending.stage=1; pending.enterAtIdx=last.idx+1; martingaleTag.style.display="inline-block";
    setCardState({active:true, title:"Chance de 2x G1", sub:`entrar após (${lastMultTxt})`}); addFeed("warn","Retomando G1 (macro ok)");
    return;
  }

  // ========== NOVO SINAL (G0) ==========
  if(!pending){
    const det = detectStrategies(arr, pred8.pct, nowTs); // pode retornar blocked
    const macroOk = macroConfirm(arr40, nowTs);
    const entryAllowed = pred8.ok && !macroOk ? false : pred8.ok; // precisa pague ≥50 e algum macro ou estrutura
    const blockCorrectionsNow = countBBBSequences(colors,8)>=2;

    // Fast-lane do Pague dos Roxinhos: pague forte OU (pague 50% + surf em construção/validado), entra próxima vela
    const surfNow = isSurfValidated(colors) || isSurfConstruction(colors);
    const fastLane = (pred8.strong && !blockCorrectionsNow) || (pred8.ok && surfNow && !blockCorrectionsNow);

    if(det?.blocked){ // falso pague
      setCardState({active:false, awaiting:true, title:"aguardando estabilidade", sub:"falso pague"});
      return;
    }

    if(fastLane){
      const usedName = isSurfValidated(colors)? "Surf Validado" : "Surf em Construção";
      const usedGate = isSurfValidated(colors)? "pague forte" : "pague dos roxinhos";
      pending = { stage:0, enterAtIdx: last.idx+1, reason: usedGate, strategy: usedName };
      setCardState({active:true, title:"Chance de 2x", sub:`entrar após (${lastMultTxt})`});
      strategyTag.textContent = "Estratégia: " + usedName + (pred8.strong?" · cenário forte":"");
      gateTag.textContent = "Gatilho: " + usedGate;
      addFeed("warn", `SINAL 2x (${usedName}) — entrar após (${lastMultTxt})`);
      return;
    }

    if(entryAllowed && (det || macroOk)){
      const usedName = det?.name || "macro";
      const usedGate = det?.gate || "tempo/rosa/surf (40m)";
      pending = { stage:0, enterAtIdx: last.idx+1, reason: usedGate, strategy: usedName };
      setCardState({active:true, title:"Chance de 2x", sub:`entrar após (${lastMultTxt})`});
      strategyTag.textContent = "Estratégia: " + usedName + (pred8.strong?" · cenário forte":"");
      gateTag.textContent = "Gatilho: " + usedGate;
      addFeed("warn", `SINAL 2x (${usedName}) — entrar após (${lastMultTxt})`);
      return;
    } else {
      setCardState({active:false, awaiting:false, title:"Chance de 2x", sub:"identificando padrão"});
      strategyTag.textContent = "Estratégia: —"; gateTag.textContent = "Gatilho: —";
    }
  }
}

// ===================== Firebase (history/) =======================
function toArrayFromHistory(raw){
  const rows = []; const vals = Object.values(raw||{});
  for(let i=0;i<vals.length;i++){
    const it=vals[i]; const mult=parseFloat(it?.multiplier); if(!Number.isFinite(mult)) continue;
    const color = (it?.color==="blue"||it?.color==="purple"||it?.color==="pink") ? it.color : colorFrom(mult);
    let ts=null; if(it?.date && it?.time){ const d=new Date(`${it.date}T${it.time}`); if(!Number.isNaN(d.getTime())) ts=d.getTime(); }
    rows.push({ idx:i, mult, color, ts });
  }
  return rows;
}
(function init(){
  try{
    const app = firebase.initializeApp(firebaseConfig);
    liveStatus.textContent="Conectado";
    liveStatus.style.background="rgba(34,197,94,.15)"; liveStatus.style.color="#b9f5c7"; liveStatus.style.borderColor="rgba(34,197,94,.35)";
    const dbRef = app.database().ref("history/");
    dbRef.on('value',(snapshot)=>{
      const data=snapshot.val(); const arr=toArrayFromHistory(data);
      if(!arr.length){ engineStatus.textContent="sem dados"; return; }
      onNewCandle(arr);
    },(error)=>{
      liveStatus.textContent = "Erro: "+error.message;
      liveStatus.style.background="rgba(239,68,68,.15)"; liveStatus.style.color="#ffd1d1";
    });
  }catch(e){
    liveStatus.textContent="Falha ao iniciar Firebase";
    liveStatus.style.background="rgba(239,68,68,.15)"; liveStatus.style.color="#ffd1d1";
    console.error(e);
  }
})();

// ===================== BLOQUEIO DO DEVTOOLS =======================
(function() {
  const threshold=160; let devtoolsOpen=false;
  const checkDevTools=()=>{ const w=window.innerWidth, h=window.innerHeight; if(w<threshold||h<threshold){ if(!devtoolsOpen){ devtoolsOpen=true; window.location.replace("https://www.google.com"); } } else devtoolsOpen=false; };
  window.addEventListener('resize', checkDevTools); checkDevTools();
  document.addEventListener('keydown', e => {
    if (e.key === 'F12' || e.keyCode === 123) e.preventDefault();
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) e.preventDefault();
    if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) e.preventDefault();
  });
  document.addEventListener('contextmenu', e => e.preventDefault());
})();
