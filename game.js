import { CONFIG } from './src/config/constants.js';
import { GameState } from './src/core/GameState.js';
import { RenderSystem } from './src/systems/RenderSystem.js';
import { Player } from './src/entities/Player.js';
import { Enemy } from './src/entities/Enemy.js';
import { Boss } from './src/entities/Boss.js';
import { Bullet } from './src/entities/Bullet.js';
import { Particle, createExplosion } from './src/entities/Particle.js';
import { HealthPickup } from './src/entities/HealthPickup.js';
import { findValidSpawnPosition, isInSpawnZone } from './src/utils/collision.js';
import { progressiveMap } from './src/data/levels.js';
import { levels } from './src/data/levelsData.js';
import { pvpMapData } from './src/data/pvpMapData.js';
import { WebRTCManager } from './src/network/WebRTCManager.js';
import { PvPMode } from './src/modes/PvPMode.js';

// DOM Elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const gameOverElement = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');
const menuBtn = document.getElementById('menuBtn');
const mainMenu = document.getElementById('mainMenu');
const startProgressiveBtn = document.getElementById('startProgressiveBtn');
const startNewGameBtn = document.getElementById('startNewGameBtn');
const levelBtns = document.querySelectorAll('.level-btn');

// PvP DOM Elements
const pvpLobby      = document.getElementById('pvpLobby');
const pvpSetup      = document.getElementById('pvpSetup');
const pvpWaiting    = document.getElementById('pvpWaiting');
const pvpRoomDisplay = document.getElementById('pvpRoomDisplay');
const pvpRoomCode   = document.getElementById('pvpRoomCode');
const pvpStatus     = document.getElementById('pvpStatus');
const pvpError      = document.getElementById('pvpError');
const pvpCodeInput  = document.getElementById('pvpCodeInput');

/** Aktuální WebRTC manager (null když není PvP). */
let webrtc = null;

// Game State
const state = new GameState();
const renderer = new RenderSystem(ctx);

function resizeCanvas(gameMap) {
    if (!gameMap || gameMap.length === 0) return;
    
    const mapHeight = gameMap.length;
    const mapWidth = gameMap[0].length;
    
    canvas.width = mapWidth * CONFIG.TILE_SIZE;
    canvas.height = mapHeight * CONFIG.TILE_SIZE;
}

function initLevel(level) {
    const levelData = levels[level];
    state.gameMap = levelData.map;
    
    state.reset();
    
    // Přizpůsobit velikost canvasu podle mapy
    resizeCanvas(state.gameMap);
    
    // Nastavení základních AI parametrů pro normální levely
    state.VISION_RANGE = CONFIG.ENEMY.BASE_VISION_RANGE;
    state.HEARING_RANGE = CONFIG.ENEMY.BASE_HEARING_RANGE;
    state.ENEMY_SPEED = CONFIG.ENEMY.BASE_SPEED;
    state.ALERT_DURATION = CONFIG.ENEMY.BASE_ALERT_DURATION;
    state.SEARCH_DURATION = CONFIG.ENEMY.BASE_SEARCH_DURATION;
    
    const playerPos = findValidSpawnPosition(
        levelData.playerStart.x,
        levelData.playerStart.y,
        state.gameMap
    );
    
    state.player = new Player(playerPos.x, playerPos.y);
    state.spawnSafeZone = {x: state.player.x, y: state.player.y};
    
    state.playerInvisible = true;
    state.tutorialTextVisible = levelData.tutorial || false;
    
    levelData.enemies.forEach(enemyData => {
        const validPos = findValidSpawnPosition(enemyData.x, enemyData.y, state.gameMap);
        const enemy = new Enemy(validPos.x, validPos.y, enemyData.patrol);
        enemy.randomPatrol = true;
        enemy.randomPatrolTimer = 100 + Math.random() * 200;
        enemy.speed = state.ENEMY_SPEED;
        enemy.visionRange = state.VISION_RANGE;
        state.enemies.push(enemy);
    });
    
    if (levelData.boss) {
        const bossData = levelData.boss;
        const validPos = findValidSpawnPosition(bossData.x, bossData.y, state.gameMap);
        const boss = new Boss(validPos.x, validPos.y, bossData.patrol);
        boss.randomPatrol = true;
        boss.randomPatrolTimer = 100 + Math.random() * 200;
        boss.speed = state.ENEMY_SPEED * CONFIG.BOSS.SPEED_MULTIPLIER;
        boss.visionRange = state.VISION_RANGE * 1.5;
        state.enemies.push(boss);
    }
    
    if (levelData.healthPickups) {
        levelData.healthPickups.forEach(pickup => {
            state.healthPickups.push(new HealthPickup(pickup.x, pickup.y));
        });
    }
    
    state.totalEnemies = state.enemies.length;
    
    const levelMultiplier = level / 10;
    state.VISION_RANGE = CONFIG.ENEMY.BASE_VISION_RANGE + levelMultiplier * 100;
    state.HEARING_RANGE = CONFIG.ENEMY.BASE_HEARING_RANGE + levelMultiplier * 150;
    state.ENEMY_SPEED = CONFIG.ENEMY.BASE_SPEED + levelMultiplier * 0.5;
    state.ALERT_DURATION = Math.max(2000, CONFIG.ENEMY.BASE_ALERT_DURATION - levelMultiplier * 1000);
    state.SEARCH_DURATION = CONFIG.ENEMY.BASE_SEARCH_DURATION + levelMultiplier * 3000;
    
    state.enemies.forEach(enemy => {
        enemy.speed = state.ENEMY_SPEED;
    });
}

