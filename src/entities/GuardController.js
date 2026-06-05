/**
 * GuardController – ovládání strážce hráčem B.
 *
 * Interakce:
 *   - Klik na strážce     → vybere ho (obrys + pohyb)
 *   - Klik na prázdné místo → vybraný strážce střílí
 *   - WASD                → pohyb vybraného strážce
 *   - Pohyb myši          → míření vybraného strážce
 */
export class GuardController {
    constructor(canvas) {
        this.canvas = canvas;
        this.selectedIndex = -1;
        this.keys = { w: false, a: false, s: false, d: false };
        this.mouseX = 0;
        this.mouseY = 0;
        this.shooting = false;

        this._onKeyDown = this._keyDown.bind(this);
        this._onKeyUp   = this._keyUp.bind(this);
        this._onMouseMove = this._mouseMove.bind(this);

        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup',   this._onKeyUp);
        canvas.addEventListener('mousemove', this._onMouseMove);
    }

    // ─── veřejné ───────────────────────────────────────────────────

    /**
     * Zpracuje klik na canvas.
     * enemies = pole objektů s .x, .y (přijatý remoteState.e nebo state.enemies)
     * Vrátí true pokud byl vybrán nepřítel, false pokud je to střelba.
     */
    handleClick(canvasX, canvasY, enemies) {
        const CLICK_RADIUS = 24;
        let nearest = -1;
        let nearestDist = CLICK_RADIUS;

        enemies.forEach((e, i) => {
            const dx = e.x - canvasX;
            const dy = e.y - canvasY;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < nearestDist) { nearest = i; nearestDist = d; }
        });

        if (nearest >= 0) {
            // Klik na strážce – vybrat
            this.selectedIndex = nearest;
            return true;
        } else if (this.selectedIndex >= 0) {
            // Klik na prázdné místo – střelba
            this.shooting = true;
            setTimeout(() => { this.shooting = false; }, 80);
            return false;
        }
        return false;
    }

    /** Sestav zprávu pro špiona. */
    getInput() {
        return {
            type: 'gi',
            idx: this.selectedIndex,
            k: {
                w: this.keys.w ? 1 : 0,
                a: this.keys.a ? 1 : 0,
                s: this.keys.s ? 1 : 0,
                d: this.keys.d ? 1 : 0
            },
            mx: Math.round(this.mouseX),
            my: Math.round(this.mouseY),
            sh: this.shooting ? 1 : 0
        };
    }

    /** Odregistrovat posluchače (při opuštění PvP módu). */
    destroy() {
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup',   this._onKeyUp);
        this.canvas.removeEventListener('mousemove', this._onMouseMove);
    }

    // ─── privátní ──────────────────────────────────────────────────

    _keyDown(e) {
        switch (e.key.toLowerCase()) {
            case 'w': this.keys.w = true; break;
            case 'a': this.keys.a = true; break;
            case 's': this.keys.s = true; break;
            case 'd': this.keys.d = true; break;
        }
    }

    _keyUp(e) {
        switch (e.key.toLowerCase()) {
            case 'w': this.keys.w = false; break;
            case 'a': this.keys.a = false; break;
            case 's': this.keys.s = false; break;
            case 'd': this.keys.d = false; break;
        }
    }

    _mouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = e.clientX - rect.left;
        this.mouseY = e.clientY - rect.top;
    }
}
