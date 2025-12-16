// --- KONFIGURASJON OG DATA ---

// En slangeformet vei som går frem og tilbake
const path = [
    {x: 0, y: 100},
    {x: 700, y: 100},
    {x: 700, y: 250},
    {x: 100, y: 250},
    {x: 100, y: 400},
    {x: 700, y: 400},
    {x: 700, y: 550},
    {x: 800, y: 550}
];

const synonymList = [
    ["Glad", "Lykkelig"], ["Trist", "Lei"], ["Stor", "Svær"], ["Liten", "Små"], ["Rask", "Hurtig"],
    ["Treg", "Langsom"], ["Varm", "Het"], ["Kald", "Kjølig"], ["Vakker", "Pen"], ["Stygg", "Hesselig"],
    ["Rik", "Velstående"], ["Fattig", "Ubemidlet"], ["Smart", "Klok"], ["Dum", "Uvitende"],
    ["Sulten", "Matlei"], ["Tørst", "Drikkesugen"], ["Sinte", "Vrede"], ["Redd", "Engstelig"],
    ["Modig", "Tapper"], ["Sterk", "Kraftig"], ["Begynne", "Starte"], ["Slutte", "Avslutte"],
    ["Løpe", "Springe"], ["Gå", "Vandre"], ["Spise", "Eta"], ["Sove", "Hvile"], ["Bil", "Kjøretøy"],
    ["Hus", "Bolig"], ["Venn", "Kamerat"], ["Fiende", "Motstander"]
];

const antonymList = [
    ["Glad", "Trist"], ["Stor", "Liten"], ["Rask", "Treg"], ["Varm", "Kald"], ["Vakker", "Stygg"],
    ["Rik", "Fattig"], ["Smart", "Dum"], ["Sulten", "Mett"], ["Sint", "Blid"], ["Redd", "Modig"],
    ["Sterk", "Svak"], ["Høy", "Lav"], ["Tynn", "Tykk"], ["Gammel", "Ung"], ["Begynne", "Slutte"],
    ["Løpe", "Stå"], ["Sove", "Våke"], ["Venn", "Fiende"], ["Dag", "Natt"], ["Lys", "Mørke"],
    ["Opp", "Ned"], ["Inn", "Ut"], ["Ja", "Nei"], ["Svart", "Hvit"], ["Liv", "Død"],
    ["Sommer", "Vinter"], ["Kjærlighet", "Hat"], ["Krig", "Fred"]
];

const TOWER_STATS = {
    basic: { range: 160, damage: 20, rate: 40, icon: "🏹", name: "Bueskytter", color: "brown" },
    sniper: { range: 400, damage: 100, rate: 120, icon: "💣", name: "Kanon", color: "black" },
    ice: { range: 130, damage: 5, rate: 45, icon: "❄️", name: "Frost", effect: "slow", color: "cyan" }
};
const TOWER_COSTS = { basic: 50, sniper: 120, ice: 100 };

// --- GLOBALE VARIABLER ---
let canvas, ctx;
let gameMode = "synonym";
let gameState = "menu"; // menu, playing, quiz
let gold = 350;
let lives = 20;
let wave = 0;
let waveActive = false;
let selectedTower = "basic";

// Lister for spillobjekter
let enemies = [];
let towers = [];
let projectiles = [];
let floatingTexts = [];

// For bygge-logikk
let pendingTowerLocation = null;

// --- OPPSTART ---
window.onload = function() {
    console.log("Spillet laster...");
    canvas = document.getElementById("gameCanvas");
    if (!canvas) {
        alert("Feil: Fant ikke spillbrettet (canvas). Sjekk HTML-filen.");
        return;
    }
    ctx = canvas.getContext("2d");

    // Start spill-loopen med en gang
    requestAnimationFrame(gameLoop);
    console.log("Spillet er klart.");
};

