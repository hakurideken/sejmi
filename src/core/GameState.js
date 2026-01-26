export class GameState {
    constructor() {
        this.gameRunning = true;
        this.score = 0;
        this.lives = 3;
        this.currentLevel = 0;
        this.totalEnemies = 0;
        this.tutorialCompleted = false;
        this.tutorialTextVisible = true;
        this.playerInvisible = true;
        this.gameMode = 'classic';
        this.progressiveWave = 1;
        this.enemiesKilledThisWave = 0;
        this.progressiveDifficulty = 1;
        this.isProgressivePlaythrough = false;
        
        this.player = null;
        this.enemies = [];
        this.bullets = [];
        this.particles = [];
        this.soundEvents = [];
        this.healthPickups = [];
        
        this.gameMap = [];
        this.spawnSafeZone = {x: 0, y: 0};
        
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false
        };
        
        this.mouseX = 0;
        this.mouseY = 0;
        this.lastShot = 0;
        
        this.lastFrameTime = performance.now();
        this.deltaTime = 0;
        
        this.VISION_RANGE = 200;
        this.HEARING_RANGE = 300;
        this.ALERT_DURATION = 5000;
        this.SEARCH_DURATION = 8000;
        this.ENEMY_SPEED = 1.2;
    }
    
    reset() {
        this.enemies = [];
        this.bullets = [];
        this.particles = [];
        this.soundEvents = [];
        this.healthPickups = [];
    }
}
