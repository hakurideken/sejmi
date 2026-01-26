import { CONFIG } from '../config/constants.js';

export function findPath(startX, startY, endX, endY, gameMap) {
    const startTileX = Math.floor(startX / CONFIG.TILE_SIZE);
    const startTileY = Math.floor(startY / CONFIG.TILE_SIZE);
    const endTileX = Math.floor(endX / CONFIG.TILE_SIZE);
    const endTileY = Math.floor(endY / CONFIG.TILE_SIZE);
    
    if (!gameMap || startTileY < 0 || startTileY >= gameMap.length || 
        startTileX < 0 || startTileX >= gameMap[0].length ||
        endTileY < 0 || endTileY >= gameMap.length || 
        endTileX < 0 || endTileX >= gameMap[0].length) {
        return null;
    }
    
    const openSet = [{x: startTileX, y: startTileY, g: 0, h: 0, f: 0, parent: null}];
    const closedSet = new Set();
    
    while (openSet.length > 0) {
        openSet.sort((a, b) => a.f - b.f);
        const current = openSet.shift();
        
        if (current.x === endTileX && current.y === endTileY) {
            const path = [];
            let node = current;
            while (node) {
                path.unshift({
                    x: node.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                    y: node.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2
                });
                node = node.parent;
            }
            return path;
        }
        
        closedSet.add(`${current.x},${current.y}`);
        
        const neighbors = [
            {x: current.x + 1, y: current.y},
            {x: current.x - 1, y: current.y},
            {x: current.x, y: current.y + 1},
            {x: current.x, y: current.y - 1}
        ];
        
        for (const neighbor of neighbors) {
            if (neighbor.y < 0 || neighbor.y >= gameMap.length || 
                neighbor.x < 0 || neighbor.x >= gameMap[0].length) {
                continue;
            }
            
            if (gameMap[neighbor.y][neighbor.x] === 1) {
                continue;
            }
            
            if (closedSet.has(`${neighbor.x},${neighbor.y}`)) {
                continue;
            }
            
            const g = current.g + 1;
            const h = Math.abs(neighbor.x - endTileX) + Math.abs(neighbor.y - endTileY);
            const f = g + h;
            
            const existingNode = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);
            if (existingNode) {
                if (g < existingNode.g) {
                    existingNode.g = g;
                    existingNode.f = f;
                    existingNode.parent = current;
                }
            } else {
                openSet.push({
                    x: neighbor.x,
                    y: neighbor.y,
                    g: g,
                    h: h,
                    f: f,
                    parent: current
                });
            }
        }
    }
    
    return null;
}
