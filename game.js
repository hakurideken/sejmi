const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const gameOverElement = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');

let gameRunning = true;
let score = 0;
let lives = 3;
let mouseX = 0;
let mouseY = 0;
let currentLevel = 1;
let totalEnemies = 0;

const TILE_SIZE = 40;
let VISION_RANGE = 200;
let HEARING_RANGE = 300;
let ALERT_DURATION = 5000;
let SEARCH_DURATION = 8000;
let ENEMY_SPEED = 1.5;

const keys = {
    w: false,
    a: false,
    s: false,
    d: false
};

const player = {
    x: 100,
    y: 100,
    size: 20,
    speed: 3,
    angle: 0,
    color: '#00ff00'
};

const levels = [
    {
        map: [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,1,1,1,2,1,1,1,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1,1,1,0,0,1],
            [1,0,0,0,1,0,0,0,0,0,1,0,0,0,2,0,0,0,0,1],
            [1,0,0,0,2,0,0,0,0,0,2,0,0,0,1,0,0,0,0,1],
            [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1,1,1,0,0,1],
            [1,0,0,0,1,1,1,2,1,1,1,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,2,0,0,0,0,0,1,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,1,0,0,0,0,0,2,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        enemies: [
            {x: 300, y: 140, patrol: [{x: 300, y: 140}, {x: 500, y: 140}]},
            {x: 580, y: 380, patrol: [{x: 580, y: 380}, {x: 680, y: 380}]}
        ],
        playerStart: {x: 100, y: 100}
    },
    {
        map: [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,2,0,0,0,0,0,2,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,1],
            [1,0,0,1,1,1,1,0,0,1,1,1,1,1,1,0,0,0,0,1],
            [1,0,0,2,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
            [1,0,0,1,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,1],
            [1,0,0,1,1,1,2,1,1,1,1,0,0,0,1,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,1,0,0,0,1,1,2,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,2,1,1,0,0,0,1,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,1,1,1,1,1,2,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        enemies: [
            {x: 180, y: 100, patrol: [{x: 180, y: 100}, {x: 340, y: 100}]},
            {x: 500, y: 140, patrol: [{x: 500, y: 140}, {x: 620, y: 140}]},
            {x: 300, y: 440, patrol: [{x: 300, y: 440}, {x: 480, y: 440}]}
        ],
        playerStart: {x: 100, y: 100}
    },
    {
        map: [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,1,2,1,1,1,1,2,1,1,1,1,1,1,0,1],
            [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
            [1,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,1],
            [1,0,1,0,0,1,1,1,2,1,1,1,1,1,0,0,0,1,0,1],
            [1,0,1,0,0,1,0,0,0,0,0,0,0,1,0,0,0,1,0,1],
            [1,0,1,0,0,2,0,0,0,0,0,0,0,2,0,0,0,1,0,1],
            [1,0,1,0,0,1,0,0,0,0,0,0,0,1,0,0,0,1,0,1],
            [1,0,1,0,0,1,1,1,1,2,1,1,1,1,0,0,0,1,0,1],
            [1,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,1],
            [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
            [1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        enemies: [
            {x: 180, y: 60, patrol: [{x: 180, y: 60}, {x: 620, y: 60}]},
            {x: 300, y: 240, patrol: [{x: 300, y: 240}, {x: 480, y: 240}]},
            {x: 140, y: 440, patrol: [{x: 140, y: 440}, {x: 340, y: 440}]},
            {x: 540, y: 440, patrol: [{x: 540, y: 440}, {x: 680, y: 440}]}
        ],
        playerStart: {x: 100, y: 520}
    },
    {
        map: [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,1,1,0,0,0,0,0,1,0,0,0,0,0,1,1,1,1,1,0,1],
            [1,0,1,0,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,0,1,0,1],
            [1,0,1,0,0,0,2,0,0,1,0,0,2,0,0,1,0,0,2,0,0,0,1,0,1],
            [1,0,1,0,0,0,1,0,0,1,1,1,1,1,1,1,0,0,1,0,0,0,1,0,1],
            [1,0,1,1,2,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,2,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,1,1,1,2,1,1,1,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,1,1,0,0,1,0,0,0,0,0,1,0,0,1,1,1,1,1,0,1],
            [1,0,1,0,0,0,1,0,0,2,0,0,0,0,0,2,0,0,1,0,0,0,1,0,1],
            [1,0,1,0,0,0,1,0,0,1,0,0,0,0,0,1,0,0,1,0,0,0,1,0,1],
            [1,0,1,1,2,1,1,0,0,1,1,1,1,1,1,1,0,0,1,1,2,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        enemies: [
            {x: 200, y: 80, patrol: [{x: 200, y: 80}, {x: 800, y: 80}]},
            {x: 300, y: 280, patrol: [{x: 300, y: 280}, {x: 700, y: 280}]},
            {x: 500, y: 180, patrol: [{x: 500, y: 180}, {x: 500, y: 380}]},
            {x: 150, y: 480, patrol: [{x: 150, y: 480}, {x: 350, y: 480}]},
            {x: 650, y: 480, patrol: [{x: 650, y: 480}, {x: 850, y: 480}]}
        ],
        healthPickups: [{x: 500, y: 320}],
        playerStart: {x: 80, y: 80}
    },
    {
        map: [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,2,0,0,0,0,0,2,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1,0,1],
            [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
            [1,0,1,0,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,0,0,1,0,1],
            [1,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,1],
            [1,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,1],
            [1,0,2,0,1,0,0,1,1,1,1,1,1,1,1,1,0,0,0,1,0,0,2,0,1],
            [1,0,1,0,1,0,0,1,0,0,0,0,0,0,0,1,0,0,0,1,0,0,1,0,1],
            [1,0,1,0,1,0,0,1,0,0,0,0,0,0,0,1,0,0,0,1,0,0,1,0,1],
            [1,0,1,0,1,0,0,1,1,1,1,2,1,1,1,1,0,0,0,1,0,0,1,0,1],
            [1,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,1],
            [1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        enemies: [
            {x: 200, y: 80, patrol: [{x: 200, y: 80}, {x: 800, y: 80}]},
            {x: 400, y: 240, patrol: [{x: 400, y: 240}, {x: 600, y: 240}]},
            {x: 300, y: 380, patrol: [{x: 300, y: 380}, {x: 700, y: 380}]},
            {x: 150, y: 520, patrol: [{x: 150, y: 520}, {x: 850, y: 520}]},
            {x: 500, y: 180, patrol: [{x: 500, y: 180}, {x: 500, y: 480}]},
            {x: 700, y: 300, patrol: [{x: 700, y: 300}, {x: 700, y: 400}]}
        ],
        playerStart: {x: 80, y: 520}
    },
    {
        map: [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,2,1,1,1,0,1,1,1,1,1,0,1,1,1,2,1,1,1,0,1],
            [1,0,1,0,0,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,0,0,1,0,1],
            [1,0,1,0,0,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,0,0,1,0,1],
            [1,0,2,0,0,0,0,0,2,0,2,0,0,0,2,0,2,0,0,0,0,0,2,0,1],
            [1,0,1,0,0,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,0,0,1,0,1],
            [1,0,1,0,0,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,0,0,1,0,1],
            [1,0,1,1,1,2,1,1,1,0,1,1,2,1,1,0,1,1,1,2,1,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        enemies: [
            {x: 200, y: 140, patrol: [{x: 200, y: 140}, {x: 300, y: 140}]},
            {x: 500, y: 140, patrol: [{x: 500, y: 140}, {x: 600, y: 140}]},
            {x: 800, y: 140, patrol: [{x: 800, y: 140}, {x: 900, y: 140}]},
            {x: 200, y: 280, patrol: [{x: 200, y: 280}, {x: 300, y: 280}]},
            {x: 500, y: 280, patrol: [{x: 500, y: 280}, {x: 600, y: 280}]},
            {x: 800, y: 280, patrol: [{x: 800, y: 280}, {x: 900, y: 280}]},
            {x: 400, y: 480, patrol: [{x: 400, y: 480}, {x: 700, y: 480}]}
        ],
        healthPickups: [{x: 500, y: 380}],
        playerStart: {x: 80, y: 520}
    },
    {
        map: [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
            [1,0,1,0,0,0,0,0,0,0,0,0,2,0,2,0,2,0,0,0,0,0,0,0,0,0,0,1,0,1],
            [1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1,0,0,1,0,1],
            [1,0,1,0,1,0,0,0,0,0,2,0,1,0,1,0,1,0,2,0,0,0,0,0,1,0,0,1,0,1],
            [1,0,1,0,1,0,0,0,0,0,1,0,1,0,1,0,1,0,1,0,0,0,0,0,1,0,0,1,0,1],
            [1,0,1,0,1,0,0,0,0,0,1,0,1,0,1,0,1,0,1,0,0,0,0,0,1,0,0,1,0,1],
            [1,0,1,0,1,1,1,2,1,1,1,0,1,0,1,0,1,0,1,1,1,2,1,1,1,0,0,1,0,1],
            [1,0,1,0,0,0,0,0,0,0,0,0,1,0,1,0,1,0,0,0,0,0,0,0,0,0,0,1,0,1],
            [1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        enemies: [
            {x: 200, y: 80, patrol: [{x: 200, y: 80}, {x: 1000, y: 80}]},
            {x: 300, y: 200, patrol: [{x: 300, y: 200}, {x: 300, y: 380}]},
            {x: 500, y: 240, patrol: [{x: 500, y: 240}, {x: 700, y: 240}]},
            {x: 900, y: 200, patrol: [{x: 900, y: 200}, {x: 900, y: 380}]},
            {x: 400, y: 480, patrol: [{x: 400, y: 480}, {x: 800, y: 480}]},
            {x: 150, y: 340, patrol: [{x: 150, y: 340}, {x: 350, y: 340}]},
            {x: 850, y: 340, patrol: [{x: 850, y: 340}, {x: 1050, y: 340}]},
            {x: 600, y: 140, patrol: [{x: 600, y: 140}, {x: 600, y: 380}]}
        ],
        playerStart: {x: 80, y: 80}
    },
    {
        map: [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1],
            [1,0,1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,0,1,0,1],
            [1,0,1,0,0,0,2,0,2,0,0,0,2,0,2,0,0,0,2,0,2,0,0,0,1,0,0,2,0,1],
            [1,0,1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,0,1,0,1],
            [1,0,1,1,2,1,1,0,1,1,2,1,1,0,1,1,2,1,1,0,1,1,2,1,1,0,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        enemies: [
            {x: 200, y: 140, patrol: [{x: 200, y: 140}, {x: 300, y: 140}]},
            {x: 400, y: 140, patrol: [{x: 400, y: 140}, {x: 500, y: 140}]},
            {x: 600, y: 140, patrol: [{x: 600, y: 140}, {x: 700, y: 140}]},
            {x: 800, y: 140, patrol: [{x: 800, y: 140}, {x: 900, y: 140}]},
            {x: 1000, y: 140, patrol: [{x: 1000, y: 140}, {x: 1100, y: 140}]},
            {x: 300, y: 280, patrol: [{x: 300, y: 280}, {x: 900, y: 280}]},
            {x: 200, y: 420, patrol: [{x: 200, y: 420}, {x: 1000, y: 420}]},
            {x: 500, y: 480, patrol: [{x: 500, y: 480}, {x: 700, y: 480}]},
            {x: 150, y: 340, patrol: [{x: 150, y: 340}, {x: 150, y: 480}]}
        ],
        playerStart: {x: 1100, y: 520}
    },
    {
        map: [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
            [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
            [1,0,1,0,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1],
            [1,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,1],
            [1,0,1,0,1,0,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,0,0,1,0,1,0,1],
            [1,0,1,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,1,0,1],
            [1,0,1,0,1,0,1,0,1,1,1,1,1,1,2,1,1,1,1,1,0,0,1,0,0,1,0,1,0,1],
            [1,0,1,0,1,0,1,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,1,0,1,0,1],
            [1,0,1,0,1,0,1,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,1,0,1,0,1],
            [1,0,1,0,1,0,1,0,1,1,1,1,1,2,1,1,1,1,1,1,0,0,1,0,0,1,0,1,0,1],
            [1,0,1,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,1,0,1],
            [1,0,1,0,1,0,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,0,0,1,0,1,0,1],
            [1,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,1],
            [1,0,1,0,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1],
            [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
            [1,0,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        enemies: [
            {x: 200, y: 80, patrol: [{x: 200, y: 80}, {x: 1000, y: 80}]},
            {x: 300, y: 240, patrol: [{x: 300, y: 240}, {x: 900, y: 240}]},
            {x: 400, y: 340, patrol: [{x: 400, y: 340}, {x: 800, y: 340}]},
            {x: 500, y: 440, patrol: [{x: 500, y: 440}, {x: 700, y: 440}]},
            {x: 200, y: 680, patrol: [{x: 200, y: 680}, {x: 1000, y: 680}]},
            {x: 600, y: 180, patrol: [{x: 600, y: 180}, {x: 600, y: 580}]},
            {x: 300, y: 380, patrol: [{x: 300, y: 380}, {x: 900, y: 380}]},
            {x: 450, y: 280, patrol: [{x: 450, y: 280}, {x: 750, y: 280}]},
            {x: 150, y: 520, patrol: [{x: 150, y: 520}, {x: 1050, y: 520}]},
            {x: 800, y: 300, patrol: [{x: 800, y: 300}, {x: 800, y: 500}]}
        ],
        healthPickups: [{x: 600, y: 380}],
        playerStart: {x: 80, y: 720}
    },
    {
        map: [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,2,1,1,0,1,1,2,1,1,0,1,1,2,1,1,0,1,1,2,1,1,0,1,1,0,1],
            [1,0,1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,0,1,0,1],
            [1,0,2,0,0,0,2,0,2,0,0,0,2,0,2,0,0,0,2,0,2,0,0,0,2,0,0,2,0,1],
            [1,0,1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,0,1,0,1],
            [1,0,1,1,2,1,1,0,1,1,2,1,1,0,1,1,2,1,1,0,1,1,2,1,1,0,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,2,1,1,0,1,1,2,1,1,0,1,0,1,1,2,1,1,0,1,1,2,1,1,1,0,1],
            [1,0,1,0,0,0,1,0,1,0,0,0,1,0,1,0,1,0,0,0,1,0,1,0,0,0,0,1,0,1],
            [1,0,2,0,0,0,2,0,2,0,0,0,2,0,2,0,2,0,0,0,2,0,2,0,0,0,0,2,0,1],
            [1,0,1,0,0,0,1,0,1,0,0,0,1,0,1,0,1,0,0,0,1,0,1,0,0,0,0,1,0,1],
            [1,0,1,1,2,1,1,0,1,1,2,1,1,0,1,0,1,1,2,1,1,0,1,1,2,1,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        enemies: [
            {x: 200, y: 140, patrol: [{x: 200, y: 140}, {x: 300, y: 140}]},
            {x: 400, y: 140, patrol: [{x: 400, y: 140}, {x: 500, y: 140}]},
            {x: 600, y: 140, patrol: [{x: 600, y: 140}, {x: 700, y: 140}]},
            {x: 800, y: 140, patrol: [{x: 800, y: 140}, {x: 900, y: 140}]},
            {x: 1000, y: 140, patrol: [{x: 1000, y: 140}, {x: 1100, y: 140}]},
            {x: 200, y: 520, patrol: [{x: 200, y: 520}, {x: 300, y: 520}]},
            {x: 400, y: 520, patrol: [{x: 400, y: 520}, {x: 500, y: 520}]},
            {x: 600, y: 520, patrol: [{x: 600, y: 520}, {x: 700, y: 520}]},
            {x: 800, y: 520, patrol: [{x: 800, y: 520}, {x: 900, y: 520}]},
            {x: 1000, y: 520, patrol: [{x: 1000, y: 520}, {x: 1100, y: 520}]},
            {x: 300, y: 280, patrol: [{x: 300, y: 280}, {x: 900, y: 280}]}
        ],
        boss: {x: 600, y: 380, patrol: [{x: 600, y: 380}, {x: 600, y: 680}]},
        playerStart: {x: 80, y: 720}
    }
];

let gameMap = [];

const bullets = [];
const enemies = [];
const particles = [];
const soundEvents = [];
const healthPickups = [];

let lastShot = 0;
const shootCooldown = 500;

class Bullet {
    constructor(x, y, angle, isPlayer = true) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 8;
        this.size = 4;
        this.isPlayer = isPlayer;
        this.color = isPlayer ? '#ffff00' : '#ff0000';
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }

    checkWallCollision() {
        const tileX = Math.floor(this.x / TILE_SIZE);
        const tileY = Math.floor(this.y / TILE_SIZE);
        
        if (tileY < 0 || tileY >= gameMap.length || tileX < 0 || tileX >= gameMap[0].length) {
            return true;
        }
        
        return gameMap[tileY][tileX] === 1;
    }

    collidesWith(obj) {
        const dx = this.x - (obj.x + obj.size / 2);
        const dy = this.y - (obj.y + obj.size / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.size + obj.size / 2;
    }
}

class Enemy {
    constructor(x, y, patrolPoints) {
        this.x = x;
        this.y = y;
        this.size = 20;
        this.speed = ENEMY_SPEED;
        this.angle = 0;
        this.state = 'patrol';
        this.patrolPoints = patrolPoints || [];
        this.currentPatrolIndex = 0;
        this.alertTimer = 0;
        this.searchTimer = 0;
        this.lastKnownPlayerX = 0;
        this.lastKnownPlayerY = 0;
        this.searchX = 0;
        this.searchY = 0;
        this.shootCooldown = 0;
        this.visionAngle = Math.PI / 3;
        this.visionRange = VISION_RANGE;
    }

    update() {
        this.shootCooldown = Math.max(0, this.shootCooldown - 16);

        switch(this.state) {
            case 'patrol':
                this.patrol();
                break;
            case 'alert':
                this.alert();
                break;
            case 'combat':
                this.combat();
                break;
            case 'search':
                this.search();
                break;
        }

        if (this.canSeePlayer()) {
            this.lastKnownPlayerX = player.x;
            this.lastKnownPlayerY = player.y;
            this.state = 'combat';
            this.alertTimer = ALERT_DURATION;
        }

        this.checkSoundEvents();
    }

    patrol() {
        if (this.patrolPoints.length === 0) return;

        const target = this.patrolPoints[this.currentPatrolIndex];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 5) {
            this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
        } else {
            this.angle = Math.atan2(dy, dx);
            this.move();
        }
    }

    alert() {
        this.alertTimer -= 16;
        
        const dx = this.searchX - this.x;
        const dy = this.searchY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 10) {
            this.angle = Math.atan2(dy, dx);
            this.move();
        } else {
            this.angle += 0.03;
        }

        if (this.alertTimer <= 0) {
            this.state = 'search';
            this.searchTimer = SEARCH_DURATION;
        }
    }

    combat() {
        this.alertTimer -= 16;

        const dx = this.lastKnownPlayerX - this.x;
        const dy = this.lastKnownPlayerY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        this.angle = Math.atan2(dy, dx);

        if (distance > 150) {
            this.move();
        }

        if (this.canSeePlayer() && this.shootCooldown === 0) {
            this.shoot();
            this.shootCooldown = 1000;
        }

        if (this.alertTimer <= 0 && !this.canSeePlayer()) {
            this.state = 'search';
            this.searchTimer = SEARCH_DURATION;
            this.searchX = this.lastKnownPlayerX;
            this.searchY = this.lastKnownPlayerY;
        }
    }

    search() {
        this.searchTimer -= 16;

        const dx = this.searchX - this.x;
        const dy = this.searchY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 10) {
            this.angle = Math.atan2(dy, dx);
            this.move();
        } else {
            this.angle += 0.05;
        }

        if (this.searchTimer <= 0) {
            this.state = 'patrol';
        }
    }

    move() {
        const newX = this.x + Math.cos(this.angle) * this.speed;
        const newY = this.y + Math.sin(this.angle) * this.speed;

        if (!this.checkWallCollision(newX, newY)) {
            this.x = newX;
            this.y = newY;
        }
    }

    checkWallCollision(x, y) {
        const tileX = Math.floor(x / TILE_SIZE);
        const tileY = Math.floor(y / TILE_SIZE);
        
        if (tileY < 0 || tileY >= gameMap.length || tileX < 0 || tileX >= gameMap[0].length) {
            return true;
        }
        
        return gameMap[tileY][tileX] === 1;
    }

    canSeePlayer() {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > this.visionRange) return false;

        const angleToPlayer = Math.atan2(dy, dx);
        let angleDiff = angleToPlayer - this.angle;
        
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        if (Math.abs(angleDiff) > this.visionAngle / 2) return false;

        return !this.hasWallBetween(this.x, this.y, player.x, player.y);
    }

    hasWallBetween(x1, y1, x2, y2) {
        const steps = 20;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = x1 + (x2 - x1) * t;
            const y = y1 + (y2 - y1) * t;
            
            const tileX = Math.floor(x / TILE_SIZE);
            const tileY = Math.floor(y / TILE_SIZE);
            
            if (tileY >= 0 && tileY < gameMap.length && tileX >= 0 && tileX < gameMap[0].length) {
                if (gameMap[tileY][tileX] === 1) return true;
            }
        }
        return false;
    }

    checkSoundEvents() {
        for (let sound of soundEvents) {
            const dx = sound.x - this.x;
            const dy = sound.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < HEARING_RANGE) {
                if (this.state === 'patrol' || this.state === 'alert' || this.state === 'search') {
                    this.state = 'alert';
                    this.alertTimer = ALERT_DURATION;
                    this.searchX = sound.x;
                    this.searchY = sound.y;
                }
            }
        }
    }

    shoot() {
        const bulletX = this.x + Math.cos(this.angle) * this.size;
        const bulletY = this.y + Math.sin(this.angle) * this.size;
        bullets.push(new Bullet(bulletX, bulletY, this.angle, false));
    }

    draw() {
        if (this.state === 'combat' || this.state === 'alert') {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.visionRange, 
                    this.angle - this.visionAngle / 2, 
                    this.angle + this.visionAngle / 2);
            ctx.lineTo(this.x, this.y);
            ctx.fill();
        } else if (this.state === 'search') {
            ctx.fillStyle = 'rgba(255, 165, 0, 0.1)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.visionRange, 
                    this.angle - this.visionAngle / 2, 
                    this.angle + this.visionAngle / 2);
            ctx.lineTo(this.x, this.y);
            ctx.fill();
        } else {
            ctx.fillStyle = 'rgba(100, 100, 100, 0.1)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.visionRange, 
                    this.angle - this.visionAngle / 2, 
                    this.angle + this.visionAngle / 2);
            ctx.lineTo(this.x, this.y);
            ctx.fill();
        }

        let bodyColor = '#4444ff';
        if (this.state === 'combat') bodyColor = '#ff0000';
        else if (this.state === 'alert') bodyColor = '#ff8800';
        else if (this.state === 'search') bodyColor = '#ffaa00';

        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(
            this.x + Math.cos(this.angle) * this.size,
            this.y + Math.sin(this.angle) * this.size
        );
        ctx.stroke();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 6;
        this.vy = (Math.random() - 0.5) * 6;
        this.life = 30;
        this.color = color;
        this.size = Math.random() * 3 + 2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life / 30;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1;
    }

    isDead() {
        return this.life <= 0;
    }
}

class Boss extends Enemy {
    constructor(x, y, patrolPoints) {
        super(x, y, patrolPoints);
        this.health = 5;
        this.maxHealth = 5;
        this.size = 30;
        this.speed = ENEMY_SPEED * 1.2;
        this.visionAngle = Math.PI / 2;
        this.visionRange = VISION_RANGE * 1.5;
        this.isBoss = true;
    }

    shoot() {
        if (this.shootCooldown <= 0) {
            const bulletX = this.x + Math.cos(this.angle) * this.size;
            const bulletY = this.y + Math.sin(this.angle) * this.size;
            bullets.push(new Bullet(bulletX, bulletY, this.angle, false));
            
            const offsetAngle1 = this.angle + 0.2;
            const offsetAngle2 = this.angle - 0.2;
            bullets.push(new Bullet(bulletX, bulletY, offsetAngle1, false));
            bullets.push(new Bullet(bulletX, bulletY, offsetAngle2, false));
            
            this.shootCooldown = 800;
        }
    }

    draw() {
        super.draw();
        
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BOSS', this.x, this.y - 25);
        
        const barWidth = 40;
        const barHeight = 5;
        const barX = this.x - barWidth / 2;
        const barY = this.y - 35;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        const healthWidth = (this.health / this.maxHealth) * barWidth;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(barX, barY, healthWidth, barHeight);
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
}

class HealthPickup {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 20;
        this.collected = false;
        this.pulseTime = 0;
    }

    update() {
        this.pulseTime += 0.1;
        
        const dx = this.x - player.x;
        const dy = this.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.size + player.size / 2 && !this.collected) {
            this.collected = true;
            lives = Math.min(lives + 1, 5);
            livesElement.textContent = lives;
            createExplosion(this.x, this.y, '#00ff00');
        }
    }

    draw() {
        if (this.collected) return;
        
        const pulse = Math.sin(this.pulseTime) * 3;
        const size = this.size + pulse;
        
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(this.x, this.y, size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x - size / 4, this.y);
        ctx.lineTo(this.x + size / 4, this.y);
        ctx.moveTo(this.x, this.y - size / 4);
        ctx.lineTo(this.x, this.y + size / 4);
        ctx.stroke();
    }
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function drawMap() {
    for (let y = 0; y < gameMap.length; y++) {
        for (let x = 0; x < gameMap[y].length; x++) {
            const tile = gameMap[y][x];
            
            if (tile === 1) {
                ctx.fillStyle = '#333333';
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = '#222222';
                ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            } else if (tile === 2) {
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = '#654321';
                ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            } else {
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }
}

function drawPlayer() {
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(
        player.x + Math.cos(player.angle) * player.size,
        player.y + Math.sin(player.angle) * player.size
    );
    ctx.stroke();
}

function updatePlayer() {
    let dx = 0;
    let dy = 0;

    if (keys.w) dy -= 1;
    if (keys.s) dy += 1;
    if (keys.a) dx -= 1;
    if (keys.d) dx += 1;

    if (dx !== 0 || dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy);
        dx /= length;
        dy /= length;

        const newX = player.x + dx * player.speed;
        const newY = player.y + dy * player.speed;

        if (!checkWallCollision(newX, player.y)) {
            player.x = newX;
        }
        if (!checkWallCollision(player.x, newY)) {
            player.y = newY;
        }
    }

    const dx2 = mouseX - player.x;
    const dy2 = mouseY - player.y;
    player.angle = Math.atan2(dy2, dx2);
}

function checkWallCollision(x, y) {
    const tileX = Math.floor(x / TILE_SIZE);
    const tileY = Math.floor(y / TILE_SIZE);
    
    if (tileY < 0 || tileY >= gameMap.length || tileX < 0 || tileX >= gameMap[0].length) {
        return true;
    }
    
    return gameMap[tileY][tileX] === 1;
}

function isValidSpawnPosition(x, y) {
    const tileX = Math.floor(x / TILE_SIZE);
    const tileY = Math.floor(y / TILE_SIZE);
    
    if (tileY < 0 || tileY >= gameMap.length || tileX < 0 || tileX >= gameMap[0].length) {
        return false;
    }
    
    const tile = gameMap[tileY][tileX];
    return tile === 0;
}

function findValidSpawnPosition(preferredX, preferredY) {
    if (isValidSpawnPosition(preferredX, preferredY)) {
        return {x: preferredX, y: preferredY};
    }
    
    const searchRadius = 80;
    for (let radius = 20; radius <= searchRadius; radius += 20) {
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
            const testX = preferredX + Math.cos(angle) * radius;
            const testY = preferredY + Math.sin(angle) * radius;
            
            if (isValidSpawnPosition(testX, testY)) {
                return {x: testX, y: testY};
            }
        }
    }
    
    for (let y = 1; y < gameMap.length - 1; y++) {
        for (let x = 1; x < gameMap[0].length - 1; x++) {
            if (gameMap[y][x] === 0) {
                return {x: x * TILE_SIZE + TILE_SIZE / 2, y: y * TILE_SIZE + TILE_SIZE / 2};
            }
        }
    }
    
    return {x: 100, y: 100};
}

function shoot() {
    const now = Date.now();
    if (now - lastShot > shootCooldown) {
        const bulletX = player.x + Math.cos(player.angle) * player.size;
        const bulletY = player.y + Math.sin(player.angle) * player.size;
        bullets.push(new Bullet(bulletX, bulletY, player.angle, true));
        lastShot = now;
        
        soundEvents.push({ x: player.x, y: player.y, time: now });
    }
}

function initLevel(level) {
    const levelData = levels[level - 1];
    gameMap = levelData.map;
    
    enemies.length = 0;
    bullets.length = 0;
    particles.length = 0;
    soundEvents.length = 0;
    
    VISION_RANGE = 200 + (level - 1) * 30;
    HEARING_RANGE = 300 + (level - 1) * 50;
    ENEMY_SPEED = 1.5 + (level - 1) * 0.3;
    ALERT_DURATION = Math.max(3000, 5000 - (level - 1) * 500);
    SEARCH_DURATION = 8000 + (level - 1) * 2000;
    
    if (levelData.playerStart) {
        const playerPos = findValidSpawnPosition(levelData.playerStart.x, levelData.playerStart.y);
        player.x = playerPos.x;
        player.y = playerPos.y;
    } else {
        const playerPos = findValidSpawnPosition(100, 100);
        player.x = playerPos.x;
        player.y = playerPos.y;
    }
    
    levelData.enemies.forEach(enemyData => {
        const spawnPos = findValidSpawnPosition(enemyData.x, enemyData.y);
        
        const validatedPatrol = enemyData.patrol.map(point => {
            return findValidSpawnPosition(point.x, point.y);
        });
        
        enemies.push(new Enemy(spawnPos.x, spawnPos.y, validatedPatrol));
    });
    
    if (levelData.boss) {
        const bossPos = findValidSpawnPosition(levelData.boss.x, levelData.boss.y);
        const validatedPatrol = levelData.boss.patrol.map(point => {
            return findValidSpawnPosition(point.x, point.y);
        });
        enemies.push(new Boss(bossPos.x, bossPos.y, validatedPatrol));
    }
    
    healthPickups.length = 0;
    if (levelData.healthPickups) {
        levelData.healthPickups.forEach(pickup => {
            const pickupPos = findValidSpawnPosition(pickup.x, pickup.y);
            healthPickups.push(new HealthPickup(pickupPos.x, pickupPos.y));
        });
    }
    
    totalEnemies = enemies.length;
}

function updateGame() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawMap();
    updatePlayer();
    drawPlayer();

    soundEvents.forEach((sound, index) => {
        if (Date.now() - sound.time > 100) {
            soundEvents.splice(index, 1);
        }
    });

    bullets.forEach((bullet, bulletIndex) => {
        bullet.update();
        bullet.draw();

        if (bullet.checkWallCollision()) {
            bullets.splice(bulletIndex, 1);
            return;
        }

        if (bullet.isPlayer) {
            enemies.forEach((enemy, enemyIndex) => {
                if (bullet.collidesWith(enemy)) {
                    if (enemy.isBoss) {
                        enemy.health--;
                        bullets.splice(bulletIndex, 1);
                        createExplosion(enemy.x, enemy.y, '#ff6600');
                        if (enemy.health <= 0) {
                            createExplosion(enemy.x, enemy.y, '#ff0000');
                            enemies.splice(enemyIndex, 1);
                            score += 500;
                            scoreElement.textContent = score;
                        }
                    } else {
                        createExplosion(enemy.x, enemy.y, '#ff6600');
                        enemies.splice(enemyIndex, 1);
                        bullets.splice(bulletIndex, 1);
                        score += 100;
                        scoreElement.textContent = score;
                    }
                }
            });
        } else {
            if (bullet.collidesWith(player) && lives > 0) {
                createExplosion(player.x, player.y, '#ff0000');
                bullets.splice(bulletIndex, 1);
                lives--;
                livesElement.textContent = lives;
                if (lives <= 0) {
                    lives = 0;
                    livesElement.textContent = lives;
                    endGame();
                }
            }
        }
    });

    enemies.forEach(enemy => {
        enemy.update();
        enemy.draw();
    });
    
    healthPickups.forEach(pickup => {
        pickup.update();
        pickup.draw();
    });
    
    if (enemies.length === 0 && totalEnemies > 0) {
        checkLevelComplete();
    }

    particles.forEach((particle, index) => {
        particle.update();
        particle.draw();
        if (particle.isDead()) {
            particles.splice(index, 1);
        }
    });

    if (gameRunning) {
        requestAnimationFrame(updateGame);
    }
}

function endGame() {
    gameRunning = false;
    finalScoreElement.textContent = score;
    document.getElementById('gameOverTitle').textContent = 'Konec hry!';
    document.getElementById('levelInfo').textContent = `Dosáhl jsi úrovně ${currentLevel}`;
    gameOverElement.classList.remove('hidden');
}

function checkLevelComplete() {
    gameRunning = false;
    finalScoreElement.textContent = score;
    
    if (currentLevel < levels.length) {
        document.getElementById('gameOverTitle').textContent = 'Úroveň dokončena!';
        document.getElementById('levelInfo').textContent = `Připrav se na úroveň ${currentLevel + 1}`;
        document.getElementById('restartBtn').textContent = 'Další úroveň';
    } else {
        document.getElementById('gameOverTitle').textContent = 'Gratulujeme!';
        document.getElementById('levelInfo').textContent = 'Dokončil jsi všechny úrovně!';
        document.getElementById('restartBtn').textContent = 'Hrát znovu';
    }
    
    gameOverElement.classList.remove('hidden');
}

function restartGame() {
    const wasComplete = enemies.length === 0 && totalEnemies > 0;
    const wasDead = lives <= 0;
    
    if (wasDead) {
        currentLevel = 1;
        score = 0;
        lives = 3;
    } else if (wasComplete && currentLevel < levels.length) {
        currentLevel++;
    } else if (wasComplete && currentLevel >= levels.length) {
        currentLevel = 1;
        score = 0;
        lives = 3;
    }
    
    gameRunning = true;
    scoreElement.textContent = score;
    livesElement.textContent = lives;
    document.getElementById('levelElement').textContent = currentLevel;
    gameOverElement.classList.add('hidden');
    document.getElementById('restartBtn').textContent = 'Hrát znovu';
    lastShot = 0;
    initLevel(currentLevel);
    updateGame();
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'w' || e.key === 'W') keys.w = true;
    if (e.key === 'a' || e.key === 'A') keys.a = true;
    if (e.key === 's' || e.key === 'S') keys.s = true;
    if (e.key === 'd' || e.key === 'D') keys.d = true;
    if (e.key === 'Escape') {
        returnToMenu();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'w' || e.key === 'W') keys.w = false;
    if (e.key === 'a' || e.key === 'A') keys.a = false;
    if (e.key === 's' || e.key === 'S') keys.s = false;
    if (e.key === 'd' || e.key === 'D') keys.d = false;
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

canvas.addEventListener('click', () => {
    if (gameRunning) {
        shoot();
    }
});

restartBtn.addEventListener('click', restartGame);

const mainMenu = document.getElementById('mainMenu');
const startNewGameBtn = document.getElementById('startNewGameBtn');
const levelBtns = document.querySelectorAll('.level-btn');

function returnToMenu() {
    gameRunning = false;
    mainMenu.classList.remove('hidden');
    canvas.classList.add('hidden');
    gameOverElement.classList.add('hidden');
}

function startGame(level) {
    currentLevel = level;
    score = 0;
    lives = 3;
    gameRunning = true;
    
    mainMenu.classList.add('hidden');
    canvas.classList.remove('hidden');
    
    scoreElement.textContent = score;
    livesElement.textContent = lives;
    document.getElementById('levelElement').textContent = currentLevel;
    
    initLevel(currentLevel);
    updateGame();
}

startNewGameBtn.addEventListener('click', () => {
    startGame(1);
});

levelBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const level = parseInt(btn.getAttribute('data-level'));
        startGame(level);
    });
});
