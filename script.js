// ====================================================================
// 1. IMPORTS E CONFIGURAÇÃO FIREBASE
// ====================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// Config Firebase (Apenas Leitura)
const firebaseConfig = {
  apiKey: "AIzaSyB-35zQDrQbz8ohT_o_u_d_q_p_F_k_a_y_Y_d_A_U_D_r_L_w_6_g", // Chave fictícia por segurança
  authDomain: "history-dashboard-a70ee.firebaseapp.com",
  databaseURL: "https://history-dashboard-a70ee-default-rtdb.firebaseio.com",
  projectId: "history-dashboard-a70ee",
  storageBucket: "history-dashboard-a70ee.firebasestorage.app",
  messagingSenderId: "969153856969",
  appId: "1:969153856969:web:6b50fae1db463b8352d418",
  measurementId: "G-9MVGBX2KLX"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Variáveis Globais (Dados e UI)
let historyData = []; 
const multiplierGrid = document.getElementById('multiplier-grid');
const dateFilter = document.getElementById('date-filter');
let intervalFrequencies = {}; 
let pinkBelow35x = 0; 
let pinkBelow50x = 0; 
let timeSinceLast50x = 0; // Para 50x
let averageTimeBetween50x = 0; // Para 50x

// Variáveis para 5x
let timeSinceLast_5x = 0;
let averageTimeBetween_5x = 0;
let globalActive5xStrategy = null; 

// Variáveis para Padrões e Backtest
const PINK_SCOPE = 14; 
let patternStats = { multiplierTriggers: {} }; 
let isStrongPatternActive = false; 
let recentPinkTriggers = []; 
let currentActiveTriggerKey = null; 

// NOVAS VARIÁVEIS PARA PADRÃO DE TEMPO ROSA
// MODIFICADO: 'targetMinute' para armazenar o H:M previsto, 'patternMinutes' para o slidebar
let timePatternAlert = { isActive: false, status: 'Aguardando', targetMinute: null, patternMinutes: null };
const ROSA_TIME_PATTERNS = [3, 5, 7, 10]; // Os minutos definidos

// ====================================================================
// 2. FUNÇÕES AUXILIARES
// ====================================================================

function getVelaColor(nValue) {
    if (nValue >= 10.00) {
        return 'pink'; 
    } else if (nValue >= 2.00) {
        return 'purple'; 
    } else {
        return 'blue'; 
    }
}

function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) {
        const [h, m, s] = parts;
        return h * 60 + m + s / 60; // Mantém a precisão dos segundos
    }
    return 0;
}

