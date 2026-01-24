# Nastavení progresivního módu a žebříčku

## 1. Nastavení Neon databáze

1. Přejdi na [Neon Console](https://console.neon.tech/)
2. Vytvoř nový projekt nebo použij existující
3. Zkopíruj **Connection String** (vypadá jako: `postgresql://user:password@host/database`)
4. Spusť SQL skript pro vytvoření tabulky:
   - Otevři SQL Editor v Neon konzoli
   - Zkopíruj obsah souboru `database/schema.sql`
   - Spusť SQL příkaz

## 2. Nastavení Netlify

1. Přejdi do Netlify Dashboard
2. Vyber svůj projekt
3. Jdi do **Site settings** → **Environment variables**
4. Přidej novou proměnnou:
   - **Key**: `DATABASE_URL`
   - **Value**: Tvůj Neon connection string

## 3. Instalace závislostí

```bash
npm install
```

## 4. Lokální testování (volitelné)

```bash
npm run dev
```

Hra poběží na `http://localhost:8888`

## 5. Deploy na Netlify

```bash
git add .
git commit -m "Přidán progresivní mód a žebříček"
git push
```

Netlify automaticky deployuje změny.

## Struktura projektu

```
sejmi/
├── index.html              # Hlavní HTML soubor
├── game.js                 # Herní logika
├── style.css               # Styly
├── netlify/
│   └── functions/          # Serverless funkce
│       ├── getLeaderboard.js
│       └── submitScore.js
├── database/
│   └── schema.sql          # SQL schéma pro databázi
├── netlify.toml            # Netlify konfigurace
└── package.json            # NPM závislosti
```

## Jak funguje progresivní mód

1. Hráč začíná s 1 nepřítelem
2. Po zabití všech nepřátel se spawne nová vlna (více nepřátel)
3. Obtížnost postupně roste (rychlost, vidění, slyšení)
4. Hra pokračuje dokud hráč nezemře
5. Po smrti se zobrazí žebříček a možnost odeslat skóre

## Testování žebříčku

Po deployi můžeš otestovat:
- Spusť progresivní mód
- Nech se zabít
- Zadej jméno a odešli skóre
- Zkontroluj, že se skóre zobrazí v žebříčku
