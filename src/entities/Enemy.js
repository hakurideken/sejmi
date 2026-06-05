import { CONFIG } from '../config/constants.js';
import { findPath } from '../utils/pathfinding.js';
import { checkWallCollision } from '../utils/collision.js';
import { Bullet } from './Bullet.js';

export class Enemy {
    constructor(x, y, patrolPoints) {
        this.x = x;
        this.y = y;
        this.size = 20;
        this.speed = CONFIG.ENEMY.BASE_SPEED;
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
        this.visionRange = CONFIG.ENEMY.BASE_VISION_RANGE;
        this.stuckTimer = 0;
        this.lastX = x;
        this.lastY = y;
        this.path = [];
        this.pathIndex = 0;
        this.randomPatrol = false;
        this.randomPatrolTimer = 0;
        this.originalPatrolPoints = patrolPoints ? [...patrolPoints] : [];
        this.returningToPatrol = false;
        this.pauseTimer = 0;
        this.isBoss = false;

        // PvP: přímé ovládání strážcem
        this.isPlayerControlled = false;
        this.guardInput = null; // { keys, mouseX, mouseY, shooting }
    }

    update(player, gameMap, soundEvents, bullets, VISION_RANGE, HEARING_RANGE, ALERT_DURATION, SEARCH_DURATION, enemies, playerInvisible, deltaTime = 0.016) {
        this.gameMap = gameMap;
        this.player = player;
        this.soundEvents = soundEvents;
        this.bullets = bullets;
        this.VISION_RANGE = VISION_RANGE;
        this.HEARING_RANGE = HEARING_RANGE;
        this.ALERT_DURATION = ALERT_DURATION;
        this.SEARCH_DURATION = SEARCH_DURATION;
        this.enemies = enemies;
        this.playerInvisible = playerInvisible;
        this.visionRange = VISION_RANGE;
        this.deltaTime = deltaTime;
        
        this.shootCooldown = Math.max(0, this.shootCooldown - deltaTime * 1000);

        // PvP: přímé ovládání strážcem (přebije AI)
        if (this.isPlayerControlled && this.guardInput) {
            this._handleGuardControl();
            return;
        }

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

        if (this.canSeePlayer() && this.state !== 'combat') {
            this.lastKnownPlayerX = this.player.x;
            this.lastKnownPlayerY = this.player.y;
            this.state = 'combat';
            this.alertTimer = this.ALERT_DURATION;
            this.pauseTimer = 0;
        }

        this.checkSoundEvents();
    }

