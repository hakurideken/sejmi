import { CONFIG } from '../config/constants.js';
import { checkWallCollision } from '../utils/collision.js';
import { findPath } from '../utils/pathfinding.js';

export class Enemy {
    constructor(x, y, patrolPoints) {
        this.x = x;
        this.y = y;
        this.size = CONFIG.ENEMY.SIZE;
        this.speed = CONFIG.ENEMY.BASE_SPEED;
        this.angle = 0;
        this.state = 'patrol';
        this.patrolPoints = patrolPoints;
        this.currentPatrolIndex = 0;
        this.lastKnownPlayerPos = null;
        this.alertTimer = 0;
        this.searchTimer = 0;
        this.path = null;
        this.pathIndex = 0;
        this.stuckTimer = 0;
        this.lastPosition = {x: x, y: y};
        this.randomPatrol = false;
        this.randomPatrolTimer = 0;
        this.randomTarget = null;
        this.isBoss = false;
    }

    update(player, gameMap, soundEvents, bullets, VISION_RANGE, HEARING_RANGE, ALERT_DURATION, SEARCH_DURATION) {
        const oldX = this.x;
        const oldY = this.y;

        if (this.randomPatrol) {
            this.updateRandomPatrol(gameMap);
        }

        switch (this.state) {
            case 'patrol':
                this.updatePatrol(player, gameMap, soundEvents, VISION_RANGE, HEARING_RANGE);
                break;
            case 'alert':
                this.updateAlert(player, gameMap, VISION_RANGE, ALERT_DURATION);
                break;
            case 'combat':
                this.updateCombat(player, gameMap, bullets, VISION_RANGE);
                break;
            case 'search':
                this.updateSearch(player, gameMap, soundEvents, VISION_RANGE, HEARING_RANGE, SEARCH_DURATION);
                break;
        }

        if (Math.abs(this.x - oldX) < 0.1 && Math.abs(this.y - oldY) < 0.1) {
            this.stuckTimer++;
            if (this.stuckTimer > 60) {
                this.path = null;
                this.stuckTimer = 0;
            }
        } else {
            this.stuckTimer = 0;
        }

        this.lastPosition = {x: this.x, y: this.y};
    }

    updateRandomPatrol(gameMap) {
        this.randomPatrolTimer--;
        if (this.randomPatrolTimer <= 0 || !this.randomTarget) {
            const mapWidth = gameMap[0].length * CONFIG.TILE_SIZE;
            const mapHeight = gameMap.length * CONFIG.TILE_SIZE;
            this.randomTarget = {
                x: Math.random() * mapWidth,
                y: Math.random() * mapHeight
            };
            this.randomPatrolTimer = 300 + Math.random() * 300;
        }
    }

    updatePatrol(player, gameMap, soundEvents, VISION_RANGE, HEARING_RANGE) {
        if (this.canSeePlayer(player, gameMap, VISION_RANGE)) {
            this.state = 'alert';
            this.alertTimer = 0;
            this.lastKnownPlayerPos = {x: player.x, y: player.y};
            return;
        }

        for (const sound of soundEvents) {
            const dist = Math.sqrt(Math.pow(this.x - sound.x, 2) + Math.pow(this.y - sound.y, 2));
            if (dist < HEARING_RANGE) {
                this.state = 'alert';
                this.alertTimer = 0;
                this.lastKnownPlayerPos = {x: sound.x, y: sound.y};
                return;
            }
        }

        if (this.randomPatrol && this.randomTarget) {
            this.moveTowards(this.randomTarget.x, this.randomTarget.y, gameMap, CONFIG.ENEMY.PATROL_SPEED_MULTIPLIER);
        } else if (this.patrolPoints.length > 0) {
            const target = this.patrolPoints[this.currentPatrolIndex];
            const dist = Math.sqrt(Math.pow(this.x - target.x, 2) + Math.pow(this.y - target.y, 2));
            
            if (dist < 20) {
                this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
            }
            
            this.moveTowards(target.x, target.y, gameMap, CONFIG.ENEMY.PATROL_SPEED_MULTIPLIER);
        }
    }

    updateAlert(player, gameMap, VISION_RANGE, ALERT_DURATION) {
        this.alertTimer++;
        
        if (this.canSeePlayer(player, gameMap, VISION_RANGE)) {
            this.state = 'combat';
            this.lastKnownPlayerPos = {x: player.x, y: player.y};
            return;
        }
        
        if (this.alertTimer > ALERT_DURATION / 16.67) {
            this.state = 'search';
            this.searchTimer = 0;
            return;
        }
        
        if (this.lastKnownPlayerPos) {
            this.moveTowards(this.lastKnownPlayerPos.x, this.lastKnownPlayerPos.y, gameMap, CONFIG.ENEMY.ALERT_SPEED_MULTIPLIER);
        }
    }

    updateCombat(player, gameMap, bullets, VISION_RANGE) {
        if (!this.canSeePlayer(player, gameMap, VISION_RANGE)) {
            this.state = 'search';
            this.searchTimer = 0;
            return;
        }
        
        this.lastKnownPlayerPos = {x: player.x, y: player.y};
        this.moveTowards(player.x, player.y, gameMap, CONFIG.ENEMY.COMBAT_SPEED_MULTIPLIER);
        
        if (Math.random() < 0.02) {
            this.shoot(player, bullets);
        }
    }

