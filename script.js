// --- DATA: ORDLISTER ---
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
let floatingTexts = [];
let selectedTower = "basic";
let pendingTowerLocation = null;

// Enklere slangevei (Sikrer at den holder seg innenfor 800x600)
const path = [
    {x: 0, y: 150},
    {x: 700, y: 150},
    {x: 700, y: 300},
    {x: 100, y: 300},
    {x: 100, y: 450},
    {x: 800, y: 450}
];

const TOWER_COSTS = { basic: 50, sniper: 120, ice: 100 };
const TOWER_STATS = {
    basic: { range: 160, damage: 15, rate: 35, icon: "🏹", name: "Bueskytter", projectileColor: "brown" },
    sniper: { range: 400, damage: 80, rate: 120, icon: "💣", name: "Kanon", projectileColor: "black" },
    ice: { range: 130, damage: 5, rate: 45, icon: "❄️", name: "Frost", effect: "slow", projectileColor: "cyan" }
};

// --- KLASSER ---

class FloatingText {
    constructor(x, y, text, color, size = 20) {
        this.x = x; this.y = y; this.text = text;
        this.color = color; this.size = size;
        this.life = 1.0; this.vy = -1;
    }
    update() { this.y += this.vy; this.life -= 0.02; }
    draw() {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.font = `bold ${this.size}px Arial`;
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
        
        if (type === 'fast') { this.speed = 3.5; this.hp = 30; this.icon = "⚡"; this.reward = 15; }
        else if (type === 'tank') { this.speed = 0.8; this.hp = 200; this.icon = "👹"; this.reward = 30; }
        else if (type === 'stealth') { this.speed = 2.2; this.hp = 50; this.icon = "👻"; this.reward = 20; this.stealthTimer = 0; }
        else { this.speed = 1.8; this.hp = 60; this.icon = "👾"; this.reward = 10; }
        
        this.maxHp = this.hp;
        this.slowed = 0;
        this.invisible = false;
    }

    update() {
        if (this.type === 'stealth') {
            this.stealthTimer++;
            this.invisible = (this.stealthTimer % 200 < 100);
        }

        let currentSpeed = this.speed;
        if (this.slowed > 0) { currentSpeed *= 0.5; this.slowed--; }

        const target = path[this.pathIndex + 1];
        if (!target) {
            this.hp = 0; lives--;
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
        ctx.font = "30px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (this.invisible) ctx.globalAlpha = 0.3;
        ctx.fillText(this.icon, this.x, this.y);
        ctx.globalAlpha = 1.0;
        
        // Helsebar
        const hpPercent = this.hp / this.maxHp;
        ctx.fillStyle = "red";
        ctx.fillRect(this.x - 20, this.y - 25, 40, 6);
        ctx.fillStyle = "#2ecc71";
        ctx.fillRect(this.x - 20, this.y - 25, 40 * hpPercent, 6);
    }
}

class Tower {
    constructor(x, y, type) {
        this.x = x; this.y = y; this.type = type;
        this.stats = { ...TOWER_STATS[type] };
        this.cooldown = 0; this.level = 1;
    }

    update() {
        if (this.cooldown > 0) this.cooldown--;
        let target = null;
        let minDesc = Infinity;

        for (let e of enemies) {
            if (e.invisible) continue;
            const dist = Math.hypot(e.x - this.x, e.y - this.y);
            if (dist <= this.stats.range && dist < minDesc) {
                minDesc = dist;
                target = e;
            }
        }

        if (target && this.cooldown <= 0) {
            this.shoot(target);
            this.cooldown = this.stats.rate;
        }
    }

    shoot(target) {
        projectiles.push({
            x: this.x, y: this.y - 10, target: target,
            damage: this.stats.damage, effect: this.stats.effect,
            speed: 12, color: this.stats.projectileColor
        });
    }

