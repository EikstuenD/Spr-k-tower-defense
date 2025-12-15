// --- DATA: ORDLISTER (Samme som før) ---
const synonymList = [
    ["Glad", "Lykkelig"], ["Trist", "Lei"], ["Stor", "Svær"], ["Liten", "Små"], ["Rask", "Hurtig"],
    ["Treg", "Langsom"], ["Varm", "Het"], ["Kald", "Kjølig"], ["Vakker", "Pen"], ["Stygg", "Hesselig"],
    ["Rik", "Velstående"], ["Fattig", "Ubemidlet"], ["Smart", "Klok"], ["Dum", "Uvitende"], ["Sulten", "Matlei"],
    ["Tørst", "Drikkesugen"], ["Sinte", "Vrede"], ["Redd", "Engstelig"], ["Modig", "Tapper"], ["Sterk", "Kraftig"],
    ["Svak", "Skjør"], ["Høy", "Ruvande"], ["Lav", "Kort"], ["Tynn", "Slank"], ["Tykk", "Feit"],
    ["Gammel", "Eldgammel"], ["Ung", "Ny"], ["Begynne", "Starte"], ["Slutte", "Avslutte"], ["Løpe", "Springe"],
    ["Gå", "Vandre"], ["Spise", "Eta"], ["Drikke", "Sup"], ["Sove", "Hvile"], ["Våkne", "Stå opp"],
    ["Bil", "Kjøretøy"], ["Hus", "Bolig"], ["Venn", "Kamerat"], ["Fiende", "Motstander"], ["Gave", "Presang"]
];
const antonymList = [
    ["Glad", "Trist"], ["Stor", "Liten"], ["Rask", "Treg"], ["Varm", "Kald"], ["Vakker", "Stygg"],
    ["Rik", "Fattig"], ["Smart", "Dum"], ["Sulten", "Mett"], ["Sint", "Blid"], ["Redd", "Modig"],
    ["Sterk", "Svak"], ["Høy", "Lav"], ["Tynn", "Tykk"], ["Gammel", "Ung"], ["Begynne", "Slutte"],
    ["Løpe", "Stå"], ["Sove", "Våke"], ["Venn", "Fiende"], ["Dag", "Natt"], ["Lys", "Mørke"],
    ["Opp", "Ned"], ["Inn", "Ut"], ["Høyre", "Venstre"], ["Foran", "Bak"], ["Over", "Under"],
    ["Alltid", "Aldri"], ["Alt", "Ingenting"], ["Ja", "Nei"], ["Svart", "Hvit"], ["Hard", "Myk"],
    ["Tørr", "Våt"], ["Ren", "Skitten"], ["Billig", "Dyr"], ["Lett", "Tung"], ["Frisk", "Syk"],
    ["Liv", "Død"], ["Himling", "Gulv"], ["Sommer", "Vinter"], ["Kjærlighet", "Hat"], ["Krig", "Fred"]
];

// --- SPILLVARIABLER ---
let canvas, ctx;
let gameMode = "";
let gameState = "menu";
let gold = 300;
let lives = 20;
let wave = 0;
let waveActive = false;
let enemies = [];
let towers = [];
let projectiles = [];
let floatingTexts = []; // NY: For skadetall
let frameCount = 0;
let selectedTower = "basic";
let pendingTowerLocation = null;

// NY: En mer kronglete vei (Snake pattern)
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

// KONFIGURASJON
const TOWER_COSTS = { basic: 50, sniper: 120, ice: 100 };
// Oppdaterte stats med emojis
const TOWER_STATS = {
    basic: { range: 160, damage: 15, rate: 35, icon: "🏹", name: "Bueskytter", projectileColor: "brown" },
    sniper: { range: 400, damage: 80, rate: 120, icon: "💣", name: "Kanon", projectileColor: "black" },
    ice: { range: 130, damage: 5, rate: 45, icon: "❄️", name: "Frost", effect: "slow", projectileColor: "cyan" }
};

// --- KLASSER ---