function initProgressiveMode() {
    state.gameMap = progressiveMap.map;
    state.gameMode = 'progressive';
    state.currentLevel = 1;
    state.progressiveWave = 1;
    state.enemiesKilledThisWave = 0;
    state.progressiveDifficulty = 1;
    state.gameStartTime = Date.now();
    
    state.reset();
    
    // Přizpůsobit velikost canvasu podle mapy
    resizeCanvas(state.gameMap);
    
    const playerPos = findValidSpawnPosition(
        progressiveMap.playerStart.x,
        progressiveMap.playerStart.y,
        state.gameMap
    );
    state.player = new Player(playerPos.x, playerPos.y);
    state.spawnSafeZone = {x: state.player.x, y: state.player.y};
    
    state.playerInvisible = true;
    
    state.VISION_RANGE = CONFIG.ENEMY.BASE_VISION_RANGE;
    state.HEARING_RANGE = CONFIG.ENEMY.BASE_HEARING_RANGE;
    state.ENEMY_SPEED = CONFIG.ENEMY.BASE_SPEED;
    state.ALERT_DURATION = CONFIG.ENEMY.BASE_ALERT_DURATION;
    state.SEARCH_DURATION = CONFIG.ENEMY.BASE_SEARCH_DURATION;
    
    spawnProgressiveWave();
}

function spawnProgressiveWave() {
    let enemiesInWave;
    let difficultyLevel;
    
    if (state.progressiveWave <= CONFIG.PROGRESSIVE.MAX_ENEMIES_BEFORE_SCALING) {
        enemiesInWave = state.progressiveWave;
        difficultyLevel = 0;
    } else {
        enemiesInWave = CONFIG.PROGRESSIVE.MAX_ENEMIES_BEFORE_SCALING;
        difficultyLevel = state.progressiveWave - CONFIG.PROGRESSIVE.MAX_ENEMIES_BEFORE_SCALING;
    }
    
    state.enemiesKilledThisWave = 0;
    
    state.VISION_RANGE = CONFIG.ENEMY.BASE_VISION_RANGE + difficultyLevel * CONFIG.PROGRESSIVE.DIFFICULTY_INCREMENT.VISION;
    state.HEARING_RANGE = CONFIG.ENEMY.BASE_HEARING_RANGE + difficultyLevel * CONFIG.PROGRESSIVE.DIFFICULTY_INCREMENT.HEARING;
    state.ENEMY_SPEED = Math.min(2.5, CONFIG.ENEMY.BASE_SPEED + difficultyLevel * CONFIG.PROGRESSIVE.DIFFICULTY_INCREMENT.SPEED);
    state.ALERT_DURATION = Math.max(2000, CONFIG.ENEMY.BASE_ALERT_DURATION - difficultyLevel * CONFIG.PROGRESSIVE.DIFFICULTY_INCREMENT.ALERT_REDUCTION);
    state.SEARCH_DURATION = CONFIG.ENEMY.BASE_SEARCH_DURATION + difficultyLevel * CONFIG.PROGRESSIVE.DIFFICULTY_INCREMENT.SEARCH_INCREASE;
    
    for (let i = 0; i < enemiesInWave; i++) {
        let spawnPoint;
        
        if (enemiesInWave < CONFIG.PROGRESSIVE.MULTI_SPAWN_THRESHOLD) {
            spawnPoint = CONFIG.PROGRESSIVE.SPAWN_POINTS[state.progressiveWave % CONFIG.PROGRESSIVE.SPAWN_POINTS.length];
        } else {
            spawnPoint = CONFIG.PROGRESSIVE.SPAWN_POINTS[i % CONFIG.PROGRESSIVE.SPAWN_POINTS.length];
        }
        
        const offsetX = (Math.random() - 0.5) * 60;
        const offsetY = (Math.random() - 0.5) * 60;
        const spawnX = spawnPoint.x + offsetX;
        const spawnY = spawnPoint.y + offsetY;
        
        const validPos = findValidSpawnPosition(spawnX, spawnY, state.gameMap);
        
        const enemy = new Enemy(validPos.x, validPos.y, []);
        enemy.randomPatrol = true;
        enemy.randomPatrolTimer = 100 + Math.random() * 200;
        enemy.speed = state.ENEMY_SPEED;
        enemy.visionRange = state.VISION_RANGE;
        state.enemies.push(enemy);
    }
    
    state.totalEnemies = state.enemies.length;
}