    draw() {
        // Sirkel bakgrunn
        ctx.fillStyle = "#444";
        ctx.beginPath();
        ctx.arc(this.x, this.y, 20, 0, Math.PI*2);
        ctx.fill();

        ctx.font = "35px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(this.stats.icon, this.x, this.y);

        ctx.fillStyle = "white";
        ctx.font = "12px Arial";
        ctx.fillText("⭐" + this.level, this.x, this.y - 25);
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

// --- HOVEDFUNKSJONER ---

function startGame(mode) {
    gameMode = mode;
    document.getElementById("menu").classList.remove("active");
    document.getElementById("game-container").classList.add("active");
    
    canvas = document.getElementById("gameCanvas");
    ctx = canvas.getContext("2d");
    
    // Fjern eventuelle gamle lyttere og legg til ny
    canvas.removeEventListener('mousedown', handleCanvasClick);
    canvas.addEventListener('mousedown', handleCanvasClick);

    gold = 350; lives = 20; wave = 0;
    enemies = []; towers = []; projectiles = []; floatingTexts = [];
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
        
        // Flytende tekst
        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            floatingTexts[i].update();
            floatingTexts[i].draw();
            if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
        }

        drawUIOverlay();
    }
    requestAnimationFrame(gameLoop);
}

function drawMap() {
    // Tegn veien
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    
    // Kantlinje
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

    enemies.forEach(e => e.draw());
    towers.forEach(t => t.draw());
}

function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].update();
        if (enemies[i].hp <= 0) {
            gold += enemies[i].reward;
            floatingTexts.push(new FloatingText(enemies[i].x, enemies[i].y, `+${enemies[i].reward}g`, "#f1c40f"));
            enemies.splice(i, 1);
            updateUI();
        }
    }
}

function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        let p = projectiles[i];
        let t = p.target;
        
        let dx = t.x - p.x;
        let dy = t.y - p.y;
        let dist = Math.hypot(dx, dy);
        
        if (dist < p.speed) {
            t.hp -= p.damage;
            floatingTexts.push(new FloatingText(t.x, t.y - 20, p.damage, "white", 15));
            if (p.effect === 'slow') t.slowed = 90;
            projectiles.splice(i, 1);
        } else {
            p.x += (dx / dist) * p.speed;
            p.y += (dy / dist) * p.speed;
            
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function startNextWave() {
    if (waveActive) return;
    wave++;
    waveActive = true;
    updateUI();
    
    let count = 5 + wave;
    let spawnCounter = 0;
    
    let spawner = setInterval(() => {
        if (lives <= 0) { clearInterval(spawner); return; }
        
        let type = 'normal';
        let r = Math.random();
        if (wave > 1 && r < 0.3) type = 'fast';
        if (wave > 3 && r < 0.2) type = 'tank';
        if (wave > 5 && r < 0.2) type = 'stealth';
        
        enemies.push(new Enemy(type));
        spawnCounter++;
        
        if (spawnCounter >= count) {
            clearInterval(spawner);
            // Sjekk om bølgen er ferdig
            let checkEnd = setInterval(() => {
                if (enemies.length === 0 && waveActive) {
                    waveActive = false;
                    showMessage(`Bølge ${wave} fullført!`);
                    clearInterval(checkEnd);
                    document.getElementById("start-wave-btn").disabled = false;
                    updateUI();
                }
            }, 1000);
        }
    }, 1200);
    
    document.getElementById("start-wave-btn").disabled = true;
}

// --- KLIKK OG BYGGING ---

// Bedre funksjon for å finne mus-posisjon
function getMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (evt.clientX - rect.left) / (rect.right - rect.left) * canvas.width,
        y: (evt.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height
    };
}

function handleCanvasClick(e) {
    const pos = getMousePos(e);
    const x = pos.x;
    const y = pos.y;

    // Sjekk oppgradering
    for (let t of towers) {
        if (Math.hypot(t.x - x, t.y - y) < 30) {
            t.upgrade();
            return;
        }
    }

    // Bygge-logikk
    if (!waveActive) {
        showMessage("Start bølgen for å bygge!");
        return;
    }

    if (gold < TOWER_COSTS[selectedTower]) {
        showMessage("Ikke nok gull!");
        return;
    }

    pendingTowerLocation = { x, y };
    startQuiz();
}

function selectTowerType(type) {
    selectedTower = type;
    
    // Visuell markering av valgt knapp
    document.querySelectorAll('.tower-card').forEach(el => el.classList.remove('selected'));
    document.getElementById('btn-' + type).classList.add('selected');
    
    showMessage(`Valgt: ${TOWER_STATS[type].name}`);
}

function startQuiz() {
    gameState = "quiz";
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
    gameState = "playing"; // Sørg for at loopen fortsetter
    
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
    setTimeout(() => { el.innerText = ""; }, 2000);
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
