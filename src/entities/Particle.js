import { CONFIG } from '../config/constants.js';

export class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 6;
        this.vy = (Math.random() - 0.5) * 6;
        this.life = 30;
        this.color = color;
        this.size = Math.random() * 3 + 2;
    }

    update(deltaTime = 0.016) {
        // Rychlost * 60 pro převod na "pixely za sekundu" a vynásobení deltaTime
        this.x += this.vx * 60 * deltaTime;
        this.y += this.vy * 60 * deltaTime;
        this.life -= 60 * deltaTime; // Snižování života proporcionálně k času
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life / 30;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1;
    }

    isDead() {
        return this.life <= 0;
    }
}

export function createExplosion(x, y, color, particles) {
    for (let i = 0; i < CONFIG.PARTICLE.COUNT; i++) {
        particles.push(new Particle(x, y, color));
    }
}