function shoot() {
    const now = Date.now();
    if (now - state.lastShot > CONFIG.PLAYER.SHOOT_COOLDOWN) {
        const bulletX = state.player.x + Math.cos(state.player.angle) * state.player.size;
        const bulletY = state.player.y + Math.sin(state.player.angle) * state.player.size;
        state.bullets.push(new Bullet(bulletX, bulletY, state.player.angle, true));
        state.soundEvents.push({x: state.player.x, y: state.player.y, time: now});
        state.lastShot = now;
        state.tutorialTextVisible = false;
    }
}

function updateGame() {
    if (!state.gameRunning) return;

    // Výpočet delta time (v sekundách)
    const currentTime = performance.now();
    state.deltaTime = (currentTime - state.lastFrameTime) / 1000;
    state.lastFrameTime = currentTime;

    // Omezení delta time (pokud tab ztratí focus)
    if (state.deltaTime > 0.1) state.deltaTime = 0.016;

    // ── PvP strážce: renderuje přijatý stav, posílá vstupy ──
    if (state.gameMode === 'pvp' && state.pvpRole === 'guard') {
        if (state.pvpMode) {
            state.pvpMode.updateGuard();
            state.pvpMode.renderGuardView();
        }
        if (state.gameRunning) requestAnimationFrame(updateGame);
        return;
    }

    renderer.clear();
    renderer.drawMap(state.gameMap);
    
    state.player.update(state.keys, state.mouseX, state.mouseY, state.gameMap, canvas, state.deltaTime);
    state.player.draw(ctx, state.playerInvisible);

    if (state.keys.w || state.keys.a || state.keys.s || state.keys.d) {
        state.tutorialTextVisible = false;
        state.playerInvisible = false;
    }

    state.soundEvents.forEach((sound, index) => {
        if (Date.now() - sound.time > 100) {
            state.soundEvents.splice(index, 1);
        }
    });

    state.bullets.forEach((bullet, bulletIndex) => {
        bullet.update(state.deltaTime);
        bullet.draw(ctx);

        if (bullet.checkWallCollision(state.gameMap)) {
            state.bullets.splice(bulletIndex, 1);
            return;
        }

        if (bullet.isPlayer) {
            state.enemies.forEach((enemy, enemyIndex) => {
                if (bullet.collidesWith(enemy)) {
                    if (enemy.isBoss) {
                        enemy.health--;
                        state.bullets.splice(bulletIndex, 1);
                        createExplosion(enemy.x, enemy.y, '#ff6600', state.particles);
                        if (enemy.health <= 0) {
                            createExplosion(enemy.x, enemy.y, '#ff0000', state.particles);
                            state.enemies.splice(enemyIndex, 1);
                            state.score += 500;
                            scoreElement.textContent = state.score;
                        }
                    } else {
                        createExplosion(enemy.x, enemy.y, '#ff6600', state.particles);
                        state.enemies.splice(enemyIndex, 1);
                        state.bullets.splice(bulletIndex, 1);
                        state.score += 100;
                        scoreElement.textContent = state.score;
                        
                        if (state.gameMode === 'progressive') {
                            state.enemiesKilledThisWave++;
                            if (state.enemiesKilledThisWave >= state.totalEnemies) {
                                state.progressiveWave++;
                                setTimeout(() => {
                                    if (state.gameRunning) {
                                        spawnProgressiveWave();
                                    }
                                }, 2000);
                            }
                        }
                    }
                }
            });
        } else {
            if (bullet.collidesWith(state.player) && state.lives > 0) {
                createExplosion(state.player.x, state.player.y, '#ff0000', state.particles);
                state.bullets.splice(bulletIndex, 1);
                if (state.currentLevel !== 0 || state.gameMode === 'pvp') {
                    state.lives--;
                    livesElement.textContent = state.lives;
                    if (state.lives <= 0) {
                        state.lives = 0;
                        livesElement.textContent = state.lives;
                        // PvP: strážce vyhrál likvidací špiona
                        if (state.gameMode === 'pvp') state.pvpWinner = 'guard';
                        endGame();
                    }
                }
            }
        }
    });

    // ── PvP špion: aplikuj vstup strážce před updatem nepřátel ──
    if (state.gameMode === 'pvp' && state.pvpRole === 'spy' && state.pvpMode) {
        state.pvpMode.updateSpy();
    }

    state.enemies.forEach(enemy => {
        if (!isInSpawnZone(enemy.x, enemy.y, state.spawnSafeZone) || !state.playerInvisible) {
            enemy.update(state.player, state.gameMap, state.soundEvents, state.bullets,
                        state.VISION_RANGE, state.HEARING_RANGE, state.ALERT_DURATION, state.SEARCH_DURATION,
                        state.enemies, state.playerInvisible, state.deltaTime);
        }
        enemy.draw(ctx);
    });
    
    state.healthPickups.forEach((pickup, index) => {
        pickup.update();
        pickup.draw(ctx);
        
        if (pickup.collidesWith(state.player)) {
            state.lives = Math.min(state.lives + 1, 3);
            livesElement.textContent = state.lives;
            state.healthPickups.splice(index, 1);
        }
    });
    
    const levelData = levels[state.currentLevel];
    if (levelData && levelData.tutorial) {
        renderer.drawTutorial(state.tutorialTextVisible);
    }
    
    if (state.gameMode === 'pvp') {
        // Špion zlikvidoval všechny strážce → špion vyhrál
        if (state.enemies.length === 0 && state.totalEnemies > 0) {
            state.pvpWinner = 'spy';
            endGame();
        }
    } else if (state.enemies.length === 0 && state.totalEnemies > 0 && state.gameMode !== 'progressive') {
        checkLevelComplete();
    }

    state.particles.forEach((particle, index) => {
        particle.update(state.deltaTime);
        particle.draw(ctx);
        if (particle.isDead()) {
            state.particles.splice(index, 1);
        }
    });

    if (state.gameRunning) {
        requestAnimationFrame(updateGame);
    }
}

