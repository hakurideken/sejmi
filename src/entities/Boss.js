import { Enemy } from './Enemy.js';
import { CONFIG } from '../config/constants.js';
import { Bullet } from './Bullet.js';

export class Boss extends Enemy {
    constructor(x, y, patrolPoints) {
        super(x, y, patrolPoints);
        this.health = CONFIG.BOSS.HEALTH;
        this.maxHealth = CONFIG.BOSS.HEALTH;
        this.size = CONFIG.BOSS.SIZE;
        this.speed = CONFIG.ENEMY.BASE_SPEED * CONFIG.BOSS.SPEED_MULTIPLIER;
        this.visionAngle = Math.PI / 2;
        this.visionRange = CONFIG.ENEMY.BASE_VISION_RANGE * 1.5;
        this.isBoss = true;
        this.randomPatrol = false;
        this.originalPatrolPoints = patrolPoints ? [...patrolPoints] : [];
    }

    shoot() {
        if (this.shootCooldown <= 0) {
            const bulletX = this.x + Math.cos(this.angle) * this.size;
            const bulletY = this.y + Math.sin(this.angle) * this.size;
            this.bullets.push(new Bullet(bulletX, bulletY, this.angle, false));
            
            const offsetAngle1 = this.angle + 0.2;
            const offsetAngle2 = this.angle - 0.2;
            this.bullets.push(new Bullet(bulletX, bulletY, offsetAngle1, false));
            this.bullets.push(new Bullet(bulletX, bulletY, offsetAngle2, false));
            
            this.shootCooldown = 800;
        }
    }

    draw(ctx) {
        // Volání parent draw() pro vykreslení vision cone a těla
        super.draw(ctx);
        
        // Boss specifické vykreslování
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BOSS', this.x, this.y - 25);
        
        // Health bar
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