// --- HOVEDSPILL-LOOP ---
function gameLoop() {
    // 1. Rens skjermen
    if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (gameState === "playing" || gameState === "quiz") {
            drawMap();          // Tegn vei
            updateEnemies();    // Flytt og tegn fiender
            updateTowers();     // Tårn skyter
            updateProjectiles();// Prosjektiler flyr
            updateTexts();      // Skadetall flyr
            drawUIOverlay();    // Beskjeder
        }
    }
    
    // Fortsett loopen
    requestAnimationFrame(gameLoop);
}

// --- SPILL-LOGIKK ---

function startGame(mode) {
    console.log("Starter spill i modus:", mode);
    gameMode = mode;
    gameState = "playing";
    
    // Skjul meny, vis spill
    document.getElementById("menu").classList.remove("active");
    document.getElementById("game-container").classList.add("active");
    
    // Nullstill alt
    gold = 400;
    lives = 20;
    wave = 0;
    enemies = [];
    towers = [];
    projectiles = [];
    floatingTexts = [];
    waveActive = false;
    
    // Aktiver klikk på canvas
    canvas.onmousedown = handleCanvasClick;
    
    updateUI();
}

function startNextWave() {
    if (waveActive) return;
    
    wave++;
    waveActive = true;
    updateUI();
    document.getElementById("start-wave-btn").disabled = true;
    showMessage(`Bølge ${wave} starter!`);

    let count = 5 + Math.floor(wave * 1.5); // Antall fiender
    let spawnCount = 0;

    // Start spawning
    let spawnInterval = setInterval(() => {
        if (lives <= 0) { clearInterval(spawnInterval); return; }
        
        spawnEnemy();
        spawnCount++;

        if (spawnCount >= count) {
            clearInterval(spawnInterval);
            // Overvåk når bølgen er ferdig
            monitorWaveEnd();
        }
    }, 1200); // Tid mellom hver fiende
}

function spawnEnemy() {
    let type = 'normal';
    let r = Math.random();
    // Vanskelighetsgrad
    if (wave > 1 && r < 0.4) type = 'fast';
    if (wave > 3 && r < 0.2) type = 'tank';
    if (wave > 5 && r < 0.2) type = 'stealth';

    enemies.push(new Enemy(type));
}

function monitorWaveEnd() {
    let checker = setInterval(() => {
        // Hvis bølgen er aktiv, men ingen fiender er igjen
        if (waveActive && enemies.length === 0) {
            waveActive = false;
            showMessage("Bølge fullført!");
            document.getElementById("start-wave-btn").disabled = false;
            clearInterval(checker);
        }
        // Hvis spillet er slutt
        if (lives <= 0) clearInterval(checker);
    }, 1000);
}

// --- KLASSER (Fiender, Tårn, etc) ---

class Enemy {
    constructor(type) {
        this.type = type;
        this.pathIndex = 0;
        this.x = path[0].x;
        this.y = path[0].y;
        
        // Stats
        if (type === 'fast') { this.speed = 3; this.hp = 30; this.icon = "⚡"; this.reward = 15; }
        else if (type === 'tank') { this.speed = 1; this.hp = 200; this.icon = "👹"; this.reward = 30; }
        else if (type === 'stealth') { this.speed = 2; this.hp = 50; this.icon = "👻"; this.reward = 20; }
        else { this.speed = 1.5; this.hp = 60; this.icon = "👾"; this.reward = 10; } // Normal
        
        this.maxHp = this.hp;
        this.slowed = 0;
        this.invisible = false;
        this.stealthTimer = 0;
    }

    update() {
        // Stealth effekt
        if (this.type === 'stealth') {
            this.stealthTimer++;
            this.invisible = (this.stealthTimer % 200 < 100);
        }

        // Slow effekt
        let currentSpeed = this.speed;
        if (this.slowed > 0) {
            currentSpeed *= 0.5;
            this.slowed--;
        }

        // Bevegelse mot neste punkt
        let target = path[this.pathIndex + 1];
        if (!target) {
            this.hp = 0; // Nådde slutten
            lives--;
            addFloatingText(this.x, this.y, "💔", "red");
            updateUI();
            return;
        }

        let dx = target.x - this.x;
        let dy = target.y - this.y;
        let dist = Math.hypot(dx, dy);

        if (dist < currentSpeed) {
            this.x = target.x;
            this.y = target.y;
            this.pathIndex++;
        } else {
            this.x += (dx / dist) * currentSpeed;
            this.y += (dy / dist) * currentSpeed;
        }
    }

