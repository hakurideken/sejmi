import { CONFIG } from '../config/constants.js';
import { checkWallCollision } from '../utils/collision.js';

export class Bullet {
    constructor(x, y, angle, isPlayer = true) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = CONFIG.BULLET.SPEED;
        this.size = CONFIG.BULLET.SIZE;
        this.isPlayer = isPlayer;
    }

    update(deltaTime = 0.016) {
        // Rychlost * 60 pro převod na "pixely za sekundu" a vynásobení deltaTime
        this.x += Math.cos(this.angle) * this.speed * 60 * deltaTime;
        this.y += Math.sin(this.angle) * this.speed * 60 * deltaTime;
    }

    draw(ctx) {
        ctx.fillStyle = this.isPlayer ? '#ffff00' : '#ff0000';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }

    checkWallCollision(gameMap) {
        return checkWallCollision(this.x, this.y, gameMap);
    }

    collidesWith(entity) {
        const dx = this.x - entity.x;
        const dy = this.y - entity.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.size + entity.size / 2;
    }
}