// NY KLASSE: Flytende tekst (skadetall)
class FloatingText {
    constructor(x, y, text, color, size = 20) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.size = size;
        this.life = 1.0; // Opacity
        this.vy = -1; // Fart oppover
    }
    update() {
        this.y += this.vy;
        this.life -= 0.02; // Fade out speed
    }
    draw() {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.font = `bold ${this.size}px Arial`;
        ctx.strokeStyle = "black";
        ctx.lineWidth = 3;
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillText(this.text, this.x, this.y);
        ctx.globalAlpha = 1.0;
    }
}

class Enemy {
    constructor(type) {
        this.type = type;
        this.pathIndex = 0;
        this.x = path[0].x;
        this.y = path[0].y;
        
        // Setup visuals og stats basert på type
        if (type === 'fast') { 
            this.speed = 3.5; this.hp = 30; this.icon = "⚡"; this.reward = 15;
        } else if (type === 'tank') { 
            this.speed = 0.8; this.hp = 200; this.icon = "👹"; this.reward = 30;
        } else if (type === 'stealth') { 
            this.speed = 2.2; this.hp = 50; this.icon = "👻"; this.reward = 20; this.stealthTimer = 0; 
        } else { 
            this.speed = 1.8; this.hp = 60; this.icon = "👾"; this.reward = 10;
        }
        
        this.maxHp = this.hp;
        this.slowed = 0;
        this.invisible = false;
    }

    update() {
        // Stealth logikk
        if (this.type === 'stealth') {
            this.stealthTimer++;
            if (this.stealthTimer % 200 < 100) {
                this.invisible = true;
            } else {
                this.invisible = false;
            }
        }

        // Slow logikk
        let currentSpeed = this.speed;
        if (this.slowed > 0) {
            currentSpeed *= 0.5;
            this.slowed--;
            // Vis is-effekt
            if(Math.random() < 0.1) floatingTexts.push(new FloatingText(this.x, this.y, "❄️", "cyan", 15));
        }

        // Bevegelse
        const target = path[this.pathIndex + 1];
        if (!target) {
            this.hp = 0; 
            lives--;
            floatingTexts.push(new FloatingText(this.x, this.y, "-1 LIV", "red", 30));
            updateUI();
            return;
        }

        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy);

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
        // Tegn monster (Emoji)
        ctx.font = "30px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        if (this.invisible) ctx.globalAlpha = 0.3;
        ctx.fillText(this.icon, this.x, this.y);
        ctx.globalAlpha = 1.0;
        
        // Helsebar (Forbedret)
        const barWidth = 40;
        const barHeight = 6;
        const hpPercent = this.hp / this.maxHp;
        
        ctx.fillStyle = "black";
        ctx.fillRect(this.x - barWidth/2, this.y - 25, barWidth, barHeight);
        
        // Farge basert på HP (Grønn -> Gul -> Rød)
        let hpColor = "#2ecc71";
        if (hpPercent < 0.6) hpColor = "#f1c40f";
        if (hpPercent < 0.3) hpColor = "#e74c3c";
        
        ctx.fillStyle = hpColor;
        ctx.fillRect(this.x - barWidth/2 + 1, this.y - 24, (barWidth-2) * hpPercent, barHeight-2);
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

        let target = null;
        let minDesc = Infinity;

        for (let e of enemies) {
            if (e.invisible) continue;
            const dist = Math.hypot(e.x - this.x, e.y - this.y);
            if (dist <= this.stats.range) {
                if (dist < minDesc) {
                    minDesc = dist;
                    target = e;
                }
            }
        }

        if (target && this.cooldown <= 0) {
            this.shoot(target);
            this.cooldown = this.stats.rate;
        }
    }

    shoot(target) {
        projectiles.push({
            x: this.x, y: this.y - 10,
            target: target,
            damage: this.stats.damage,
            effect: this.stats.effect,
            speed: 12,
            color: this.stats.projectileColor
        });
    }

    draw() {
        // Tegn rekkevidde hvis musa er i nærheten (enkel sjekk kan legges til senere)
        
        // Tegn base
        ctx.fillStyle = "#555";
        ctx.beginPath();
        ctx.ellipse(this.x, this.y+10, 15, 8, 0, 0, Math.PI*2);
        ctx.fill();

        // Tegn tårn-ikon
        ctx.font = "35px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(this.stats.icon, this.x, this.y);

        // Level
        ctx.fillStyle = "white";
        ctx.font = "bold 12px Arial";
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.strokeText("⭐" + this.level, this.x, this.y - 20);
        ctx.fillText("⭐" + this.level, this.x, this.y - 20);
    }

    upgrade() {
        if (gold >= 100) {
            gold -= 100;
            this.level++;
            this.stats.damage = Math.floor(this.stats.damage * 1.3);
            this.stats.rate = Math.floor(this.stats.rate * 0.9);
            updateUI();
            floatingTexts.push(new FloatingText(this.x, this.y - 40, "OPPGRADERT!", "#f1c40f"));
        } else {
            showMessage("Mangler gull (100g)!");
        }
    }
}