    draw() {
        // Ikon
        ctx.font = "30px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (this.invisible) ctx.globalAlpha = 0.3;
        ctx.fillText(this.icon, this.x, this.y);
        ctx.globalAlpha = 1.0;

        // Helsebar
        let pct = this.hp / this.maxHp;
        ctx.fillStyle = "red";
        ctx.fillRect(this.x - 15, this.y - 25, 30, 5);
        ctx.fillStyle = "#0f0";
        ctx.fillRect(this.x - 15, this.y - 25, 30 * pct, 5);
    }
}

class Tower {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.stats = { ...TOWER_STATS[type] };
        this.cooldown = 0;
        this.level = 1;
    }

    update() {
        if (this.cooldown > 0) this.cooldown--;

        // Finn nærmeste fiende
        let target = null;
        let minDesc = this.stats.range; // Må være innenfor range

        for (let e of enemies) {
            if (e.invisible) continue;
            let d = Math.hypot(e.x - this.x, e.y - this.y);
            if (d < minDesc) {
                minDesc = d;
                target = e;
            }
        }

        if (target && this.cooldown <= 0) {
            // Skyt!
            projectiles.push({
                x: this.x, y: this.y - 10,
                target: target,
                damage: this.stats.damage,
                effect: this.stats.effect,
                color: this.stats.color,
                speed: 10
            });
            this.cooldown = this.stats.rate;
        }
    }

    draw() {
        // Base
        ctx.fillStyle = "#333";
        ctx.beginPath(); ctx.arc(this.x, this.y, 20, 0, Math.PI*2); ctx.fill();
        
        // Ikon
        ctx.font = "30px Arial";
        ctx.fillText(this.stats.icon, this.x, this.y);
        
        // Level
        ctx.fillStyle = "white";
        ctx.font = "12px Arial";
        ctx.fillText("⭐" + this.level, this.x, this.y - 20);
    }

    upgrade() {
        if (gold >= 100) {
            gold -= 100;
            this.level++;
            this.stats.damage = Math.floor(this.stats.damage * 1.3);
            this.stats.rate = Math.floor(this.stats.rate * 0.9);
            updateUI();
            addFloatingText(this.x, this.y - 30, "UPGRADE!", "#ffd700");
        } else {
            showMessage("Mangler gull (100g)");
        }
    }
}

// --- TEGNING AV KART ---
function drawMap() {
    // Tegn vei
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    // Kant
    ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 60;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let p of path) ctx.lineTo(p.x, p.y);
    ctx.stroke();

    // Innside
    ctx.strokeStyle = "#d7ccc8"; ctx.lineWidth = 50;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let p of path) ctx.lineTo(p.x, p.y);
    ctx.stroke();
}

// --- OPPDATERINGSFUNKSJONER ---
function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].update();
        enemies[i].draw();
        if (enemies[i].hp <= 0) {
            gold += enemies[i].reward;
            addFloatingText(enemies[i].x, enemies[i].y, "+" + enemies[i].reward, "gold");
            enemies.splice(i, 1);
            updateUI();
        }
    }
}

function updateTowers() {
    for (let t of towers) {
        t.update();
        t.draw();
    }
}

function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        let p = projectiles[i];
        let t = p.target;
        
        // Bevegelse
        let dx = t.x - p.x;
        let dy = t.y - p.y;
        let dist = Math.hypot(dx, dy);

        if (dist < p.speed) {
            // Treff!
            t.hp -= p.damage;
            if (p.effect === 'slow') t.slowed = 100;
            addFloatingText(t.x, t.y - 20, p.damage, "white");
            projectiles.splice(i, 1);
        } else {
            p.x += (dx / dist) * p.speed;
            p.y += (dy / dist) * p.speed;
            
            // Tegn
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI*2); ctx.fill();
        }
    }
}

