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
let gameState = "menu"; // menu, playing, quiz
let gold = 300;
let lives = 20;
let wave = 0;
let waveActive = false;
let enemies = [];
let towers = [];
let projectiles = [];
let frameCount = 0;
let selectedTower = "basic";
let pendingTowerLocation = null;

// Konfigurasjon
const path = [{x:0, y:300}, {x:200, y:300}, {x:200, y:100}, {x:600, y:100}, {x:600, y:500}, {x:800, y:500}];
const TOWER_COSTS = { basic: 50, sniper: 120, ice: 100 };
const TOWER_STATS = {
    basic: { range: 150, damage: 10, rate: 30, color: '#3498db', name: "Bueskytter" },
    sniper: { range: 300, damage: 50, rate: 100, color: '#e74c3c', name: "Kanon" },
    ice: { range: 120, damage: 2, rate: 40, color: '#2ecc71', name: "Frost", effect: "slow" }
};

// --- OPPSTART ---
function startGame(mode) {
    gameMode = mode;
    document.getElementById("menu").classList.remove("active");
    document.getElementById("game-container").classList.add("active");
    
    // Hent canvas her siden scriptet nå kjører etter HTMLen er lastet
    canvas = document.getElementById("gameCanvas");
    ctx = canvas.getContext("2d");
    
    // Klikk på canvas
    canvas.addEventListener('mousedown', handleCanvasClick);

    // Reset verdier
    gold = 250;
    lives = 20;
    wave = 0;
    enemies = [];
    towers = [];
    projectiles = [];
    waveActive = false;
    
    updateUI();
    gameState = "playing";
    gameLoop();
}

// --- SPILL-LOOP ---
function gameLoop() {
    if (gameState === "playing") {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawMap();
        updateEnemies();
        updateTowers();
        updateProjectiles();
        drawUIOverlay();
        frameCount++;
    }
    requestAnimationFrame(gameLoop);
}

// --- LOGIKK: FIENDER ---
class Enemy {
    constructor(type) {
        this.type = type;
        this.pathIndex = 0;
        this.x = path[0].x;
        this.y = path[0].y;
        
        // Egenskaper basert på type
        if (type === 'fast') { this.speed = 3; this.hp = 30; this.color = 'yellow'; this.r = 10; }
        else if (type === 'tank') { this.speed = 1; this.hp = 150; this.color = 'purple'; this.r = 15; }
        else if (type === 'stealth') { this.speed = 2; this.hp = 40; this.color = 'gray'; this.r = 10; this.stealthTimer = 0; }
        else { this.speed = 1.5; this.hp = 50; this.color = 'red'; this.r = 12; } // Normal
        
        this.maxHp = this.hp;
        this.slowed = false;
        this.invisible = false;
    }

    update() {
        // Håndter usynlighet
        if (this.type === 'stealth') {
            this.stealthTimer++;
            if (this.stealthTimer % 240 < 120) {
                this.invisible = true;
                this.color = 'rgba(100,100,100,0.3)';
            } else {
                this.invisible = false;
                this.color = 'gray';
            }
        }

        // Håndter slow
        let currentSpeed = this.speed;
        if (this.slowed > 0) {
            currentSpeed *= 0.5;
            this.slowed--;
        }

        const target = path[this.pathIndex + 1];
        if (!target) {
            this.hp = 0; // Nådde mål
            lives--;
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
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fill();
        
        // Helsebar
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x - 10, this.y - 20, 20, 4);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(this.x - 10, this.y - 20, 20 * (this.hp / this.maxHp), 4);
    }
}

