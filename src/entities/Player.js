import { CONFIG } from '../config/constants.js';
import { checkWallCollision } from '../utils/collision.js';

export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = CONFIG.PLAYER.SIZE;
        this.speed = CONFIG.PLAYER.SPEED;
        this.angle = 0;
    }

    update(keys, mouseX, mouseY, gameMap, canvas, deltaTime = 0.016) {
        let dx = 0;
        let dy = 0;

        if (keys.w) dy -= 1;
        if (keys.s) dy += 1;
        if (keys.a) dx -= 1;
        if (keys.d) dx += 1;

        if (dx !== 0 || dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            // Rychlost * 60 pro převod na "pixely za sekundu" a vynásobení deltaTime
            dx = (dx / length) * this.speed * 60 * deltaTime;
            dy = (dy / length) * this.speed * 60 * deltaTime;

            const newX = this.x + dx;
            const newY = this.y + dy;

            if (!checkWallCollision(newX, this.y, gameMap)) {
                this.x = newX;
            }
            if (!checkWallCollision(this.x, newY, gameMap)) {
                this.y = newY;
            }
        }

        const dx2 = mouseX - this.x;
        const dy2 = mouseY - this.y;
        this.angle = Math.atan2(dy2, dx2);
    }

    draw(ctx, playerInvisible) {
        if (playerInvisible) {
            ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        } else {
            ctx.fillStyle = '#00ff00';
        }
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();

        if (playerInvisible) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        } else {
            ctx.strokeStyle = '#ffffff';
        }
        
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