function updateTexts() {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        let ft = floatingTexts[i];
        ft.y -= 1;
        ft.life -= 0.02;
        
        ctx.globalAlpha = Math.max(0, ft.life);
        ctx.fillStyle = ft.color;
        ctx.font = "bold 20px Arial";
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1.0;

        if (ft.life <= 0) floatingTexts.splice(i, 1);
    }
}

function addFloatingText(x, y, text, color) {
    floatingTexts.push({x, y, text, color, life: 1.0});
}

// --- KLIKK OG INTERAKSJON ---
function selectTowerType(type) {
    selectedTower = type;
    // Visuell markering
    document.querySelectorAll('.tower-card').forEach(el => el.classList.remove('selected'));
    // Finn knappen som ble trykket (litt hacky selector, men funker)
    let cards = document.querySelectorAll('.tower-card');
    if(type === 'basic') cards[0].classList.add('selected');
    if(type === 'sniper') cards[1].classList.add('selected');
    if(type === 'ice') cards[2].classList.add('selected');
    
    showMessage(`Valgt: ${TOWER_STATS[type].name}`);
}

function handleCanvasClick(e) {
    // Beregn nøyaktig mus-posisjon
    let rect = canvas.getBoundingClientRect();
    let x = (e.clientX - rect.left) * (canvas.width / rect.width);
    let y = (e.clientY - rect.top) * (canvas.height / rect.height);

    // 1. Sjekk om vi trykker på et eksisterende tårn (for oppgradering)
    for (let t of towers) {
        if (Math.hypot(t.x - x, t.y - y) < 30) {
            t.upgrade();
            return;
        }
    }

    // 2. Sjekk om bølgen er aktiv (KRAV: Må ha fiender for å bygge)
    if (!waveActive) {
        showMessage("Start bølgen for å bygge!");
        return;
    }

    // 3. Sjekk penger
    if (gold < TOWER_COSTS[selectedTower]) {
        showMessage("Ikke nok penger!");
        return;
    }

    // Alt ok -> Start Quiz
    pendingTowerLocation = {x, y};
    startQuiz();
}

function startQuiz() {
    gameState = "quiz"; // Stopper ikke loopen visuelt, men logisk skiller vi kanskje?
    // Egentlig vil vi at spillet skal fortsette bak i denne versjonen
    // Men la oss vise modalen
    
    let list = (gameMode === 'synonym') ? synonymList : antonymList;
    let pair = list[Math.floor(Math.random() * list.length)];
    let qWord = pair[0];
    let aWord = pair[1];
    
    // Lag alternativer
    let options = [aWord];
    while(options.length < 3) {
        let rand = list[Math.floor(Math.random() * list.length)][1];
        if (!options.includes(rand)) options.push(rand);
    }
    options.sort(() => Math.random() - 0.5);

    document.getElementById("quiz-question").innerText = 
        `Hva er ${gameMode === 'synonym' ? 'synonymet' : 'antonymet'} til "${qWord}"?`;
    
    let container = document.getElementById("quiz-options");
    container.innerHTML = "";
    
    options.forEach(opt => {
        let btn = document.createElement("button");
        btn.className = "quiz-option";
        btn.innerText = opt;
        btn.onclick = () => answerQuiz(opt === aWord);
        container.appendChild(btn);
    });

    document.getElementById("quiz-modal").style.display = "flex";
}

function answerQuiz(correct) {
    document.getElementById("quiz-modal").style.display = "none";
    gameState = "playing"; // Fortsett normal status
    
    if (correct) {
        // Bygg tårn
        gold -= TOWER_COSTS[selectedTower];
        towers.push(new Tower(pendingTowerLocation.x, pendingTowerLocation.y, selectedTower));
        addFloatingText(pendingTowerLocation.x, pendingTowerLocation.y, "BYGGET!", "#0f0");
        updateUI();
    } else {
        showMessage("Feil svar!");
        addFloatingText(pendingTowerLocation.x, pendingTowerLocation.y, "FEIL!", "red");
    }
}

// --- HJELPEFUNKSJONER ---
function showMessage(msg) {
    let el = document.getElement