/** Inicializuje PvP herní mód po navázání WebRTC spojení. */
function initPvPGame() {
    state.gameMap = pvpMapData.map;
    state.gameMode = 'pvp';
    state.score = 0;
    state.lives = 3;
    state.gameRunning = true;
    state.pvpWinner = null;

    state.reset();
    resizeCanvas(state.gameMap);

    state.VISION_RANGE  = CONFIG.ENEMY.BASE_VISION_RANGE;
    state.HEARING_RANGE = CONFIG.ENEMY.BASE_HEARING_RANGE;
    state.ENEMY_SPEED   = CONFIG.ENEMY.BASE_SPEED;
    state.ALERT_DURATION  = CONFIG.ENEMY.BASE_ALERT_DURATION;
    state.SEARCH_DURATION = CONFIG.ENEMY.BASE_SEARCH_DURATION;

    if (state.pvpRole === 'spy') {
        const pos = findValidSpawnPosition(
            pvpMapData.playerStart.x, pvpMapData.playerStart.y, state.gameMap
        );
        state.player = new Player(pos.x, pos.y);
        state.spawnSafeZone = { x: state.player.x, y: state.player.y };
        state.playerInvisible = true;

        pvpMapData.enemies.forEach(ed => {
            const vp = findValidSpawnPosition(ed.x, ed.y, state.gameMap);
            const e = new Enemy(vp.x, vp.y, []);
            e.randomPatrol = true;
            e.randomPatrolTimer = 100 + Math.random() * 200;
            e.speed = state.ENEMY_SPEED;
            e.visionRange = state.VISION_RANGE;
            state.enemies.push(e);
        });
        state.totalEnemies = state.enemies.length;
    }

    // PvPMode orchestrátor
    state.pvpMode = new PvPMode(state, renderer, webrtc, canvas, ctx);
    // Strážce: konec hry přijatý od špiona
    state.pvpMode.onGameOver = () => endGame();

    // Skrýt lobby, ukázat canvas
    pvpLobby.classList.add('hidden');
    canvas.classList.remove('hidden');
    document.getElementById('leaderboardPanel').classList.add('hidden');

    scoreElement.textContent  = state.score;
    livesElement.textContent  = state.lives;
    document.getElementById('levelElement').textContent = 'PvP';

    updateGame();
}