// --- LOGIKK OG LOOP ---

function startGame(mode) {
    gameMode = mode;
    document.getElementById("menu").classList.remove("active");
    document.getElementById("game-container").classList.add("active");
    canvas = document.getElementById("gameCanvas");
    ctx = canvas.getContext("2d");
    canvas.addEventListener('mousedown', handleCanvasClick);

    // Reset
    gold = 350; // Litt mer startgull
    lives = 20;
    wave = 0;
    enemies = [];
    towers = [];
    projectiles = [];
    floatingTexts = [];
    waveActive = false;
    
    updateUI();
    gameState = "playing";
    gameLoop();
}

function gameLoop() {
    if (gameState === "playing") {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        drawMap();
        updateEnemies();
        updateTowers();
        updateProjectiles();
        updateFloatingText();
        
        drawUIOverlay();
        frameCount++;
    }
    requestAnimationFrame(gameLoop);
}

// Oppdatert drawMap for å tegne vei
function drawMap() {
    // Tegn selve veien
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    // Kantlinje på veien
    ctx.strokeStyle = "#5d4037"; // Mørk brun
    ctx.lineWidth = 60;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let p of path) ctx.lineTo(p.x, p.y);
    ctx.stroke();

    // Vei-fyll
    ctx.strokeStyle = "#d7ccc8"; // Sandfarge
    ctx.lineWidth = 50;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let p of path) ctx.lineTo(p.x, p.y);
    ctx.stroke();

    // Tegn objekter
    enemies.forEach(e => e.draw());
    towers.forEach(t => t.draw());
}

function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        let p = projectiles[i];
        let t = p.target;
        
        let dx = t.x - p.x;
        let dy = t.y - p.y;
        let dist = Math.hypot(dx, dy);
        
        if (dist < p.speed) {
            // TREFF
            t.hp -= p.damage;
            
            // Lag skadetall
            floatingTexts.push(new FloatingText(t.x, t.y - 20, p.damage, "white"));

            if (p.effect === 'slow') {
                t.slowed = 90; // 1.5 sekunder
                floatingTexts.push(new FloatingText(t.x, t.y, "SLOW", "cyan", 15));
            }

            projectiles.splice(i, 1);
        } else {
            p.x += (dx / dist) * p.speed;
            p.y += (dy / dist) * p.speed;
            
            // Tegn prosjektil
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function updateFloatingText() {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        floatingTexts[i].update();
        floatingTexts[i].draw();
        if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
    }
}

function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].update();
        if (enemies[i].hp <= 0) {
            gold += enemies[i].reward;
            
            // Døds-effekt tekst
            floatingTexts.push(new FloatingText(enemies[i].x, enemies[i].y, `+${enemies[i].reward}g`, "#f1c40f", 25));
            
            enemies.splice(i, 1);
            updateUI();
        }
    }
}

// --- RESTERENDE FUNKSJONER (Bølger, Klikk, Quiz) ---
// Disse er ganske like som før, men jeg inkluderer dem for at filen skal være komplett.

function startNextWave() {
    if (waveActive) return;
    wave++;
    waveActive = true;
    updateUI();
    
    let count = 6 + Math.floor(wave * 1.5);
    let spawnCounter = 0;
    
    let spawner = setInterval(() => {
        if (lives <= 0) { clearInterval(spawner); return; }
        
        let type = 'normal';
        let r = Math.random();
        
        // Vanskeligere bølger
        if (wave > 1 && r < 0.4) type = 'fast';
        if (wave > 3 && r < 0.2) type = 'tank';
        if (wave > 5 && r < 0.2) type = 'stealth';
        
        enemies.push(new Enemy(type));
        spawnCounter++;
        
        if (spawnCounter >= count) {
            clearInterval(spawner);
            let checkEnd = setInterval(() => {
                if (enemies.length === 0) {
                    waveActive = false;
                    showMessage(`Bølge ${wave} fullført!`);
                    clearInterval(checkEnd);
                    document.getElementById("start-wave-btn").disabled = false;
                    updateUI();
                }
            }, 1000);
        }
    }, 1200); // Litt lengre tid mellom monstre
    
    document.getElementById("start-wave-btn").disabled = true;
}

