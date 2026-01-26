export const CONFIG = {
    TILE_SIZE: 40,
    SPAWN_SAFE_ZONE_RADIUS: 3,
    
    PLAYER: {
        SIZE: 20,
        SPEED: 2,
        SHOOT_COOLDOWN: 500
    },
    
    BULLET: {
        SIZE: 4,
        SPEED: 8
    },
    
    ENEMY: {
        SIZE: 20,
        BASE_SPEED: 1.2,
        BASE_VISION_RANGE: 200,
        BASE_HEARING_RANGE: 300,
        BASE_ALERT_DURATION: 5000,
        BASE_SEARCH_DURATION: 8000,
        PATROL_SPEED_MULTIPLIER: 0.5,
        ALERT_SPEED_MULTIPLIER: 1.5,
        COMBAT_SPEED_MULTIPLIER: 1.0,
        SEARCH_SPEED_MULTIPLIER: 0.7
    },
    
    BOSS: {
        HEALTH: 5,
        SIZE: 30,
        SPEED_MULTIPLIER: 1.2
    },
    
    PROGRESSIVE: {
        MAX_ENEMIES_BEFORE_SCALING: 12,
        DIFFICULTY_INCREMENT: {
            VISION: 30,
            HEARING: 50,
            SPEED: 0.1,
            ALERT_REDUCTION: 500,
            SEARCH_INCREASE: 2000
        },
        SPAWN_POINTS: [
            {x: 900, y: 100},
            {x: 100, y: 100},
            {x: 900, y: 600},
            {x: 100, y: 600}
        ],
        MULTI_SPAWN_THRESHOLD: 6
    },
    
    PARTICLE: {
        COUNT: 15,
        SIZE: 3,
        SPEED: 2,
        LIFETIME: 30
    },
    
    HEALTH_PICKUP: {
        SIZE: 10,
        PULSE_SPEED: 0.05,
        MIN_SCALE: 0.8,
        MAX_SCALE: 1.2
    },
    
    CANVAS: {
        WIDTH: 1200,
        HEIGHT: 800
    }
};