function endGame() {
    state.gameRunning = false;
    finalScoreElement.textContent = state.score;
    document.getElementById('gameOverTitle').textContent = 'Konec hry!';

    // ── PvP konec ──
    if (state.gameMode === 'pvp') {
        const wonAsspy   = state.pvpWinner === 'spy'   && state.pvpRole === 'spy';
        const wonAsguard = state.pvpWinner === 'guard' && state.pvpRole === 'guard';
        const title = wonAsspy || wonAsguard ? '🏆 Vyhrál jsi!' : '💀 Prohrál jsi!';
        const desc  = state.pvpWinner === 'spy' ? '🕵️ Špion zlikvidoval všechny strážce!'
                                                 : '🛡️ Strážce zastavil špiona!';
        document.getElementById('gameOverTitle').textContent = title;
        document.getElementById('levelInfo').textContent = desc;
        document.getElementById('leaderboardSection').classList.add('hidden');
        document.getElementById('restartBtn').textContent = 'Zpět do menu';
        menuBtn.style.display = 'none';
        gameOverElement.classList.remove('hidden');
        return;
    }

    const leaderboardSection = document.getElementById('leaderboardSection');

    if (state.gameMode === 'progressive') {
        document.getElementById('levelInfo').textContent = `Dosáhl jsi vlny ${state.progressiveWave}`;
        leaderboardSection.classList.remove('hidden');
        loadLeaderboard();
        document.getElementById('restartBtn').textContent = 'Hrát znovu';
        menuBtn.style.display = 'inline-block';
    } else {
        if (state.isProgressivePlaythrough) {
            document.getElementById('levelInfo').textContent = `Zemřel jsi na úrovni ${state.currentLevel}`;
            document.getElementById('restartBtn').textContent = 'Hrát znovu';
            menuBtn.style.display = 'inline-block';
        } else {
            document.getElementById('levelInfo').textContent = `Zemřel jsi na úrovni ${state.currentLevel}`;
            document.getElementById('restartBtn').textContent = 'Zkusit znovu';
            menuBtn.style.display = 'inline-block';
        }
        leaderboardSection.classList.add('hidden');
    }
    
    gameOverElement.classList.remove('hidden');
}

function checkLevelComplete() {
    state.gameRunning = false;
    finalScoreElement.textContent = state.score;
    
    if (!state.isProgressivePlaythrough) {
        document.getElementById('gameOverTitle').textContent = 'Úroveň dokončena!';
        document.getElementById('levelInfo').textContent = 'Gratulujeme!';
        document.getElementById('restartBtn').textContent = 'Zpět do menu';
        menuBtn.style.display = 'none';
        gameOverElement.classList.remove('hidden');
        return;
    }
    
    if (state.currentLevel < levels.length) {
        document.getElementById('gameOverTitle').textContent = 'Úroveň dokončena!';
        document.getElementById('levelInfo').textContent = `Připrav se na úroveň ${state.currentLevel + 1}`;
        document.getElementById('restartBtn').textContent = 'Další úroveň';
        menuBtn.style.display = 'inline-block';
    } else {
        document.getElementById('gameOverTitle').textContent = 'Gratulujeme!';
        document.getElementById('levelInfo').textContent = 'Dokončil jsi všechny úrovně!';
        document.getElementById('restartBtn').textContent = 'Hrát znovu';
        menuBtn.style.display = 'inline-block';
    }
    
    gameOverElement.classList.remove('hidden');
}

function restartGame() {
    // PvP: po konci hry vždy zpět do menu (nelze restartovat síťovou hru)
    if (state.gameMode === 'pvp') { returnToMenu(); return; }

    const wasComplete = state.enemies.length === 0 && state.totalEnemies > 0;
    const wasDead = state.lives <= 0;
    
    if (!state.isProgressivePlaythrough && wasComplete) {
        returnToMenu();
        return;
    }
    
    if (wasDead) {
        if (state.isProgressivePlaythrough) {
            state.currentLevel = 1;
        }
        state.score = 0;
        state.lives = 3;
    } else if (wasComplete && state.currentLevel < levels.length - 1) {
        if (state.currentLevel === 0) {
            state.tutorialCompleted = true;
        }
        state.currentLevel++;
    } else if (wasComplete && state.currentLevel >= levels.length - 1) {
        state.currentLevel = state.tutorialCompleted ? 1 : 0;
        state.score = 0;
        state.lives = 3;
    }
    
    state.gameRunning = true;
    scoreElement.textContent = state.score;
    livesElement.textContent = state.lives;
    
    if (state.gameMode === 'progressive') {
        document.getElementById('levelElement').textContent = 'Survival';
        initProgressiveMode();
    } else {
        document.getElementById('levelElement').textContent = state.currentLevel;
        initLevel(state.currentLevel);
    }
    
    gameOverElement.classList.add('hidden');
    document.getElementById('restartBtn').textContent = 'Hrát znovu';
    state.lastShot = 0;
    
    updateGame();
}

