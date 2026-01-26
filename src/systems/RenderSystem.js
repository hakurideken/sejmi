import { CONFIG } from '../config/constants.js';

export class RenderSystem {
    constructor(ctx) {
        this.ctx = ctx;
    }

    clear() {
        this.ctx.clearRect(0, 0, CONFIG.CANVAS.WIDTH, CONFIG.CANVAS.HEIGHT);
    }

    drawMap(gameMap) {
        for (let y = 0; y < gameMap.length; y++) {
            for (let x = 0; x < gameMap[y].length; x++) {
                const tile = gameMap[y][x];
                if (tile === 1) {
                    this.ctx.fillStyle = '#333333';
                    this.ctx.fillRect(x * CONFIG.TILE_SIZE, y * CONFIG.TILE_SIZE, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
                    this.ctx.strokeStyle = '#222222';
                    this.ctx.strokeRect(x * CONFIG.TILE_SIZE, y * CONFIG.TILE_SIZE, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
                } else if (tile === 2) {
                    this.ctx.fillStyle = '#8B4513';
                    this.ctx.fillRect(x * CONFIG.TILE_SIZE, y * CONFIG.TILE_SIZE, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
                    this.ctx.strokeStyle = '#654321';
                    this.ctx.strokeRect(x * CONFIG.TILE_SIZE, y * CONFIG.TILE_SIZE, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
                } else {
                    this.ctx.fillStyle = '#1a1a1a';
                    this.ctx.fillRect(x * CONFIG.TILE_SIZE, y * CONFIG.TILE_SIZE, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
                }
            }
        }
    }

    drawTutorial(tutorialTextVisible) {
        if (!tutorialTextVisible) return;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillRect(10, 10, CONFIG.CANVAS.WIDTH - 20, 120);
        
        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillText('Tutorial - Nauč se základy!', 20, 40);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('WASD - Pohyb  |  Myš - Míření  |  Klik - Střelba  |  ESC - Menu', 20, 70);
        this.ctx.fillText('V tutorialu jsi nesmrtelný. Nauč se ovládat hru a pak pokračuj na další úrovně.', 20, 95);
        this.ctx.fillText('Stiskni ENTER pro přeskočení tutorialu  |  Tento text zmizí po pohybu', 20, 110);
    }
}
