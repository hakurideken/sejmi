import { CONFIG } from '../config/constants.js';

export function checkWallCollision(x, y, gameMap) {
    const tileX = Math.floor(x / CONFIG.TILE_SIZE);
    const tileY = Math.floor(y / CONFIG.TILE_SIZE);
    
    if (tileY < 0 || tileY >= gameMap.length || tileX < 0 || tileX >= gameMap[0].length) {
        return true;
    }
    return gameMap[tileY][tileX] === 1;
}

export function isValidSpawnPosition(x, y, gameMap) {
    const tileX = Math.floor(x / CONFIG.TILE_SIZE);
    const tileY = Math.floor(y / CONFIG.TILE_SIZE);
    
    if (tileY < 0 || tileY >= gameMap.length || tileX < 0 || tileX >= gameMap[0].length) {
        return false;
    }
    const tile = gameMap[tileY][tileX];
    return tile === 0;
}

export function findValidSpawnPosition(preferredX, preferredY, gameMap) {
    if (isValidSpawnPosition(preferredX, preferredY, gameMap)) {
        return {x: preferredX, y: preferredY};
    }
    
    const searchRadius = 5;
    for (let radius = 1; radius <= searchRadius; radius++) {
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
            const testX = preferredX + Math.cos(angle) * radius * CONFIG.TILE_SIZE;
            const testY = preferredY + Math.sin(angle) * radius * CONFIG.TILE_SIZE;
            
            if (isValidSpawnPosition(testX, testY, gameMap)) {
                return {x: testX, y: testY};
            }
        }
    }
    
    return {x: 100, y: 100};
}

export function isInSpawnZone(x, y, spawnSafeZone) {
    const tileX = Math.floor(x / CONFIG.TILE_SIZE);
    const tileY = Math.floor(y / CONFIG.TILE_SIZE);
    const spawnTileX = Math.floor(spawnSafeZone.x / CONFIG.TILE_SIZE);
    const spawnTileY = Math.floor(spawnSafeZone.y / CONFIG.TILE_SIZE);
    
    const distance = Math.sqrt(
        Math.pow(tileX - spawnTileX, 2) + 
        Math.pow(tileY - spawnTileY, 2)
    );
    
    return distance <= CONFIG.SPAWN_SAFE_ZONE_RADIUS;
}