function returnToMenu() {
    state.gameRunning = false;
    state.reset();
    state.gameMode = 'classic';
    state.isProgressivePlaythrough = false;
    state.currentLevel = 0;

    // Uklidit PvP
    if (state.pvpMode) { state.pvpMode.destroy(); state.pvpMode = null; }
    if (webrtc)        { webrtc.close(); webrtc = null; }
    state.pvpRole     = null;
    state.pvpWinner   = null;
    state.pvpConnected = false;

    // Vyčistit canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    pvpLobby.classList.add('hidden');
    pvpWaiting.classList.add('hidden');
    pvpSetup.classList.remove('hidden');
    pvpRoomDisplay.classList.add('hidden');
    pvpCodeInput.value = '';
    pvpError.classList.add('hidden');

    mainMenu.classList.remove('hidden');
    canvas.classList.add('hidden');
    gameOverElement.classList.add('hidden');
    document.getElementById('leaderboardPanel').classList.remove('hidden');
}

function startGame(level, progressive = false) {
    state.currentLevel = level;
    state.score = 0;
    state.lives = 3;
    state.gameRunning = true;
    state.tutorialTextVisible = (level === 0);
    state.isProgressivePlaythrough = progressive;
    
    mainMenu.classList.add('hidden');
    canvas.classList.remove('hidden');
    document.getElementById('leaderboardPanel').classList.add('hidden');
    
    scoreElement.textContent = state.score;
    livesElement.textContent = state.lives;
    document.getElementById('levelElement').textContent = state.currentLevel;
    
    initLevel(state.currentLevel);
    updateGame();
}

async function loadLeaderboard() {
    const leaderboardList = document.getElementById('leaderboardList');
    leaderboardList.innerHTML = '<p>Načítání...</p>';
    
    try {
        const response = await fetch('/.netlify/functions/getLeaderboard');
        const data = await response.json();
        
        if (data.scores && data.scores.length > 0) {
            leaderboardList.innerHTML = data.scores.map((entry, index) => `
                <div class="leaderboard-entry">
                    <span class="leaderboard-rank">${index + 1}.</span>
                    <span class="leaderboard-name">${entry.player_name}</span>
                    <span class="leaderboard-score">${entry.score} bodů (vlna ${entry.wave})</span>
                </div>
            `).join('');
        } else {
            leaderboardList.innerHTML = '<p>Žebříček je zatím prázdný. Buď první!</p>';
        }
    } catch (error) {
        console.error('Chyba při načítání žebříčku:', error);
        leaderboardList.innerHTML = '<p>Nepodařilo se načíst žebříček.</p>';
    }
}

async function loadMenuLeaderboard() {
    const menuLeaderboardList = document.getElementById('menuLeaderboardList');
    menuLeaderboardList.innerHTML = '<p>Načítání...</p>';
    
    try {
        const response = await fetch('/.netlify/functions/getLeaderboard');
        const data = await response.json();
        
        if (data.scores && data.scores.length > 0) {
            menuLeaderboardList.innerHTML = data.scores.map((entry, index) => `
                <div class="leaderboard-entry">
                    <span class="leaderboard-rank">${index + 1}.</span>
                    <span class="leaderboard-name">${entry.player_name}</span>
                    <span class="leaderboard-score">${entry.score} bodů (vlna ${entry.wave})</span>
                </div>
            `).join('');
        } else {
            menuLeaderboardList.innerHTML = '<p>Žebříček je zatím prázdný. Buď první!</p>';
        }
    } catch (error) {
        console.error('Chyba při načítání žebříčku:', error);
        menuLeaderboardList.innerHTML = '<p>Nepodařilo se načíst žebříček.</p>';
    }
}

