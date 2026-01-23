# Stealth Špion

Top-down stealth střílečka s pokročilou AI nepřátel. Infiltruj základnu, vyhýbej se hlídkám a eliminuj cíle!

## Jak hrát

1. Otevřete soubor `index.html` ve webovém prohlížeči
2. Pohybujte se pomocí WASD
3. Mířte myší a střílejte kliknutím
4. Vyhýbejte se zorným polím nepřátel
5. Buďte tichý - střelba upozorní nepřátele v okolí!

## Ovládání

- **W, A, S, D** - Pohyb ve všech směrech
- **Myš** - Míření
- **Levé tlačítko myši** - Střelba

## Herní mechaniky

### Skóre a životy
- **Skóre**: 100 bodů za každého eliminovaného nepřítele
- **Životy**: 3 životy - ztráta při zásahu nepřátelskou střelou

### AI nepřátelé - 4 stavy
1. **Hlídka (modrý)**: Nepřítel hlídkuje po své trase, neví o vás
2. **Pozor (oranžový)**: Slyšel střelbu, jde zkontrolovat místo zvuku
3. **Boj (červený)**: Vidí vás! Pronásleduje a střílí
4. **Hledání (žlutý)**: Ztratil vás z dohledu, hledá vás na poslední známé pozici

### Stealth mechaniky
- **Zorné pole**: Nepřátelé mají kužel vidění - zůstaňte mimo něj
- **Slyšení**: Střelba vytváří zvuk - nepřátelé v okolí přijdou zkontrolovat a prohledají oblast
- **Zdi**: Blokují vidění i střelbu - využívejte je jako kryt (tmavě šedé)
- **Dveře**: Průchody mezi místnostmi (hnědé bloky)
- **Útěk**: Když vám nepřítel uteče z dohledu, bude vás chvíli hledat, pak se vrátí k hlídce

### Úrovně
Hra obsahuje **10 úrovní** s postupně se zvyšující obtížností:

**Úrovně 1-3**: Základní mapy (20x15 dlaždic)
- **Úroveň 1**: 2 nepřátelé, tutoriálová obtížnost
- **Úroveň 2**: 3 nepřátelé, základní obtížnost
- **Úroveň 3**: 4 nepřátelé, složitější mapa

**Úrovně 4-6**: Větší mapy (25x15 dlaždic)
- **Úroveň 4**: 5 nepřátel, větší prostor
- **Úroveň 5**: 6 nepřátel, více místností
- **Úroveň 6**: 7 nepřátel, grid layout

**Úrovně 7-10**: Velké mapy (30x15-20 dlaždic)
- **Úroveň 7**: 8 nepřátel, komplexní labyrint
- **Úroveň 8**: 9 nepřátel, mnoho místností
- **Úroveň 9**: 10 nepřátel, vertikální labyrint
- **Úroveň 10**: 12 nepřátel, finální výzva - symetrický grid

S každou úrovní se zvyšuje:
- Počet nepřátel
- Velikost mapy
- Dosah vidění (+30 pixelů na úroveň)
- Dosah slyšení (+50 pixelů na úroveň)
- Rychlost nepřátel (+0.3 na úroveň)
- Doba hledání po ztrátě kontaktu

Po dokončení všech 10 úrovní můžete začít znovu!

## Spuštění hry

Jednoduše otevřete `index.html` v moderním webovém prohlížeči (Chrome, Firefox, Safari, Edge).

Není potřeba žádná instalace ani server - hra běží přímo v prohlížeči!

## Technologie

- HTML5 Canvas
- Vanilla JavaScript
- CSS3