    patrol() {
        if (this.randomPatrol) {
            this.randomPatrolTimer--;
            
            if (this.randomPatrolTimer <= 0 || this.path.length === 0 || this.pathIndex >= this.path.length) {
                let attempts = 0;
                let randomX, randomY, validTarget = false;
                
                while (!validTarget && attempts < 10) {
                    randomX = Math.random() * (this.gameMap[0].length * CONFIG.TILE_SIZE);
                    randomY = Math.random() * (this.gameMap.length * CONFIG.TILE_SIZE);
                    
                    const tileX = Math.floor(randomX / CONFIG.TILE_SIZE);
                    const tileY = Math.floor(randomY / CONFIG.TILE_SIZE);
                    
                    if (tileY >= 0 && tileY < this.gameMap.length && tileX >= 0 && tileX < this.gameMap[0].length) {
                        if (this.gameMap[tileY][tileX] !== 1) {
                            validTarget = true;
                        }
                    }
                    attempts++;
                }
                
                if (validTarget) {
                    this.path = findPath(this.x, this.y, randomX, randomY, this.gameMap);
                    this.pathIndex = 0;
                    this.randomPatrolTimer = 300 + Math.random() * 300;
                    
                    if (!this.path || this.path.length === 0) {
                        this.randomPatrolTimer = 0;
                        return;
                    }
                }
            }
            
            if (this.path && this.path.length > 0 && this.pathIndex < this.path.length) {
                this.followPath();
            }
        } else {
            if (this.patrolPoints.length === 0) return;

            const target = this.patrolPoints[this.currentPatrolIndex];
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 15) {
                this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
                this.path = [];
                this.pathIndex = 0;
                return;
            }
            
            if (this.path.length === 0 || this.pathIndex >= this.path.length) {
                const newPath = findPath(this.x, this.y, target.x, target.y, this.gameMap);
                if (newPath && newPath.length > 0) {
                    this.path = newPath;
                    this.pathIndex = 0;
                }
            }
            
            if (this.path && this.path.length > 0 && this.pathIndex < this.path.length) {
                this.followPath();
            } else {
                this.angle = Math.atan2(dy, dx);
                this.move();
            }
        }
    }

    alert() {
        this.alertTimer -= this.deltaTime * 1000;
        
        if (this.path.length === 0) {
            this.path = findPath(this.x, this.y, this.searchX, this.searchY, this.gameMap);
            this.pathIndex = 0;
        }
        
        if (this.path && this.path.length > 0) {
            this.followPath();
        } else {
            const dx = this.searchX - this.x;
            const dy = this.searchY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 10) {
                if (!this.hasWallBetween(this.x, this.y, this.searchX, this.searchY)) {
                    this.angle = Math.atan2(dy, dx);
                }
                this.move();
            } else {
                this.angle += 0.03;
                this.stuckTimer = 0;
            }
        }

        if (this.alertTimer <= 0) {
            if (this.randomPatrol) {
                this.state = 'search';
                this.searchTimer = this.SEARCH_DURATION;
                this.path = [];
            } else {
                this.state = 'patrol';
                this.patrolPoints = [...this.originalPatrolPoints];
            }
        }
    }

    combat() {
        this.alertTimer -= 16;

        if (this.canSeePlayer()) {
            this.lastKnownPlayerX = this.player.x;
            this.lastKnownPlayerY = this.player.y;
            this.pauseTimer = 0;
            
            const dx = this.lastKnownPlayerX - this.x;
            const dy = this.lastKnownPlayerY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            this.angle = Math.atan2(dy, dx);

            if (distance > 150) {
                this.move();
            }

            if (this.shootCooldown === 0) {
                this.shoot();
                this.shootCooldown = 1000;
            }
        } else {
            if (this.pauseTimer === 0) {
                this.pauseTimer = 1000;
            }
            
            this.pauseTimer -= this.deltaTime * 1000;
            
            if (this.pauseTimer <= 0) {
                this.state = 'search';
                this.searchTimer = this.SEARCH_DURATION;
                this.searchX = this.lastKnownPlayerX;
                this.searchY = this.lastKnownPlayerY;
                this.path = [];
                this.pauseTimer = 0;
            }
        }
    }

    search() {
        this.searchTimer -= this.deltaTime * 1000;

        if (this.path.length === 0) {
            this.path = findPath(this.x, this.y, this.searchX, this.searchY, this.gameMap);
            this.pathIndex = 0;
        }
        
        if (this.path && this.path.length > 0) {
            this.followPath();
        } else {
            const dx = this.searchX - this.x;
            const dy = this.searchY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 10) {
                if (!this.hasWallBetween(this.x, this.y, this.searchX, this.searchY)) {
                    this.angle = Math.atan2(dy, dx);
                }
                this.move();
            } else {
                this.angle += 0.05;
                this.stuckTimer = 0;
            }
        }

        if (this.searchTimer <= 0) {
            this.state = 'patrol';
            this.path = [];
            if (!this.randomPatrol) {
                this.patrolPoints = [...this.originalPatrolPoints];
            }
        }
    }

    move() {
        const currentSpeed = this.state === 'patrol' ? 1.0 : this.speed;
        
        // Rychlost * 60 pro převod na "pixely za sekundu" a vynásobení deltaTime
        let moveX = Math.cos(this.angle) * currentSpeed * 60 * this.deltaTime;
        let moveY = Math.sin(this.angle) * currentSpeed * 60 * this.deltaTime;
        
        const avoidance = this.avoidOtherEnemies();
        if (avoidance) {
            moveX += avoidance.x;
            moveY += avoidance.y;
        }
        
        const newX = this.x + moveX;
        const newY = this.y + moveY;

        if (!this.checkWallCollision(newX, newY)) {
            this.x = newX;
            this.y = newY;
            this.stuckTimer = 0;
        } else {
            this.stuckTimer++;
            if (this.stuckTimer > 10) {
                this.tryAlternativeAngles();
            }
        }
    }

    avoidOtherEnemies() {
        const avoidanceRadius = 30;
        let avoidX = 0;
        let avoidY = 0;
        let nearbyCount = 0;
        
        for (let other of this.enemies) {
            if (other === this) continue;
            
            const dx = this.x - other.x;
            const dy = this.y - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < avoidanceRadius && distance > 0) {
                avoidX += (dx / distance) * 0.5;
                avoidY += (dy / distance) * 0.5;
                nearbyCount++;
            }
        }
        
        if (nearbyCount > 0) {
            return {x: avoidX, y: avoidY};
        }
        
        return null;
    }

    followPath() {
        if (!this.path || this.pathIndex >= this.path.length) {
            return;
        }
        
        const target = this.path[this.pathIndex];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const threshold = this.state === 'patrol' ? 15 : 10;
        
        if (distance < threshold) {
            this.pathIndex++;
        } else {
            this.angle = Math.atan2(dy, dx);
            this.move();
        }
    }

    tryAlternativeAngles() {
        const angles = [
            this.angle + Math.PI / 4,
            this.angle - Math.PI / 4,
            this.angle + Math.PI / 2,
            this.angle - Math.PI / 2,
            this.angle + Math.PI * 3 / 4,
            this.angle - Math.PI * 3 / 4
        ];

        for (let testAngle of angles) {
            const testX = this.x + Math.cos(testAngle) * this.speed;
            const testY = this.y + Math.sin(testAngle) * this.speed;
            
            if (!this.checkWallCollision(testX, testY)) {
                this.angle = testAngle;
                this.x = testX;
                this.y = testY;
                this.stuckTimer = 0;
                return;
            }
        }
        
        this.stuckTimer = 0;
    }

    checkWallCollision(x, y) {
        const tileX = Math.floor(x / CONFIG.TILE_SIZE);
        const tileY = Math.floor(y / CONFIG.TILE_SIZE);
        
        if (tileY < 0 || tileY >= this.gameMap.length || tileX < 0 || tileX >= this.gameMap[0].length) {
            return true;
        }
        
        return this.gameMap[tileY][tileX] === 1;
    }

    canSeePlayer() {
        if (this.playerInvisible) return false;
        
        const dx = this.player.x - this.x;
        const dy = this.player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > this.visionRange) return false;

        const angleToPlayer = Math.atan2(dy, dx);
        let angleDiff = angleToPlayer - this.angle;
        
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        if (Math.abs(angleDiff) > this.visionAngle / 2) return false;

        return !this.hasWallBetween(this.x, this.y, this.player.x, this.player.y);
    }

    hasWallBetween(x1, y1, x2, y2) {
        const steps = 20;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = x1 + (x2 - x1) * t;
            const y = y1 + (y2 - y1) * t;
            
            const tileX = Math.floor(x / CONFIG.TILE_SIZE);
            const tileY = Math.floor(y / CONFIG.TILE_SIZE);
            
            if (tileY >= 0 && tileY < this.gameMap.length && tileX >= 0 && tileX < this.gameMap[0].length) {
                if (this.gameMap[tileY][tileX] === 1) return true;
            }
        }
        return false;
    }

    checkSoundEvents() {
        if (this.playerInvisible) return;
        
        for (let sound of this.soundEvents) {
            const dx = sound.x - this.x;
            const dy = sound.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.HEARING_RANGE) {
                if (this.state === 'patrol' || this.state === 'alert' || this.state === 'search' || this.state === 'combat') {
                    this.state = 'alert';
                    this.alertTimer = this.ALERT_DURATION;
                    this.searchX = sound.x;
                    this.searchY = sound.y;
                    this.path = [];
                }
            }
        }
    }

    shoot() {
        const bulletX = this.x + Math.cos(this.angle) * this.size;
        const bulletY = this.y + Math.sin(this.angle) * this.size;
        this.bullets.push(new Bullet(bulletX, bulletY, this.angle, false));
    }

    /**
     * PvP: pohyb a střelba ovládaná strážcem (přebíjí AI).
     */
    _handleGuardControl() {
        const { keys, mouseX, mouseY, shooting } = this.guardInput;

        let dx = 0, dy = 0;
        if (keys.w) dy -= 1;
        if (keys.s) dy += 1;
        if (keys.a) dx -= 1;
        if (keys.d) dx += 1;

        if (dx !== 0 || dy !== 0) {
            const len = Math.sqrt(dx * dx + dy * dy);
            const moveX = (dx / len) * this.speed * 60 * this.deltaTime;
            const moveY = (dy / len) * this.speed * 60 * this.deltaTime;

            if (!checkWallCollision(this.x + moveX, this.y, this.gameMap)) this.x += moveX;
            if (!checkWallCollision(this.x, this.y + moveY, this.gameMap)) this.y += moveY;
        }

        // Míření myší
        this.angle = Math.atan2(mouseY - this.y, mouseX - this.x);

        // Střelba
        if (shooting && this.shootCooldown <= 0) {
            this.shootCooldown = 600;
            const bx = this.x + Math.cos(this.angle) * this.size;
            const by = this.y + Math.sin(this.angle) * this.size;
            this.bullets.push(new Bullet(bx, by, this.angle, false));
        }
    }

    draw(ctx) {
        if (this.gameMap) {
            if (this.state === 'combat' || this.state === 'alert') {
                this.drawVisionCone(ctx, 'rgba(255, 0, 0, 0.1)');
            } else if (this.state === 'search') {
                this.drawVisionCone(ctx, 'rgba(255, 165, 0, 0.1)');
            } else {
                this.drawVisionCone(ctx, 'rgba(100, 100, 100, 0.1)');
            }
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

    drawVisionCone(ctx, color) {
        const rays = 30;
        const points = [{x: this.x, y: this.y}];
        
        for (let i = 0; i <= rays; i++) {
            const rayAngle = this.angle - this.visionAngle / 2 + (this.visionAngle * i / rays);
            const rayDx = Math.cos(rayAngle);
            const rayDy = Math.sin(rayAngle);
            
            let hitDistance = this.visionRange;
            
            for (let dist = 0; dist <= this.visionRange; dist += 5) {
                const checkX = this.x + rayDx * dist;
                const checkY = this.y + rayDy * dist;
                
                const tileX = Math.floor(checkX / CONFIG.TILE_SIZE);
                const tileY = Math.floor(checkY / CONFIG.TILE_SIZE);
                
                if (tileY >= 0 && tileY < this.gameMap.length && tileX >= 0 && tileX < this.gameMap[0].length) {
                    if (this.gameMap[tileY][tileX] === 1) {
                        hitDistance = dist;
                        break;
                    }
                } else {
                    hitDistance = dist;
                    break;
                }
            }
            
            points.push({
                x: this.x + rayDx * hitDistance,
                y: this.y + rayDy * hitDistance
            });
        }
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
        ctx.fill();
    }
}