async function submitScore(playerName, score, wave) {
    const submitMessage = document.getElementById('submitMessage');
    submitMessage.textContent = 'Odesílání...';
    submitMessage.style.color = '#4CAF50';
    
    // Výpočet délky hry v sekundách
    const gameDuration = Math.floor((Date.now() - state.gameStartTime) / 1000);
    
    try {
        const response = await fetch('/.netlify/functions/submitScore', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                player_name: playerName,
                score: score,
                wave: wave,
                game_duration: gameDuration
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            submitMessage.textContent = 'Skóre úspěšně odesláno!';
            submitMessage.style.color = '#4CAF50';
            await loadLeaderboard();
            document.getElementById('playerName').value = '';
        } else {
            // Detekce anti-cheat zamítnutí
            const errorMsg = data.error || 'Chyba při odesílání skóre';
            const isCheating = errorMsg.includes('Podezřel') || 
                              errorMsg.includes('Neplatné skóre pro danou vlnu') ||
                              errorMsg.includes('herní čas');
            
            if (isCheating) {
                // Troll zpráva pro cheatery 😈
                submitMessage.innerHTML = '🚨 <strong>HA! CHEATER DETECTED!</strong> 🚨<br>' +
                                         'Nice try, but our anti-cheat is watching you! 👀<br>' +
                                         '<small>(' + errorMsg + ')</small>';
                submitMessage.style.color = '#ff0000';
                submitMessage.style.fontSize = '1.2em';
                submitMessage.style.fontWeight = 'bold';
                submitMessage.style.animation = 'shake 0.5s';
                
                // Přidat shake animaci
                setTimeout(() => {
                    submitMessage.style.animation = '';
                    submitMessage.style.fontSize = '1em';
                    submitMessage.style.fontWeight = 'normal';
                }, 3000);
            } else {
                submitMessage.textContent = errorMsg;
                submitMessage.style.color = '#ff4444';
            }
        }
    } catch (error) {
        console.error('Chyba při odesílání skóre:', error);
        submitMessage.textContent = 'Chyba při odesílání skóre';
        submitMessage.style.color = '#ff4444';
    }
}

// Event Listeners
document.addEventListener('keydown', (e) => {
    if (e.key === 'w' || e.key === 'W') state.keys.w = true;
    if (e.key === 'a' || e.key === 'A') state.keys.a = true;
    if (e.key === 's' || e.key === 'S') state.keys.s = true;
    if (e.key === 'd' || e.key === 'D') state.keys.d = true;
    if (e.key === 'Escape') {
        returnToMenu();
    }
    if (e.key === 'Enter' && state.currentLevel === 0 && state.gameRunning) {
        state.tutorialCompleted = true;
        state.currentLevel = 1;
        initLevel(state.currentLevel);
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'w' || e.key === 'W') state.keys.w = false;
    if (e.key === 'a' || e.key === 'A') state.keys.a = false;
    if (e.key === 's' || e.key === 'S') state.keys.s = false;
    if (e.key === 'd' || e.key === 'D') state.keys.d = false;
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    state.mouseX = e.clientX - rect.left;
    state.mouseY = e.clientY - rect.top;
});

canvas.addEventListener('click', (e) => {
    if (!state.gameRunning) return;
    // PvP strážce: klik zpracovává PvPMode
    if (state.gameMode === 'pvp' && state.pvpRole === 'guard') return;
    shoot();
});

restartBtn.addEventListener('click', restartGame);
menuBtn.addEventListener('click', () => {
    returnToMenu();
    loadMenuLeaderboard();
});

const refreshLeaderboardBtn = document.getElementById('refreshLeaderboardBtn');
refreshLeaderboardBtn.addEventListener('click', loadMenuLeaderboard);

startProgressiveBtn.addEventListener('click', () => {
    state.gameMode = 'progressive';
    state.gameRunning = true;
    mainMenu.classList.add('hidden');
    canvas.classList.remove('hidden');
    document.getElementById('leaderboardPanel').classList.add('hidden');
    state.score = 0;
    state.lives = 3;
    scoreElement.textContent = state.score;
    livesElement.textContent = state.lives;
    document.getElementById('levelElement').textContent = 'Survival';
    initProgressiveMode();
    updateGame();
});

startNewGameBtn.addEventListener('click', () => {
    startGame(0, true);
});

levelBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const level = parseInt(btn.getAttribute('data-level'));
        startGame(level, false);
    });
});

document.getElementById('submitScoreBtn').addEventListener('click', () => {
    const playerName = document.getElementById('playerName').value.trim();
    if (playerName) {
        submitScore(playerName, state.score, state.progressiveWave);
    } else {
        const submitMessage = document.getElementById('submitMessage');
        submitMessage.textContent = 'Zadej své jméno';
        submitMessage.style.color = '#ff4444';
    }
});