    updateSearch(player, gameMap, soundEvents, VISION_RANGE, HEARING_RANGE, SEARCH_DURATION) {
        this.searchTimer++;
        
        if (this.canSeePlayer(player, gameMap, VISION_RANGE)) {
            this.state = 'combat';
            this.lastKnownPlayerPos = {x: player.x, y: player.y};
            return;
        }
        
        for (const sound of soundEvents) {
            const dist = Math.sqrt(Math.pow(this.x - sound.x, 2) + Math.pow(this.y - sound.y, 2));
            if (dist < HEARING_RANGE) {
                this.state = 'alert';
                this.alertTimer = 0;
                this.lastKnownPlayerPos = {x: sound.x, y: sound.y};
                return;
            }
        }
        
        if (this.searchTimer > SEARCH_DURATION / 16.67) {
            this.state = 'patrol';
            this.path = null;
            return;
        }
        
        if (this.lastKnownPlayerPos) {
            this.moveTowards(this.lastKnownPlayerPos.x, this.lastKnownPlayerPos.y, gameMap, CONFIG.ENEMY.SEARCH_SPEED_MULTIPLIER);
        }
    }

    moveTowards(targetX, targetY, gameMap, speedMultiplier = 1) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 5) {
            return;
        }
        
        this.angle = Math.atan2(dy, dx);
        
        const moveX = (dx / distance) * this.speed * speedMultiplier;
        const moveY = (dy / distance) * this.speed * speedMultiplier;
        
        const newX = this.x + moveX;
        const newY = this.y + moveY;
        
        if (!checkWallCollision(newX, this.y, gameMap)) {
            this.x = newX;
        } else if (!this.path || this.pathIndex >= this.path.length) {
            this.path = findPath(this.x, this.y, targetX, targetY, gameMap);
            this.pathIndex = 0;
        }
        
        if (!checkWallCollision(this.x, newY, gameMap)) {
            this.y = newY;
        } else if (!this.path || this.pathIndex >= this.path.length) {
            this.path = findPath(this.x, this.y, targetX, targetY, gameMap);
            this.pathIndex = 0;
        }
        
        if (this.path && this.pathIndex < this.path.length) {
            const pathTarget = this.path[this.pathIndex];
            const pathDist = Math.sqrt(
                Math.pow(this.x - pathTarget.x, 2) + 
                Math.pow(this.y - pathTarget.y, 2)
            );
            
            if (pathDist < 10) {
                this.pathIndex++;
            }
            
            if (this.pathIndex < this.path.length) {
                const pathDx = pathTarget.x - this.x;
                const pathDy = pathTarget.y - this.y;
                const pathDistance = Math.sqrt(pathDx * pathDx + pathDy * pathDy);
                
                if (pathDistance > 0) {
                    const pathMoveX = (pathDx / pathDistance) * this.speed * speedMultiplier;
                    const pathMoveY = (pathDy / pathDistance) * this.speed * speedMultiplier;
                    
                    const pathNewX = this.x + pathMoveX;
                    const pathNewY = this.y + pathMoveY;
                    
                    if (!checkWallCollision(pathNewX, this.y, gameMap)) {
                        this.x = pathNewX;
                    }
                    if (!checkWallCollision(this.x, pathNewY, gameMap)) {
                        this.y = pathNewY;
                    }
                }
            }
        }
    }

    canSeePlayer(player, gameMap, VISION_RANGE) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > VISION_RANGE) {
            return false;
        }
        
        const angleToPlayer = Math.atan2(dy, dx);
        let angleDiff = Math.abs(angleToPlayer - this.angle);
        if (angleDiff > Math.PI) {
            angleDiff = 2 * Math.PI - angleDiff;
        }
        
        const visionCone = Math.PI / 3;
        if (angleDiff > visionCone) {
            return false;
        }
        
        const steps = Math.floor(distance / 10);
        for (let i = 1; i <= steps; i++) {
            const checkX = this.x + (dx / steps) * i;
            const checkY = this.y + (dy / steps) * i;
            if (checkWallCollision(checkX, checkY, gameMap)) {
                return false;
            }
        }
        
        return true;
    }

    shoot(player, bullets) {
        const BulletClass = bullets[0]?.constructor || Object;
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        bullets.push(new BulletClass(this.x, this.y, angle, false));
    }

    draw(ctx, gameMap, VISION_RANGE) {
        let color;
        switch (this.state) {
            case 'patrol':
                color = '#4444ff';
                break;
            case 'alert':
                color = '#ff8800';
                break;
            case 'combat':
                color = '#ff0000';
                break;
            case 'search':
                color = '#ffff00';
                break;
        }
        
        if (this.state === 'patrol' || this.state === 'alert') {
            this.drawVisionCone(ctx, gameMap, VISION_RANGE);
        }
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
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

    drawVisionCone(ctx, gameMap, VISION_RANGE) {
        ctx.fillStyle = 'rgba(255, 255, 0, 0.1)';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        
        const visionCone = Math.PI / 3;
        const startAngle = this.angle - visionCone;
        const endAngle = this.angle + visionCone;
        const steps = 20;
        
        for (let i = 0; i <= steps; i++) {
            const angle = startAngle + (endAngle - startAngle) * (i / steps);
            let rayLength = VISION_RANGE;
            
            const raySteps = Math.floor(VISION_RANGE / 10);
            for (let j = 1; j <= raySteps; j++) {
                const checkDist = (VISION_RANGE / raySteps) * j;
                const checkX = this.x + Math.cos(angle) * checkDist;
                const checkY = this.y + Math.sin(angle) * checkDist;
                
                if (checkWallCollision(checkX, checkY, gameMap)) {
                    rayLength = checkDist;
                    break;
                }
            }
            
            ctx.lineTo(
                this.x + Math.cos(angle) * rayLength,
                this.y + Math.sin(angle) * rayLength
            );
        }
        
        ctx.closePath();
        ctx.fill();
    }
}