function handleCanvasClick(e) {
    const rect = canvas.getBoundingClientRect();
    // Skaler mus-koordinatene korrekt hvis CSS endrer størrelsen
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Sjekk oppgradering
    for (let t of towers) {
        if (Math.hypot(t.x - x, t.y - y) < 30) {
            t.upgrade();
            return;
        }
    }

    if (!waveActive) {
        showMessage("Start bølgen for å bygge!");
        return;
    }
    if (gold < TOWER_COSTS[selectedTower]) {
        showMessage("Ikke nok gull!");
        return;
    }

    // Ikke bygg oppå veien
    if (ctx.isPointInStroke(new Path2D(), x, y)) { 
        // Enkel sjekk (dette er litt vanskeligere med Snake path, 
        // så vi forenkler ved å bare tillate bygging overalt foreløpig, 
        // men du kan legge til sjekk mot path-koordinater her om du vil)
    }

    pendingTowerLocation = { x, y };
    startQuiz();
}

function selectTowerType(type) {
    selectedTower = type;
    showMessage(`Valgt: ${TOWER_STATS[type].name}`);
}

function startQuiz() {
    gameState = "quiz"; // Pauser input, men loopen går
    const list = gameMode === 'synonym' ? synonymList : antonymList;
    const pair = list[Math.floor(Math.random() * list.length)];
    const questionWord = pair[0];
    const correctWord = pair[1];
    
    let options = [correctWord];
    while (options.length < 3) {
        let randomPair = list[Math.floor(Math.random() * list.length)];
        let word = randomPair[1];
        if (!options.includes(word)) options.push(word);
    }
    options.sort(() => Math.random() - 0.5);

    document.getElementById("quiz-question").innerText = 
        `Hva er ${gameMode === 'synonym' ? 'synonymet' : 'antonymet'} til "${questionWord}"?`;
    
    const optsDiv = document.getElementById("quiz-options");
    optsDiv.innerHTML = "";
    
    options.forEach(opt => {
        let btn = document.createElement("button");
        btn.className = "quiz-option";
        btn.innerText = opt;
        btn.onclick = () => answerQuiz(opt === correctWord);
        optsDiv.appendChild(btn);
    });
    document.getElementById("quiz-modal").style.display = "flex";
}

function answerQuiz(isCorrect) {
    document.getElementById("quiz-modal").style.display = "none";
    gameState = "playing";
    
    if (isCorrect) {
        gold -= TOWER_COSTS[selectedTower];
        towers.push(new Tower(pendingTowerLocation.x, pendingTowerLocation.y, selectedTower));
        floatingTexts.push(new FloatingText(pendingTowerLocation.x, pendingTowerLocation.y - 30, "BYGGET!", "#2ecc71"));
        updateUI();
    } else {
        floatingTexts.push(new FloatingText(pendingTowerLocation.x, pendingTowerLocation.y - 30, "FEIL!", "red"));
    }
}

function showMessage(msg) {
    const el = document.getElementById("message-area");
    el.innerText = msg;
    el.style.opacity = 1;
    setTimeout(() => { el.innerText = ""; }, 2500);
}

function updateUI() {
    document.getElementById("gold-display").innerText = gold;
    document.getElementById("lives-display").innerText = lives;
    document.getElementById("wave-display").innerText = wave;
    if (lives <= 0) {
        alert("GAME OVER! Du klarte " + wave + " bølger.");
        location.reload();
    }
}

function drawUIOverlay() {
    if (!waveActive) {
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(0,0,canvas.width, 50);
        ctx.fillStyle = "white";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Forbered deg! Trykk 'START BØLGE'", canvas.width/2, 32);
    }
}