// ═══════════════════════════════════════════════════════════════
//  PvP LOBBY – event listenery
// ═══════════════════════════════════════════════════════════════

/** Zobrazí chybu v PvP lobby. */
function pvpShowError(msg) {
    pvpError.textContent = msg;
    pvpError.classList.remove('hidden');
}

/** Přejde ze setupu na čekací obrazovku. */
function pvpShowWaiting(code) {
    pvpSetup.classList.add('hidden');
    pvpWaiting.classList.remove('hidden');
    if (code) {
        pvpRoomCode.textContent = code;
        pvpRoomDisplay.classList.remove('hidden');
    }
}

/** Spustí hru pro oba hráče po navázání spojení. */
function pvpOnConnected() {
    state.pvpConnected = true;
    pvpStatus.textContent = '✅ Spojeno! Spouštím hru…';
    setTimeout(initPvPGame, 800);
}

/** Tlačítko "Vytvořit místnost" (špion). */
document.getElementById('pvpCreateBtn').addEventListener('click', async () => {
    pvpError.classList.add('hidden');
    pvpStatus.textContent = '⏳ Připojuji…';

    webrtc = new WebRTCManager();
    webrtc.onStatusChange = (txt) => { pvpStatus.textContent = txt; };
    webrtc.onConnected    = pvpOnConnected;
    webrtc.onDisconnected = () => {
        if (state.gameMode === 'pvp') {
            state.gameRunning = false;
            alert('Spojení bylo přerušeno.');
            returnToMenu();
        }
    };

    try {
        const code = await webrtc.createRoom();
        state.pvpRole = 'spy';
        pvpShowWaiting(code);
    } catch (e) {
        webrtc = null;
        pvpShowError('Nepodařilo se vytvořit místnost: ' + e.message);
    }
});

/** Tlačítko "Připojit se" (strážce). */
document.getElementById('pvpJoinBtn').addEventListener('click', async () => {
    const code = pvpCodeInput.value.trim().toUpperCase();
    if (code.length < 4) { pvpShowError('Zadej platný kód místnosti.'); return; }

    pvpError.classList.add('hidden');
    pvpStatus.textContent = '⏳ Připojuji se…';

    webrtc = new WebRTCManager();
    webrtc.onStatusChange = (txt) => { pvpStatus.textContent = txt; };
    webrtc.onConnected    = pvpOnConnected;
    webrtc.onDisconnected = () => {
        if (state.gameMode === 'pvp') {
            state.gameRunning = false;
            alert('Spojení bylo přerušeno.');
            returnToMenu();
        }
    };

    try {
        state.pvpRole = 'guard';
        pvpShowWaiting(null);
        await webrtc.joinRoom(code);
    } catch (e) {
        webrtc = null;
        pvpWaiting.classList.add('hidden');
        pvpSetup.classList.remove('hidden');
        pvpShowError('Nepodařilo se připojit: ' + e.message);
    }
});

/** Tlačítko "Zpět do menu" v lobby setupu. */
document.getElementById('pvpBackBtn').addEventListener('click', () => {
    pvpLobby.classList.add('hidden');
    mainMenu.classList.remove('hidden');
});

/** Tlačítko "Zrušit" v čekací obrazovce. */
document.getElementById('pvpCancelBtn').addEventListener('click', () => {
    if (webrtc) { webrtc.close(); webrtc = null; }
    pvpWaiting.classList.add('hidden');
    pvpSetup.classList.remove('hidden');
    pvpRoomDisplay.classList.add('hidden');
    pvpError.classList.add('hidden');
    pvpCodeInput.value = '';
    state.pvpRole = null;
});

/** Klik na canvas: strážce vybírá / střílí strážce. */
canvas.addEventListener('click', (e) => {
    if (state.gameMode !== 'pvp' || state.pvpRole !== 'guard' || !state.pvpMode) return;
    const rect = canvas.getBoundingClientRect();
    state.pvpMode.handleGuardClick(e.clientX - rect.left, e.clientY - rect.top);
});

/** Tlačítko "PvP" v hlavním menu. */
document.getElementById('startPvPBtn').addEventListener('click', () => {
    mainMenu.classList.add('hidden');
    document.getElementById('leaderboardPanel').classList.add('hidden');
    pvpLobby.classList.remove('hidden');
});

// ═══════════════════════════════════════════════════════════════

// Načíst žebříček při startu stránky
loadMenuLeaderboard();

// Export levels to window for temporary compatibility
window.gameLevels = levels;