// --- LOGIKK: BØLGER ---
function startNextWave() {
    if (waveActive) return;
    wave++;
    waveActive = true;
    updateUI();
    
    let count = 5 + wave * 2;
    let spawnCounter = 0;
    
    let spawner = setInterval(() => {
        if (lives <= 0) { clearInterval(spawner); return; }
        
        let type = 'normal';
        if (wave > 2 && Math.random() < 0.3) type = 'fast';
        if (wave > 4 && Math.random() < 0.3) type = 'tank';
        if (wave > 6 && Math.random() < 0.3) type = 'stealth';
        
        enemies.push(new Enemy(type));
        spawnCounter++;
        
        if (spawnCounter >= count) {
            clearInterval(spawner);
            let checkEnd = setInterval(() => {
                if (enemies.length === 0) {
                    waveActive = false;
                    showMessage("Bølge fullført!");
                    clearInterval(checkEnd);
                    document.getElementById("start-wave-btn").disabled = false;
                }
            }, 1000);
        }
    }, 1000);
    
    document.getElementById("start-wave-btn").disabled = true;
}

// --- LOGIKK: TÅRN ---
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
            x: this.x, y: this.y,
            target: target,
            damage: this.stats.damage,
            effect: this.stats.effect,
            speed: 10
        });
    }

    draw() {
        ctx.fillStyle = this.stats.color;
        ctx.fillRect(this.x - 15, this.y - 15, 30, 30);
        
        ctx.fillStyle = "white";
        ctx.font = "10px Arial";
        ctx.fillText("Lvl " + this.level, this.x - 12, this.y + 5);
    }
    
    upgrade() {
        if (gold >= 100) {
            gold -= 100;
            this.level++;
            this.stats.damage *= 1.2;
            this.stats.rate *= 0.9;
            updateUI();
            showMessage("Tårn oppgradert!");
        } else {
            showMessage("Ikke nok gull!");
        }
    }
}

// --- LOGIKK: BYGGING & QUIZ ---
function selectTowerType(type) {
    selectedTower = type;
    showMessage(`Valgt: ${TOWER_STATS[type].name}. Klikk på kartet.`);
}

function handleCanvasClick(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (let t of towers) {
        if (Math.hypot(t.x - x, t.y - y) < 20) {
            t.upgrade();
            return;
        }
    }

    if (!waveActive) {
        showMessage("Du kan BARE bygge mens bølgen pågår!");
        return;
    }

    if (gold < TOWER_COSTS[selectedTower]) {
        showMessage("Ikke nok gull!");
        return;
    }

    pendingTowerLocation = { x, y };
    startQuiz();
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
    gameState = "playing"; 
    
    if (isCorrect) {
        gold -= TOWER_COSTS[selectedTower];
        towers.push(new Tower(pendingTowerLocation.x, pendingTowerLocation.y, selectedTower));
        updateUI();
        showMessage("Riktig! Tårn plassert.");
    } else {
        showMessage("Feil svar! Ingen tårn bygget.");
    }
}

// --- HJELPEFUNKSJONER ---
function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].update();
        if (enemies[i].hp <= 0) {
            gold += 15;
            enemies.splice(i, 1);
            updateUI();
        }
    }
}

function updateTowers() {
    towers.forEach(t => t.update());
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
            if (p.effect === 'slow') t.slowed = 60;
            projectiles.splice(i, 1);
        } else {
            p.x += (dx / dist) * p.speed;
            p.y += (dy / dist) * p.speed;
        }
        
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawMap() {
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 40;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let p of path) ctx.lineTo(p.x, p.y);
    ctx.stroke();
    
    enemies.forEach(e => e.draw());
    towers.forEach(t => t.draw());
}

function drawUIOverlay() {
    if (!waveActive) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0,0,canvas.width, 30);
        ctx.fillStyle = "white";
        ctx.fillText("Trykk 'Start Bølge' for å fortsette", canvas.width/2 - 100, 20);
    }
}

function updateUI() {
    document.getElementById("gold-display").innerText = gold;
    document.getElementById("lives-display").innerText = lives;
    document.getElementById("wave-display").innerText = wave;
    if (lives <= 0) {
        alert("GAME OVER! Du nådde bølge " + wave);
        location.reload();
    }
}

function showMessage(msg) {
    const el = document.getElementById("message-area");
    el.innerText = msg;
    setTimeout(() => { if(el.innerText === msg) el.innerText = ""; }, 2000);
}
