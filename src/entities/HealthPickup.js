import { CONFIG } from '../config/constants.js';

export class HealthPickup {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 20;
        this.collected = false;
        this.pulseTime = 0;
    }

    update() {
        this.pulseTime += 0.1;
    }

    draw(ctx) {
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

    collidesWith(player) {
        const dx = this.x - player.x;
        const dy = this.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.size + player.size / 2;
    }
}
