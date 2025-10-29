// bot2x-script.js
(function () {
    // ===================== CONFIG FIREBASE ===========================
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
    const liveStatus = $("#bot2x-liveStatus");
    const engineStatus = $("#bot2x-engineStatus");
    const predStatus = $("#bot2x-predStatus");
    const blueRunPill = $("#bot2x-blueRun");
    const streakEl = $("#bot2x-streak");
    const winsEl = $("#bot2x-wins");
    const lossesEl = $("#bot2x-losses");
    const chanceCard = $("#bot2x-chanceCard");
    const chanceTitle = $("#bot2x-chanceTitle");
    const chanceSub = $("#bot2x-chanceSub");
    const strategyTag = $("#bot2x-strategyTag");
    const gateTag = $("#bot2x-gateTag");
    const martingaleTag = $("#bot2x-martingaleTag");
    const feed = $("#bot2x-feed");
    const historyGrid = $("#bot2x-history");
    const topslide = $("#bot2x-topslide");
    const clearStatsBtn = $("#bot2x-clearStatsBtn");

    const winsSidebar = $("#bot2x-winsSidebar"), streakSidebar = $("#bot2x-streakSidebar");
    const normalWinsEl = $("#bot2x-normalWins"), g1WinsEl = $("#bot2x-g1Wins"), g2WinsEl = $("#bot2x-g2Wins"), maxStreakEl = $("#bot2x-maxStreak");

    $("#bot2x-winsMoreBtn").onclick = () => winsSidebar.classList.add("bot2x-open");
    $("#bot2x-streakMoreBtn").onclick = () => streakSidebar.classList.add("bot2x-open");
    $("#bot2x-closeWins").onclick = () => winsSidebar.classList.remove("bot2x-open");
    $("#bot2x-closeStreak").onclick = () => streakSidebar.classList.remove("bot2x-open");

    document.addEventListener("click", e => {
        if (!winsSidebar.contains(e.target) && !$("#bot2x-winsMoreBtn").contains(e.target)) winsSidebar.classList.remove("bot2x-open");
        if (!streakSidebar.contains(e.target) && !$("#bot2x-streakMoreBtn").contains(e.target)) streakSidebar.classList.remove("bot2x-open");
    });

    function flashCard() {
        chanceCard.classList.add("bot2x-chance-animate");
        setTimeout(() => chanceCard.classList.remove("bot2x-chance-animate"), 260);
    }

    function setCardState({ active = false, awaiting = false, title = "Chance de 2x", sub = "identificando padrão" }) {
        chanceTitle.textContent = title;
        chanceSub.textContent = sub;
        chanceCard.classList.remove("bot2x-chance-active", "bot2x-chance-awaiting");
        if (active) { chanceCard.classList.add("bot2x-chance-active"); flashCard(); }
        else if (awaiting) chanceCard.classList.add("bot2x-chance-awaiting");
    }

    function topSlide(msg, ok = true) {
        topslide.textContent = msg;
        topslide.className = "bot2x-topslide " + (ok ? "bot2x-ok" : "bot2x-err");
        topslide.classList.add("bot2x-show");
        setTimeout(() => topslide.classList.remove("bot2x-show"), 1000);
    }

    function addFeed(type, text) {
        const div = document.createElement("div"); div.className = "bot2x-item";
        const left = document.createElement("div"); left.textContent = text;
        const right = document.createElement("div"); right.className = "bot2x-chip " + (type === "ok" ? "bot2x-ok" : type === "err" ? "bot2x-err" : "bot2x-warn");
        right.textContent = type === "ok" ? "WIN" : type === "err" ? "LOSS" : "INFO";
        div.appendChild(left); div.appendChild(right); feed.prepend(div);
    }

    function renderHistory(list) {
        const historyGrid = document.getElementById("bot2x-history");
        historyGrid.innerHTML = "";
        const last15 = list.slice(-15).reverse();
        last15.forEach(r => {
            const box = document.createElement("div");
            box.className = "bot2x-hbox bot2x-" + r.color;
            const top = document.createElement("div"); top.className = "bot2x-row"; top.style.justifyContent = "space-between";
            const val = document.createElement("div"); val.className = "val"; val.textContent = r.mult.toFixed(2) + "x";
            const dot = document.createElement("div"); dot.className = r.color === "blue" ? "bot2x-dot-blue" : (r.color === "purple" ? "bot2x-dot-purple" : "bot2x-dot-pink");
            const c = document.createElement("div"); c.className = "c"; c.textContent = r.color;
            top.appendChild(val); top.appendChild(dot); box.appendChild(top); box.appendChild(c);
            historyGrid.appendChild(box);
        });
    }

    // ===================== Persistência (compatível com antigo) ======================
    const store = {
        get() { try { return JSON.parse(localStorage.getItem("stats2x") || "{}"); } catch { return {}; } },
        set(d) { localStorage.setItem("stats2x", JSON.stringify(d)); }
    };
    let stats = Object.assign({ wins: 0, losses: 0, streak: 0, maxStreak: 0, normalWins: 0, g1Wins: 0, g2Wins: 0 }, store.get());
    function syncStatsUI() {
        winsEl.textContent = stats.wins; lossesEl.textContent = stats.losses; streakEl.textContent = stats.streak;
        maxStreakEl.textContent = stats.maxStreak; normalWinsEl.textContent = stats.normalWins;
        g1WinsEl.textContent = stats.g1Wins; g2WinsEl.textContent = stats.g2Wins;
    }
    syncStatsUI();

    // Função para limpar as estatísticas
    clearStatsBtn.onclick = () => {
        if (confirm("Tem certeza que deseja limpar todas as estatísticas salvas? Esta ação é irreversível.")) {
            stats = { wins: 0, losses: 0, streak: 0, maxStreak: 0, normalWins: 0, g1Wins: 0, g2Wins: 0 };
            store.set(stats);
            syncStatsUI();
            topSlide("Estatísticas limpas!", true);
        }
    };

    // ===================== Utils =======================
    function colorFrom(mult) { if (mult < 2.0) return "blue"; if (mult < 10.0) return "purple"; return "pink"; }
    function predominancePositive(list, N = 10) {
        const lastN = list.slice(-N);
        const pos = lastN.filter(c => c.color === "purple" || c.color === "pink").length;
        const pct = lastN.length ? pos / lastN.length : 0;
        return { pct, ok: pct > 0.6 };
    }
    function consecutiveBlueCount(list) {
        let c = 0; for (let i = list.length - 1; i >= 0; i--) { if (list[i].color === "blue") c++; else break; } return c;
    }
    const STRONG_PCT = 0.75;

    // ===================== Estratégias =======================
    function detectStrategies(colors) {
        const L = colors.length; if (L < 3) return null;
        const a = colors[L - 3], b = colors[L - 2], c = colors[L - 1];
        if (a === "blue" && b === "purple" && c === "blue") return { name: "xadrez", gate: "B-P-B ⇒ P (2x)" };
        if (b === "purple" && c === "purple" && window.bot2xHasRecentPurpleRun3) return { name: "sequência roxas", gate: "run≥3 recente + PP ⇒ P" };
        if (b === "pink" && c === "blue") return { name: "pós-rosa xadrez", gate: "Rosa→Azul ⇒ P (2x)" };
        if (L >= 4 && colors[L - 4] === "pink" && colors[L - 3] === "blue" && colors[L - 2] === "blue") return { name: "pós-rosa 2B→2P", gate: "Rosa→BB ⇒ RR" };
        if (L >= 6 && colors.slice(-6).join("-") === "blue-blue-purple-purple-blue-blue") return { name: "pares repetidos", gate: "BB-RR-BB ⇒ RR" };
        if (L >= 4 && colors.slice(-4).join("-") === "blue-blue-blue-purple") return { name: "triplacor", gate: "BBB-P ⇒ tendência 2x" };
        if (a === "blue" && b === "blue" && c === "purple") return { name: "triplacor (parcial)", gate: "BB-P ⇒ repetir BB-P/BB-PP (2x)" };
        return null;
    }

    function ngramPositiveProb(colors, order) {
        if (colors.length <= order) return null;
        const POS = new Set(["purple", "pink"]);
        const window = colors.slice(-120);
        const counts = new Map();
        for (let i = order; i < window.length; i++) {
            const ctx = window.slice(i - order, i).join("|");
            const next = window[i];
            const obj = counts.get(ctx) || { total: 0, pos: 0 };
            obj.total += 1;
            if (POS.has(next)) obj.pos += 1;
            counts.set(ctx, obj);
        }
        const ctxNow = colors.slice(-order).join("|");
        const stat = counts.get(ctxNow);
        if (!stat) return null;
        return { p: stat.pos / stat.total, n: stat.total };
    }

    function modelSuggest(colors) {
        for (const k of [4, 3, 2]) {
            const res = ngramPositiveProb(colors, k);
            if (res && res.n >= 3 && res.p >= 0.60) {
                return { name: `modelo n-grama k=${k}`, gate: `IA: P(positiva|ctx)=${(res.p * 100).toFixed(0)}% · n=${res.n}` };
            }
        }
        return null;
    }

    function hasRunPurple3InWindow(arr, minTimeMs) {
        const windowList = minTimeMs ? arr.filter(r => r.ts && r.ts >= minTimeMs) : arr.slice(-120);
        let best = 0, cur = 0; for (const r of windowList) { if (r.color === "purple") { cur++; best = Math.max(best, cur); } else cur = 0; }
        return best >= 3;
    }

    // ===================== Motor =======================
    let pending = null;
    function clearPending() { pending = null; martingaleTag.style.display = "none"; setCardState({ active: false, awaiting: false }); }

    function onNewCandle(arr) {
        if (arr.length < 2) return;
        renderHistory(arr);

        const pred10 = predominancePositive(arr, 10);
        const blueRun = consecutiveBlueCount(arr);
        predStatus.textContent = `Predominância: ${(pred10.pct * 100).toFixed(0)}% positivas`;
        blueRunPill.textContent = `Azuis seguidas: ${blueRun}`;

        const lastTs = arr[arr.length - 1]?.ts;
        const thirtyAgo = lastTs ? (lastTs - 30 * 60 * 1000) : null;
        window.bot2xHasRecentPurpleRun3 = hasRunPurple3InWindow(arr, thirtyAgo);

        const hardPaused = (blueRun >= 4) || (!pred10.ok);
        engineStatus.textContent = hardPaused ? "aguardando" : "operando";

        const awaitingStability = (blueRun >= 2);
        if (awaitingStability) {
            setCardState({ active: false, awaiting: true, title: "aguardando estabilidade", sub: "aguarde uma positiva" });
            addFeed("warn", "aguardando estabilidade (sequência azul)");
        }

        // WIN/LOSS
        if (pending && typeof pending.enterAtIdx === "number") {
            const justClosed = arr[arr.length - 1];
            if (justClosed.idx === pending.enterAtIdx) {
                const win = justClosed.mult >= 2.0;
                if (win) {
                    stats.wins++; stats.streak++; stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
                    if (pending.stage === 0) stats.normalWins++;
                    else if (pending.stage === 1) stats.g1Wins++;
                    else if (pending.stage === 2) stats.g2Wins++;
                    syncStatsUI(); store.set(stats);
                    const label = pending.stage === 0 ? "WIN 2x" : `WIN 2x (G${pending.stage})`;
                    addFeed("ok", label); topSlide("WIN 2x", true); clearPending();
                } else {
                    if (pending.stage === 0) {
                        if (awaitingStability) {
                            pending.stage = 'G1_WAIT'; pending.enterAtIdx = null; martingaleTag.style.display = "inline-block";
                            setCardState({ active: false, awaiting: true, title: "aguardando estabilidade", sub: "G1 parado" }); addFeed("warn", "G1 aguardando estabilidade");
                        } else {
                            pending.stage = 1; pending.enterAtIdx = justClosed.idx + 1; martingaleTag.style.display = "inline-block";
                            setCardState({ active: true, title: "Chance de 2x G1", sub: `entrar após (${justClosed.mult.toFixed(2)}x)` }); addFeed("warn", "Ativando G1");
                        }
                    } else if (pending.stage === 1) {
                        pending.stage = 'G2_WAIT'; pending.enterAtIdx = null; martingaleTag.style.display = "inline-block";
                        setCardState({ active: false, awaiting: true, title: "aguardando estabilidade", sub: "G2 parado" }); addFeed("warn", "G2 aguardando estabilidade");
                    } else if (pending.stage === 2) {
                        stats.losses++; stats.streak = 0; syncStatsUI(); store.set(stats);
                        addFeed("err", "LOSS 2x (G2 falhou)"); topSlide("LOSS 2x (G2)", false); clearPending();
                    }
                }
            }
        }

        if (hardPaused) return;
        const last = arr[arr.length - 1];
        const lastMultTxt = last.mult.toFixed(2) + "x";

        if (pending && pending.stage === 'G1_WAIT' && !awaitingStability && (last.color !== "blue")) {
            pending.stage = 1; pending.enterAtIdx = last.idx + 1; martingaleTag.style.display = "inline-block";
            setCardState({ active: true, title: "Chance de 2x G1", sub: `entrar após (${lastMultTxt})` }); addFeed("warn", "Retomando G1");
            return;
        }

        if (pending && pending.stage === 'G2_WAIT') {
            const colors = arr.map(r => r.color);
            const byRule = detectStrategies(colors) || modelSuggest(colors);
            if (!awaitingStability && byRule) {
                pending.stage = 2; pending.enterAtIdx = last.idx + 1; martingaleTag.style.display = "inline-block";
                setCardState({ active: true, title: "Chance de 2x G2", sub: `entrar após (${lastMultTxt})` });
                strategyTag.textContent = "Estratégia: " + byRule.name;
                gateTag.textContent = "Gatilho: " + byRule.gate;
                addFeed("warn", "SINAL 2x (G2) — estável");
                return;
            }
        }

        if (!pending && !awaitingStability) {
            const colors = arr.map(r => r.color);
            let suggestion = detectStrategies(colors) || modelSuggest(colors);
            if (suggestion) {
                pending = { stage: 0, enterAtIdx: last.idx + 1, reason: suggestion.gate, strategy: suggestion.name };
                const strong = pred10.pct >= STRONG_PCT;
                setCardState({ active: true, title: "Chance de 2x", sub: `entrar após (${lastMultTxt})` });
                strategyTag.textContent = "Estratégia: " + suggestion.name + (strong ? " · cenário forte" : "");
                gateTag.textContent = "Gatilho: " + suggestion.gate;
                addFeed("warn", `SINAL 2x (${suggestion.name}) — ${strong ? "(≥75%) " : ""}entrar após (${lastMultTxt})`);
            } else {
                setCardState({ active: false, awaiting: false, title: "Chance de 2x", sub: "identificando padrão" });
            }
        }
    }

    // ===================== Firebase =======================
    function toArrayFromHistory(raw) {
        const rows = [];
        const vals = Object.values(raw || {});
        for (let i = 0; i < vals.length; i++) {
            const it = vals[i];
            const mult = parseFloat(it?.multiplier);
            if (!Number.isFinite(mult)) continue;
            const color = (it?.color === "blue" || it?.color === "purple" || it?.color === "pink") ? it.color : colorFrom(mult);
            let ts = null;
            if (it?.date && it?.time) {
                const d = new Date(`${it.date}T${it.time}`);
                if (!Number.isNaN(d.getTime())) ts = d.getTime();
            }
            rows.push({ idx: i, mult, color, ts });
        }
        return rows;
    }

    (function init() {
        try {
            const app = firebase.initializeApp(firebaseConfig);
            liveStatus.textContent = "Conectado";
            liveStatus.style.background = "rgba(34, 197, 94, 0.15)"; liveStatus.style.color = "#b9f5c7"; liveStatus.style.borderColor = "rgba(34, 197, 94, 0.35)";
            const dbRef = app.database().ref("history/");
            dbRef.on('value', (snapshot) => {
                const data = snapshot.val();
                const arr = toArrayFromHistory(data);
                if (!arr.length) { engineStatus.textContent = "sem dados"; return; }
                onNewCandle(arr);
            }, (error) => {
                liveStatus.textContent = "Erro: " + error.message;
                liveStatus.style.background = "rgba(239, 68, 68, 0.15)"; liveStatus.style.color = "#ffd1d1";
            });
        } catch (e) {
            liveStatus.textContent = "Falha ao iniciar Firebase";
            liveStatus.style.background = "rgba(239, 68, 68, 0.15)"; liveStatus.style.color = "#ffd1d1";
            console.error(e);
        }
    })();
})();