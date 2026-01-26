# Refaktoring - Modulární struktura

## Přehled změn

Hra byla refaktorována z jednoho velkého souboru (`game.js` - 1878 řádků) do modulární struktury s ES modules.

## Nová struktura

```
sejmi/
├── src/
│   ├── config/
│   │   └── constants.js          # Všechny konstanty a konfigurace
│   ├── entities/
│   │   ├── Player.js              # Třída hráče
│   │   ├── Enemy.js               # Třída nepřítele s AI
│   │   ├── Boss.js                # Třída bosse (rozšíření Enemy)
│   │   ├── Bullet.js              # Třída střely
│   │   ├── Particle.js            # Třída částice pro efekty
│   │   └── HealthPickup.js        # Třída health pickupu
│   ├── utils/
│   │   ├── collision.js           # Funkce pro detekci kolizí
│   │   └── pathfinding.js         # A* pathfinding algoritmus
│   ├── systems/
│   │   └── RenderSystem.js        # Systém pro vykreslování
│   ├── core/
│   │   └── GameState.js           # Centralizovaný stav hry
│   └── data/
│       └── levels.js              # Data levelů a map
├── game.js                        # Původní verze (funkční)
├── game-original-backup.js        # Záloha původního game.js
├── game-refactored.js             # Refaktorovaná verze (ES modules)
├── index.html                     # Původní HTML (používá game.js)
└── index-refactored.html          # Testovací HTML (používá game-refactored.js)
```

## Výhody refaktorované verze

### 1. **Lepší organizace kódu**
- Každá třída má vlastní soubor
- Utility funkce jsou oddělené
- Konstanty jsou na jednom místě

### 2. **Snadnější údržba**
- Změny v jedné části kódu neovlivní ostatní
- Snazší hledání bugů
- Lepší čitelnost

### 3. **Znovupoužitelnost**
- Třídy lze snadno použít v jiných projektech
- Utility funkce jsou nezávislé

### 4. **Testovatelnost**
- Každý modul lze testovat samostatně
- Snadnější unit testy

### 5. **Škálovatelnost**
- Snadné přidávání nových features
- Možnost rozšíření o další systémy

## Jak testovat refaktorovanou verzi

### Lokálně:
```bash
npm run dev
```

Pak otevři:
- **Původní verze**: `http://localhost:8888/index.html`
- **Refaktorovaná verze**: `http://localhost:8888/index-refactored.html`

### Produkce:
Refaktorovaná verze zatím není nasazena na produkci. Nejdřív je potřeba:
1. Otestovat všechny funkce
2. Zkopírovat všechna data levelů do `game-refactored.js`
3. Přejmenovat `game-refactored.js` na `game.js`
4. Přejmenovat `index-refactored.html` na `index.html`

## Klíčové změny v kódu

### Před (game.js):
```javascript
// Všechno v jednom souboru
const player = {x: 100, y: 100, size: 20, ...};
let gameRunning = true;
let score = 0;
// ... 1800+ řádků
```

### Po (game-refactored.js):
```javascript
import { CONFIG } from './src/config/constants.js';
import { GameState } from './src/core/GameState.js';
import { Player } from './src/entities/Player.js';

const state = new GameState();
state.player = new Player(100, 100);
```

## Současný stav

### ✅ DOKONČENO (26.1.2026):
- ✅ Vytvořena modulární struktura (15+ souborů)
- ✅ Extrakce tříd do samostatných souborů
- ✅ Utility funkce oddělené
- ✅ Config soubor s konstantami
- ✅ GameState pro centralizaci stavu
- ✅ RenderSystem pro vykreslování
- ✅ Všechna data levelů (11 levelů) zkopírována
- ✅ Refaktorovaná verze otestována a funguje
- ✅ **Původní verze nahrazena refaktorovanou verzí**

### 📦 Zálohy:
- `game-original-backup.js` - původní game.js
- `game-old.js` - původní game.js (druhá záloha)
- `index-original-backup.html` - původní index.html
- `index-old.html` - původní index.html (druhá záloha)

## Poznámky

- **Refaktorovaná verze je nyní hlavní verze** (`game.js` + `index.html`)
- Původní verze je zálohována jako `game-original-backup.js`
- ES modules vyžadují server pro lokální testování
- Na Netlify funguje automaticky (Netlify poskytuje server)
- Pro lokální testování: `python3 -m http.server 8888`

## Další možná vylepšení

1. **InputSystem** - oddělení logiky pro klávesnici/myš
2. **AudioSystem** - přidání zvuků a hudby
3. **LevelManager** - lepší správa levelů
4. **EntityManager** - správa všech entit
5. **EventSystem** - event-driven architektura
6. **Build systém** - Vite/Webpack pro bundling
