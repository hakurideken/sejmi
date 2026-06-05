-- PvP místnosti pro WebRTC signalizaci
CREATE TABLE IF NOT EXISTS pvp_rooms (
    id SERIAL PRIMARY KEY,
    room_code VARCHAR(6) UNIQUE NOT NULL,
    offer TEXT,
    answer TEXT,
    status VARCHAR(20) DEFAULT 'waiting',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pvp_rooms_code ON pvp_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_pvp_rooms_created ON pvp_rooms(created_at);