// NOVA FUNÇÃO AUXILIAR para converter minutos decimais em string H:M
function minutesToTimeString(minutes) {
    if (isNaN(minutes) || minutes === null) return "00:00";
    
    const totalMinutes = Math.floor(minutes);
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    
    const hStr = String(h).padStart(2, '0');
    const mStr = String(m).padStart(2, '0');
    
    return `${hStr}:${mStr}`;
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ====================================================================
// 3. LÓGICA DE CÁLCULO DE MÉDIAS (Piso Mínimo)
// ====================================================================

function calculateColorAverages(history) {
    const limitedHistory = history.slice(0, 5000); 

    const lastBlue = limitedHistory.find(item => item.color === 'blue');
    const lastPurple = limitedHistory.find(item => item.color === 'purple');
    const lastPink = limitedHistory.find(item => item.color === 'pink');

    const blueValue = lastBlue ? Math.max(lastBlue.multiplier / 1.15, 1.10) : 1.10;
    const purpleValue = lastPurple ? Math.max(lastPurple.multiplier / 1.15, 2.00) : 2.00;
    const pinkValue = lastPink ? Math.max(lastPink.multiplier / 1.7, 10.00) : 10.00;

    document.querySelector('.card-value.blue').textContent = `${blueValue.toFixed(2)}x`;
    document.querySelector('.card-value.purple').textContent = `${purpleValue.toFixed(2)}x`;
    document.querySelector('.card-value.pink').textContent = `${pinkValue.toFixed(2)}x`;
}

// ====================================================================
// 4. LÓGICA DE PROBABILIDADE 10x (Gatilhos de Tempo/Padrão Aprimorados)
// ====================================================================

// FUNÇÃO MODIFICADA PARA LÓGICA PREDITIVA
function getTimePatternProbability(history) {
    const limitedHistory = history.slice(0, 5000);
    let baseProb = 35; // Probabilidade mínima
    
    // Reseta o alerta global
    timePatternAlert = { isActive: false, status: 'Aguardando', targetMinute: null, patternMinutes: null };

    if (limitedHistory.length === 0) {
        return 40; 
    }

    const nowMinutes = limitedHistory[0].minutes; 
    const RECENT_WINDOW_MINUTES = 30; // Para o padrão de repetição de intervalo
    
    // --- CÁLCULO DO PADRÃO BASE (Repetições de Intervalos) ---
    const recentPinkVelas = limitedHistory
        .filter(item => item.color === 'pink')
        .filter(item => {
            const timeDiff = Math.abs(nowMinutes - item.minutes);
            return timeDiff <= RECENT_WINDOW_MINUTES; 
        });
    
    const lastPink = recentPinkVelas[0]; // A rosa mais recente para o padrão de repetição

    if (lastPink) {
        intervalFrequencies = {};
        const detectedIntervals = new Set();
        let timeMatchWindowActive = false;
        let maxFrequency = 0;
        
        for (let i = 0; i < recentPinkVelas.length; i++) {
            for (let j = i + 1; j < recentPinkVelas.length; j++) {
                const timeDiff = Math.abs(recentPinkVelas[i].minutes - recentPinkVelas[j].minutes);
                const roundedDiff = Math.round(timeDiff); 
                
                if (roundedDiff > 0) { 
                    intervalFrequencies[roundedDiff] = (intervalFrequencies[roundedDiff] || 0) + 1;
                    detectedIntervals.add(roundedDiff);
                }
            }
        }

        const timeSinceLastPink = Math.round(Math.abs(nowMinutes - lastPink.minutes));
        
        if (detectedIntervals.size > 0) {
            maxFrequency = Object.values(intervalFrequencies).reduce((max, current) => Math.max(max, current), 0);
            
            for (const interval of detectedIntervals) {
                if (Math.abs(timeSinceLastPink - interval) <= 1) { // Janela de 1 minuto antes/depois
                    timeMatchWindowActive = true;
                    break;
                }
            }
        }

        // Aplica probabilidade do padrão de repetição
        if (timeMatchWindowActive) {
            baseProb = Math.max(baseProb, 85); 
        } else {
            if (maxFrequency >= 5) { 
                baseProb = Math.max(baseProb, 80); 
            } else if (maxFrequency >= 3) { 
                baseProb = Math.max(baseProb, 75); 
            } else if (maxFrequency >= 2) { 
                baseProb = Math.max(baseProb, 55); 
            } 
        }

        // Atualiza isStrongPatternActive baseado em maxFrequency
        isStrongPatternActive = maxFrequency >= 3;
    }
    
    // --- LÓGICA DO NOVO PADRÃO DE TEMPO PREDITIVO (3, 5, 7, 10 minutos) ---
    
    // Encontra a última rosa (sem limite de 30 min) para o novo padrão
    const absoluteLastPink = limitedHistory.find(item => item.color === 'pink');
    
    if (absoluteLastPink) {
        const lastPinkMinutes = absoluteLastPink.minutes;
        const timeSinceLastPinkInMinutes = nowMinutes - lastPinkMinutes;
        
        let newTimePatternActive = false; // Para boost de probabilidade
        let nextPotentialPatternFound = false; // Para lógica do card
        let cardStatus = 'Aguardando';
        let cardTargetTimeStr = null;
        let cardPatternMinutes = null; // Para o slidebar
        
        const ALERT_WINDOW_SECONDS = 30; // 30 segundos antes
        const ACTIVE_WINDOW_SECONDS = 60; // 60 segundos depois (janela de 1.5 min total)

        for (const targetTime of ROSA_TIME_PATTERNS) {
            const targetHitMinutes = lastPinkMinutes + targetTime; // Ex: 16:19:33 + 3min = 16:22:33
            
            // 1. Lógica de Boost de Probabilidade (Janela de +/- 1 min)
            if (timeSinceLastPinkInMinutes >= targetTime - 1 && timeSinceLastPinkInMinutes <= targetTime + 1) {
                newTimePatternActive = true;
            }

            // 2. Lógica de Display do Card (Preditivo)
            if (!nextPotentialPatternFound) {
                const timeToHit_seconds = (targetHitMinutes - nowMinutes) * 60; // Segundos até o alvo exato
                
                // Se o alvo já passou (mais de 60s atrás)
                if (timeToHit_seconds < -ACTIVE_WINDOW_SECONDS) {
                    continue; // Vai para o próximo padrão (ex: 5 min)
                }
                
                // Se está na janela de "ATIVO" (de 30s antes até 60s depois)
                if (timeToHit_seconds <= ALERT_WINDOW_SECONDS) { 
                    cardStatus = 'ENTRADA ATIVA';
                    cardTargetTimeStr = minutesToTimeString(targetHitMinutes);
                    cardPatternMinutes = targetTime; // Salva o padrão (ex: 3)
                    nextPotentialPatternFound = true;
                }
                // Se é o próximo, mas ainda não está na janela de alerta
                else if (timeToHit_seconds > ALERT_WINDOW_SECONDS) {
                    cardStatus = 'Próximo';
                    cardTargetTimeStr = minutesToTimeString(targetHitMinutes);
                    cardPatternMinutes = targetTime; // Salva o padrão (ex: 5)
                    nextPotentialPatternFound = true;
                }
            }
        }
        
        // Atualiza o objeto de alerta global para o card
        timePatternAlert.status = cardStatus;
        timePatternAlert.targetMinute = cardTargetTimeStr;
        timePatternAlert.patternMinutes = cardPatternMinutes; // Salva o padrão
        timePatternAlert.isActive = (cardStatus === 'ENTRADA ATIVA');
        
        // Aplica boost de prob se o padrão preditivo estiver ativo
        if (newTimePatternActive || timePatternAlert.isActive) {
            baseProb = Math.max(baseProb, 85);
        }

    } else {
         // Nenhuma rosa encontrada, reseta o card
        updateTimePatternCard(timePatternAlert);
    }

    // --- Lógica de Predominância (mantida) ---
    const lastPinkIndex = limitedHistory.findIndex(item => item.color === 'pink');
    const lastPinkDistance = lastPinkIndex !== -1 ? lastPinkIndex : limitedHistory.length; 
    
    if (lastPinkDistance >= 15 && lastPinkDistance <= 20) {
        if (baseProb < 70) { // Só aumenta se o padrão de repetição não for forte
             baseProb = Math.max(baseProb, 70); 
        }
    }

    if (baseProb < 60) { 
        const LAST_CANDLES_FOR_PREDOMINANCE = 8;
        const last8 = limitedHistory.slice(0, LAST_CANDLES_FOR_PREDOMINANCE);
        const nonBlueCount = last8.filter(item => item.color !== 'blue').length; 
        
        if (last8.length === LAST_CANDLES_FOR_PREDOMINANCE && nonBlueCount >= 7) {
             baseProb = Math.max(baseProb, 60); 
        }
    }
    
    // Garante que o status do card é atualizado no final
    updateTimePatternCard(timePatternAlert);

    return Math.max(baseProb, 35); 
}

// Função de análise de padrões mantida
function findPatterns(history) {
    const multiplierTriggers = {}; 
    
    let pinkCount = 0;
    let analysisEndIndex = history.length; 
    
    for (let i = 0; i < history.length; i++) {
        if (history[i].color === 'pink') {
            pinkCount++;
            if (pinkCount === PINK_SCOPE) {
                analysisEndIndex = i + 1; 
                break;
            }
        }
    }
    
    const analysisHistory = history.slice(0, analysisEndIndex);

    for (let i = 0; i < analysisHistory.length - 1; i++) {
        const resultCandle = analysisHistory[i]; 
        const triggerCandle = analysisHistory[i+1]; 
        
        const key = triggerCandle.multiplier.toFixed(2);
        
        if (!multiplierTriggers[key]) {
            multiplierTriggers[key] = { reps: 0, hits: 0, hitRate: 0 };
        }
        
        multiplierTriggers[key].reps++;
        
        if (resultCandle.color === 'pink') {
            multiplierTriggers[key].hits++;
        }
    }
    
    for (const key in multiplierTriggers) {
        const p = multiplierTriggers[key];
        if (p.reps > 0) {
            p.hitRate = (p.hits / p.reps) * 100;
        }
    }
    
    return { multiplierTriggers };
}

function findRecentPinkTriggers(history) {
    recentPinkTriggers = []; 
    if (history.length < 2) return;

    const TWO_HOURS_IN_MINUTES = 120;
    const nowMinutes = history[0].minutes;
    
    for (let i = 0; i < history.length - 1; i++) {
        const resultCandle = history[i];
        const triggerCandle = history[i+1];
        
        const timeDiff = Math.abs(nowMinutes - resultCandle.minutes);
        if (timeDiff > TWO_HOURS_IN_MINUTES) {
            break; 
        }
        
        if (resultCandle.color === 'pink') {
            recentPinkTriggers.push({
                multiplier: triggerCandle.multiplier,
                time: triggerCandle.time
            });
        }
    }
}

function calculateProb10x(history, patternStats) {
    // 1. Calcula a probabilidade base (Tempo, Intervalo, Long Streak, Padrão Preditivo)
    // Esta função agora também atualiza o 'timePatternAlert' e 'isStrongPatternActive'
    let baseProb = getTimePatternProbability(history);
    
    // 2. Verifica se um padrão forte (gatilho de multiplicador) está ativo AGORA
    let patternBoost = 0;
    
    if (history.length < 1) {
        return baseProb; 
    }

    const latestCandle = history[0]; 
    const triggerKey = latestCandle.multiplier.toFixed(2);
    
    const p = patternStats.multiplierTriggers[triggerKey];
    
    // Se esse gatilho existe e é "Forte" (>=3 reps)
    if (p && p.reps >= 3) {
         patternBoost = 25; 
    }
    
    let finalProb = baseProb + patternBoost;
    
    return finalProb;
}

// ====================================================================
// 5. LÓGICA DE PROBABILIDADE 50x E ESTATÍSTICAS 5x
// ====================================================================

function calculateCustomProb(count, minVelas, maxVelas) {
    if (count < minVelas) {
        return 0; 
    }
    if (count >= maxVelas) {
        return 90; 
    }
    let prob = 0;
    if (count >= 3 && count < 6) {
        prob = 38 + (count - 3) * (77 - 38) / (6 - 3); 
    } else if (count >= 6 && count < 9) {
        prob = 77 + (count - 6) * (90 - 77) / (9 - 6); 
    } else {
        return 20; 
    }
    return Math.round(prob);
}

function calculate5xStats(history) {
    const limitedHistory = history.slice(0, 5000);
    
    if (limitedHistory.length === 0) { 
        timeSinceLast_5x = 0;
        averageTimeBetween_5x = 0;
        globalActive5xStrategy = null; // Reseta a estratégia
        return;
    }
    
    const all5xVelas = limitedHistory.filter(item => item.multiplier >= 5.00);
    const currentTime = limitedHistory[0].minutes;

    if (all5xVelas.length > 0) {
        const last5x = all5xVelas[0]; 
        timeSinceLast_5x = currentTime - last5x.minutes;
    } else {
        timeSinceLast_5x = currentTime;
    }

    if (all5xVelas.length >= 2) {
        const penultimo5x = all5xVelas[1]; 
        const ultimo5x = all5xVelas[0];    
        averageTimeBetween_5x = ultimo5x.minutes - penultimo5x.minutes;
    } else {
        averageTimeBetween_5x = 0; 
    }
}

function calculateProb50x(history) {
    const limitedHistory = history.slice(0, 5000); 
    
    if (limitedHistory.length === 0) { 
        timeSinceLast50x = 0;
        averageTimeBetween50x = 0;
        pinkBelow35x = 0;
        pinkBelow50x = 0;
        return 20;
    }
    
    const all50xVelas = limitedHistory.filter(item => item.multiplier >= 50.00);
    
    if (all50xVelas.length > 0) {
        const last50x = all50xVelas[0]; 
        const currentTime = limitedHistory[0].minutes;
        timeSinceLast50x = currentTime - last50x.minutes; 
    } else {
        timeSinceLast50x = limitedHistory[0].minutes;
    }

    if (all50xVelas.length >= 2) {
        const penultimo50x = all50xVelas[1]; 
        const ultimo50x = all50xVelas[0];    
        averageTimeBetween50x = ultimo50x.minutes - penultimo50x.minutes;
    } else {
        averageTimeBetween50x = 0; 
    }

    const indexLast50x = all50xVelas.length > 0 ? limitedHistory.findIndex(item => item.multiplier >= 50.00) : -1;
    const relevantHistory = indexLast50x !== -1 ? limitedHistory.slice(0, indexLast50x) : limitedHistory;
    
    const pinkVelas = relevantHistory.filter(item => item.color === 'pink');

    pinkBelow35x = pinkVelas.filter(item => item.multiplier >= 10.00 && item.multiplier <= 35.00).length;
    pinkBelow50x = pinkVelas.filter(item => item.multiplier >= 10.00 && item.multiplier < 50.00).length;
    
    let finalProb = 20; 

    const prob35x = calculateCustomProb(pinkBelow35x, 3, 10);
    const prob50x = calculateCustomProb(pinkBelow50x, 3, 10);

    finalProb = Math.max(finalProb, prob35x, prob50x);
    
    if (pinkVelas.length < 3) {
         finalProb = 20; 
    }

    return finalProb;
}

// ====================================================================
// 6. FUNÇÕES GERAIS DE DASHBOARD E RENDERIZAÇÃO
// ====================================================================

// MODIFICADO: Função para atualizar o status do Card Preditivo
function updateTimePatternCard(alert) {
    const card = document.getElementById('time-pattern-status');
    if (!card) return; // Proteção
    
    card.classList.remove('status-alert', 'status-near', 'status-ok');
    
    if (alert.status === 'ENTRADA ATIVA') {
        // Ex: "Chance de Rosa: 16:22" (COR ROSA)
        card.textContent = `Chance de Rosa: ${alert.targetMinute}`;
        card.classList.add('status-alert'); // status-alert agora é rosa
    } else if (alert.status === 'Próximo') {
        // Ex: "Possível: 16:24" (COR AMARELA)
        card.textContent = `Possível: ${alert.targetMinute}`;
        card.classList.add('status-near');
    } else {
        card.textContent = 'Aguardando';
        card.classList.add('status-ok'); // (COR VERDE)
    }
}

function updateProbability(id, percentage) {
    const element = document.getElementById(id);
    const safePercentage = Math.max(0, percentage); 

    element.textContent = `${safePercentage}%`;
    element.setAttribute('data-value', safePercentage);
    
    element.classList.remove('color-red', 'color-green');
    if (safePercentage < 40) { 
        element.classList.add('color-red');
    } else { 
        element.classList.add('color-green');
    }
}

window.toggleSidebar = function() {
    const container = document.getElementById('dashboard-container');
    container.classList.toggle('sidebar-hidden');
}

function filterVelas(data) {
    const showBlue = document.getElementById('filter-blue').checked;
    const showPurple = document.getElementById('filter-purple').checked;
    const showPink = document.getElementById('filter-pink').checked;

    return data.filter(item => {
        if (item.color === 'blue' && showBlue) return true;
        if (item.color === 'purple' && showPurple) return true;
        if (item.color === 'pink' && showPink) return true;
        return false;
    });
}

function renderGrid(data) {
    multiplierGrid.innerHTML = '';
    
    if (data.length === 0) {
         multiplierGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 50px; color: var(--cor-texto-suave);">Não há dados para esta data ou filtro.</div>';
         return;
    }
    
    data.forEach(item => { 
        const color = item.color;
        
        const cell = document.createElement('div');
        cell.className = `multiplier-cell color-${color} vela-${color}`;
        cell.setAttribute('data-color', color); 

        cell.innerHTML = `
            <div class="multiplier-value">${item.multiplier.toFixed(2)}x</div>
            <div class="multiplier-time">${item.time}</div>
        `;
        multiplierGrid.appendChild(cell);
    });
}

// MODIFICADO: openSlidebar agora inclui 'time-pattern-slidebar'
window.openSlidebar = function(id) {
    const slidebar = document.getElementById(id);
    slidebar.classList.add('active');
    
    if (id === 'prob-10x-slidebar') {
        render10xSlidebar();
    } else if (id === 'prob-50x-slidebar') {
        renderPinkCounts();
    } else if (id === 'pink-triggers-slidebar') { 
        renderPinkTriggersList();
    } else if (id === 'prob-5x-slidebar') { 
        render5xSlidebar(); 
    } else if (id === 'time-pattern-slidebar') {
        renderTimePatternSlidebar(); // NOVO
    }
}

window.closeSlidebar = function(id) {
    document.querySelectorAll('.slidebar.active').forEach(sb => {
        sb.classList.remove('active');
    });
}

// NOVO: Renderiza o slidebar do Padrão de Tempo Rosa
function renderTimePatternSlidebar() {
    const details = document.getElementById('time-pattern-details');
    const alert = timePatternAlert; // Usa o estado global

    details.classList.remove('active-pink-strategy');

    if (alert.status === 'ENTRADA ATIVA') {
        details.textContent = `Padrão de ${alert.patternMinutes} minutos. Alvo: ${alert.targetMinute} (ATIVO)`;
        details.classList.add('active-pink-strategy'); // Usa a cor rosa
    } else if (alert.status === 'Próximo') {
        details.textContent = `Padrão de ${alert.patternMinutes} minutos. Próximo Alvo: ${alert.targetMinute}`;
    } else {
        details.textContent = 'Nenhum padrão de tempo fixo está próximo.';
    }
}


function render10xSlidebar() {
    const list = document.getElementById('interval-list-10x');
    list.innerHTML = '';
    Object.entries(intervalFrequencies).sort((a, b) => a[0] - b[0]).forEach(([interval, count]) => {
        const li = document.createElement('li');
        li.textContent = `${interval}min (${count}x)`;
        list.appendChild(li);
    });
    if (Object.keys(intervalFrequencies).length === 0) {
        list.innerHTML = '<li>Nenhum intervalo (repetição) detectado.</li>';
    }
}

function renderPinkCounts() {
    document.getElementById('pink-below-50x').textContent = `Velas rosas inferiores a 50x (10.00x a 49.99x): ${pinkBelow50x}`;
    document.getElementById('pink-below-35x').textContent = `Velas rosas inferiores a 35x (10.00x a 34.99x): ${pinkBelow35x}`;
    document.getElementById('time-since-last-50x').textContent = `Tempo sem 50x: ${Math.round(timeSinceLast50x)} minutos`; 
    
    if (averageTimeBetween50x > 0) {
        document.getElementById('average-time-between-50x').textContent = `Tempo entre penúltimo e último 50x: ${Math.round(averageTimeBetween50x)} minutos`; 
    } else {
        document.getElementById('average-time-between-50x').textContent = `Tempo entre penúltimo e último 50x: Não disponível`;
    }
}

function render5xSlidebar() {
    const timeP = document.getElementById('time-since-last-5x');
    const avgP = document.getElementById('average-time-between-5x');
    const roundedTime = Math.round(timeSinceLast_5x);

    timeP.classList.remove('active-strategy', 'no-pattern');

    let strategyText = '';
    if (globalActive5xStrategy === '3-min') {
        strategyText = ' (Padrão de 3 minutos)';
        timeP.classList.add('active-strategy');
    } else if (globalActive5xStrategy === '5-min') {
        strategyText = ' (Padrão de 5 minutos)';
        timeP.classList.add('active-strategy');
    } else if (globalActive5xStrategy === 'average') {
        strategyText = ' (Intervalo entre penúltimo e último)';
        timeP.classList.add('active-strategy');
    } else {
        timeP.classList.add('no-pattern');
    }

    timeP.textContent = `Tempo sem 5x (≥5.00x): ${roundedTime} minutos${strategyText}`;

    if (averageTimeBetween_5x > 0) {
        avgP.textContent = `Intervalo entre penúltimo e último 5x: ${Math.round(averageTimeBetween_5x)} minutos`;
    } else {
        avgP.textContent = `Intervalo entre penúltimo e último 5x: Não disponível`;
    }
}


function updateTriggerCardUI(triggerKey) {
    const card = document.getElementById('trigger-card-pink'); 
    
    if (!triggerKey) {
        card.classList.remove('active-trigger');
        currentActiveTriggerKey = null;
        return;
    }
    
    const isRecentTrigger = recentPinkTriggers.some(trigger => trigger.multiplier.toFixed(2) === triggerKey);
    
    if (isRecentTrigger) {
        card.classList.add('active-trigger');
        currentActiveTriggerKey = triggerKey;
    } else {
        card.classList.remove('active-trigger');
        currentActiveTriggerKey = null;
    }
}

function update5xTriggerCardUI(isActive, strategy) {
    const card = document.getElementById('trigger-card-5x');
    card.classList.toggle('active-trigger', isActive);
    if (strategy === 'average') {
        card.style.backgroundColor = 'var(--cor-destaque-roxo)'; 
    } else {
        card.style.backgroundColor = ''; 
    }
}


function renderPinkTriggersList() {
    const list = document.getElementById('pink-triggers-list');
    list.querySelectorAll('li:not(.list-header)').forEach(li => li.remove());

    if (recentPinkTriggers.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'Nenhum gatilho nas últimas 2 horas.';
        list.appendChild(li);
    } else {
        recentPinkTriggers.forEach(trigger => {
            const li = document.createElement('li');
            const triggerKey = trigger.multiplier.toFixed(2);
            li.innerHTML = `<strong>${triggerKey}x</strong> <span>(às ${trigger.time})</span>`;
            
            if (currentActiveTriggerKey && triggerKey === currentActiveTriggerKey) {
                li.style.backgroundColor = 'var(--cor-destaque-rosa)';
                li.style.color = 'var(--cor-fundo-principal)';
                li.querySelector('span').style.color = 'var(--cor-fundo-principal)';
            } else {
                li.style.backgroundColor = '';
                li.style.color = 'var(--cor-texto-claro)';
                li.querySelector('span').style.color = 'var(--cor-texto-suave)';
            }

            list.appendChild(li);
        });
    }
}

function checkStrongEntry(prob10x, prob50x, latestMultiplierKey, positivePred) {
    
    const conditions = {
        prob: (prob10x >= 75 || prob50x >= 70),
        pattern: isStrongPatternActive, 
        time50x: (averageTimeBetween50x > 0 && timeSinceLast50x >= averageTimeBetween50x),
        positivePred: positivePred
    };
    
    updateStrongEntryUI(conditions);
}

function updateStrongEntryUI(conditions) {
    document.getElementById('cond-prob').classList.toggle('ok', conditions.prob);
    document.getElementById('cond-pattern').classList.toggle('ok', conditions.pattern);
    document.getElementById('cond-time50x').classList.toggle('ok', conditions.time50x);
    document.getElementById('cond-positive-pred').classList.toggle('ok', conditions.positivePred);
}

window.updateGridColumns = function() {
    const columns = document.getElementById('columns-select').value;
    multiplierGrid.style.gridTemplateColumns = `repeat(${columns}, minmax(120px, 1fr))`;
    renderDashboard(); // Re-renderiza para aplicar
}

/**
 * FUNÇÃO PRINCIPAL: Aplica todos os filtros e roda todas as lógicas
 */
window.renderDashboard = function() {
    const selectedDate = dateFilter.value;
    
    const dataByDate = historyData.filter(item => item.date === selectedDate);
    
    if (dataByDate.length === 0) {
        calculateColorAverages([]);
        updateProbability('prob-10x', 0);
        updateProbability('prob-50x', 0);
        calculateProb50x([]); 
        calculate5xStats([]); 
        checkStrongEntry(0, 0, null, false); 
        updateTriggerCardUI(null); 
        update5xTriggerCardUI(false, null); 
        globalActive5xStrategy = null; 
        
        // Reseta o novo card
        timePatternAlert = { isActive: false, status: 'Aguardando', targetMinute: null, patternMinutes: null };
        updateTimePatternCard(timePatternAlert);
        
        renderGrid([]);
        intervalFrequencies = {};
        patternStats = { multiplierTriggers: {} };
        recentPinkTriggers = []; 
        return;
    }

    // 1. CÁLCULO DAS MÉDIAS
    calculateColorAverages(dataByDate);
    
    // 2. Análise de Padrões e Backtest
    patternStats = findPatterns(dataByDate);
    findRecentPinkTriggers(dataByDate); 

    // 3. CÁLCULO DAS PROBABILIDADES E STATS
    // prob10x agora também atualiza o 'timePatternAlert' global
    let prob10x = calculateProb10x(dataByDate, patternStats); 
    let prob50x = calculateProb50x(dataByDate); 
    calculate5xStats(dataByDate); 
    
    // 4. LÓGICAS DE REDUÇÃO
    let maxReduction = 0; 
    
    // --- 4.1. Lógica de Predominância de CRASH (< 1.00x) ---
    const PREDOMINANCE_SAMPLE_SIZE_CRASH = 12;
    const PREDOMINANCE_THRESHOLD_CRASH = 7; 
    const CRASH_REDUCTION_AMOUNT = 13; 
    const last12 = dataByDate.slice(0, PREDOMINANCE_SAMPLE_SIZE_CRASH);

    if (last12.length === PREDOMINANCE_SAMPLE_SIZE_CRASH) { 
         const crashCount = last12.filter(item => item.multiplier < 1.00).length; 
         if (crashCount >= PREDOMINANCE_THRESHOLD_CRASH) { 
             maxReduction = Math.max(maxReduction, CRASH_REDUCTION_AMOUNT); 
         }
    }
    
    // --- 4.2. Lógica de Sequência de AZUL (< 2.00x) (MODIFICADO) ---
    let blueSequenceCount = 0;
    for (const item of dataByDate) {
        if (item.color === 'blue') { 
            blueSequenceCount++;
        } else {
            break; 
        }
    }
    
    let sequenceReduction = 0;
    if (blueSequenceCount >= 7) { 
        sequenceReduction = 20; 
    } else if (blueSequenceCount === 6) { 
        sequenceReduction = 17; 
    } else if (blueSequenceCount === 5) { 
        sequenceReduction = 12; 
    } else if (blueSequenceCount >= 4) { 
        sequenceReduction = 7; 
    }
    
    // --- 4.3. Lógica de Predominância AZUL/BAIXA nas Últimas 14 Velas ---
    const PREDOMINANCE_SAMPLE_SIZE_14 = 14;
    const PREDOMINANCE_THRESHOLD_14 = 8; 
    const PREDOMINANCE_REDUCTION = 12; 
    const last14 = dataByDate.slice(0, PREDOMINANCE_SAMPLE_SIZE_14);
    let predominanceReduction = 0;

    if (last14.length === PREDOMINANCE_SAMPLE_SIZE_14) { 
         const lowCount = last14.filter(item => item.color === 'blue').length; 
         
         if (lowCount >= PREDOMINANCE_THRESHOLD_14) { 
             predominanceReduction = PREDOMINANCE_REDUCTION; 
         }
    }
    
    // --- 4.4. Lógica de Predominância de Positivas (para o checklist) ---
    let positivePred = false;
    const PREDOMINANCE_SAMPLE_SIZE_POSITIVE = 10;
    const last10 = dataByDate.slice(0, PREDOMINANCE_SAMPLE_SIZE_POSITIVE);

    if (last10.length === PREDOMINANCE_SAMPLE_SIZE_POSITIVE) {
        const positiveCount = last10.filter(item => item.multiplier >= 2.00).length;
        if (positiveCount >= 6) { 
            positivePred = true;
        }
    }
    
    // 5. APLICAÇÃO FINAL DA REDUÇÃO MÁXIMA
    maxReduction = Math.max(maxReduction, sequenceReduction, predominanceReduction);

    prob10x = Math.max(0, prob10x - maxReduction);
    prob50x = Math.max(0, prob50x - maxReduction);
    
    prob10x = Math.min(90, prob10x);
    prob50x = Math.min(90, prob50x);
    
    // 6. ATUALIZAÇÃO DA INTERFACE
    updateProbability('prob-10x', prob10x);
    updateProbability('prob-50x', prob50x);
    
    // ATUALIZAÇÃO DO NOVO CARD DE TEMPO (já é chamado dentro de calculateProb10x)
    
    const latestMultiplierKey = dataByDate[0].multiplier.toFixed(2);
    
    // 7. Checa e atualiza o Sinal Forte (Checklist)
    checkStrongEntry(prob10x, prob50x, latestMultiplierKey, positivePred); 
    
    // 8. Atualiza a UI do Card de Gatilhos (Estado Ativo)
    updateTriggerCardUI(latestMultiplierKey); 
    
    // 9. MODIFICADO: Lógica de Ativação do Card 5x
    let active5xStrategy = null;
    const roundedTimeSince_5x = Math.round(timeSinceLast_5x);
    const roundedAverage_5x = Math.round(averageTimeBetween_5x);
    
    if (roundedTimeSince_5x === 3) {
        active5xStrategy = '3-min';
    } else if (roundedTimeSince_5x === 5) {
        active5xStrategy = '5-min';
    } else if (roundedAverage_5x > 0 && roundedTimeSince_5x === roundedAverage_5x) {
        active5xStrategy = 'average';
    }
    
    globalActive5xStrategy = active5xStrategy; 
    let is5xTriggerActive = (active5xStrategy !== null);
    update5xTriggerCardUI(is5xTriggerActive, active5xStrategy);
    
    // 10. FILTRAGEM E RENDERIZAÇÃO
    const finalData = filterVelas(dataByDate);
    renderGrid(finalData);
}

// ====================================================================
// 7. LISTENER FIREBASE (Ponto de entrada de dados)
// ====================================================================

onValue(ref(db, "history/"), (snapshot) => {
  const data = snapshot.val();
  if (!data) {
    historyData = [];
    renderDashboard(); 
    return;
  }
  
  let rawHistory = Object.values(data);
  
  const finalHistory = rawHistory
    .filter(item => item.multiplier && item.time && item.date)
    .map(item => {
        const multiplier = parseFloat(item.multiplier.replace('x', ''));
        return {
            multiplier: multiplier,
            time: item.time,
            date: item.date, 
            color: getVelaColor(multiplier),
            minutes: timeToMinutes(item.time) // Mantém a precisão total
        };
    })
    .reverse(); 

  historyData = finalHistory.slice(0, 100000); 
  
  renderDashboard();

});

// ====================================================================
// 8. Inicialização
// ====================================================================
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date();
    const todayDateString = formatDate(today);
    
    dateFilter.setAttribute('max', todayDateString);
    dateFilter.value = todayDateString; 
    
    // Inicializa quantidade de colunas
    const isMobile = window.innerWidth <= 768;
    document.getElementById('columns-select').value = isMobile ? 3 : 7;
    updateGridColumns();
    
    renderDashboard();

    // Ajuste inicial de colunas baseado em tela
    window.addEventListener('resize', () => {
        const isMobile = window.innerWidth <= 768;
        document.getElementById('columns-select').value = isMobile ? 3 : 7;
        updateGridColumns();
    });
});