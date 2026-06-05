import { GuardController } from '../entities/GuardController.js';

/**
 * PvPMode – řídí asymetrické PvP (Špion vs. Strážce).
 *
 * Architektura:
 *   • Špion (role='spy')  – spouští herní simulaci, přijímá vstupy strážce,
 *                           každých SYNC_MS posílá stav hry.
 *   • Strážce (role='guard') – přijímá stav od špiona, renderuje ho,
 *                               posílá své vstupy každý snímek.
 *
 * Špion je autoritativní klient – veškerá fyzika a kolize běží u něj.
 */
export class PvPMode {
    constructor(state, renderer, webrtc, canvas, ctx) {
        this.state    = state;
        this.renderer = renderer;
        this.webrtc   = webrtc;
        this.canvas   = canvas;
        this.ctx      = ctx;
        this.role     = webrtc.role; // 'spy' | 'guard'

        /** Stav přijatý od špiona (jen na straně strážce). */
        this.remoteState = null;

        /** Naposledy poslaný sync. */
        this._lastSync = 0;
        this.SYNC_MS = 50; // ~20 fps pro stavový sync

        /** Vstup strážce (aplikovaný na straně špiona). */
        this.guardInput = {
            idx: -1,
            keys: { w: false, a: false, s: false, d: false },
            mx: 0, my: 0, sh: false
        };

        /** GuardController (pouze u strážce). */
        this.guardCtrl = this.role === 'guard'
            ? new GuardController(canvas)
            : null;

        /** Callback volaný při konci hry (strážce dostane gm=1 od špiona). */
        this.onGameOver = null;

        // Napojit zprávy
        webrtc.onMessage = (data) => this._onMessage(data);
    }

    // ──────────────────────────── HERNÍ SMYČKA ──────────────────────────

    /**
     * Voláno každý snímek PŘED renderováním (u špiona).
     * Aplikuje vstup strážce na vybraného nepřítele.
     */
    updateSpy() {
        const { idx, keys, mx, my, sh } = this.guardInput;

        // Odregistrovat předchozí kontrolu
        this.state.enemies.forEach(e => {
            e.isPlayerControlled = false;
            e.guardInput = null;
        });

        if (idx >= 0 && idx < this.state.enemies.length) {
            const enemy = this.state.enemies[idx];
            enemy.isPlayerControlled = true;
            enemy.guardInput = { keys, mouseX: mx, mouseY: my, shooting: sh };
        }

        // Sync stavu ke strážci
        const now = Date.now();
        if (now - this._lastSync >= this.SYNC_MS) {
            this._lastSync = now;
            this._sendState();
        }
    }

    /**
     * Voláno každý snímek u strážce – pošle vstupy špionovi.
     */
    updateGuard() {
        if (this.guardCtrl && this.webrtc.isConnected) {
            this.webrtc.send(this.guardCtrl.getInput());
        }
    }

    /**
     * Renderuje pohled strážce (místo normálního renderování).
     */
    renderGuardView() {
        const { ctx, canvas, renderer } = this;

        renderer.clear();
        renderer.drawMap(this.state.gameMap);

        if (!this.remoteState) {
            this._drawCenterText('Čekám na data od špiona…');
            return;
        }

        const rs = this.remoteState;

        // Kulky
        rs.bl?.forEach(b => {
            ctx.fillStyle = b.ip ? '#ffff00' : '#ff4400';
            ctx.beginPath();
            ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
            ctx.fill();
        });

        // Nepřátelé
        rs.e?.forEach((e, i) => this._drawRemoteEnemy(e, i));

        // Špion (viditelný vždy, mírně průhledný)
        if (rs.p) this._drawRemoteSpy(rs.p);

        // HUD strážce
        this._drawGuardHUD(rs);

        // Konec hry
        if (rs.gm === 1) this._drawGameOverOverlay(rs.w);
    }

    /**
     * Registruje klik na canvas u strážce.
     */
    handleGuardClick(canvasX, canvasY) {
        if (!this.guardCtrl || !this.remoteState?.e) return;
        this.guardCtrl.handleClick(canvasX, canvasY, this.remoteState.e);
    }

    /**
     * Uklidí event listenery (volat při opuštění PvP módu).
     */
    destroy() {
        this.guardCtrl?.destroy();
    }

    // ──────────────────────────── SÍŤOVÉ ZPRÁVY ──────────────────────────

    _onMessage(data) {
        if (!data?.type) return;

        if (this.role === 'spy' && data.type === 'gi') {
            // Vstup od strážce
            this.guardInput = {
                idx: data.idx ?? -1,
                keys: {
                    w: !!data.k?.w, a: !!data.k?.a,
                    s: !!data.k?.s, d: !!data.k?.d
                },
                mx: data.mx ?? 0,
                my: data.my ?? 0,
                sh: !!data.sh
            };
        }

        if (this.role === 'guard' && data.type === 'gs') {
            // Stav hry od špiona
            this.remoteState = data;
            // Konec hry – propaguj na stranu strážce
            if (data.gm === 1 && this.state.gameRunning) {
                this.state.pvpWinner = data.w ?? null;
                this.state.gameRunning = false;
                this.onGameOver?.();
            }
        }
    }

    /** Pošle kompaktní stav hry strážci. */
    _sendState() {
        const s = this.state;
        this.webrtc.send({
            type: 'gs',
            p: s.player ? {
                x: Math.round(s.player.x),
                y: Math.round(s.player.y),
                a: +s.player.angle.toFixed(2),
                i: s.playerInvisible ? 1 : 0,
                l: s.lives
            } : null,
            e: s.enemies.map(e => ({
                x: Math.round(e.x),
                y: Math.round(e.y),
                a: +e.angle.toFixed(2),
                st: e.state,
                pc: e.isPlayerControlled ? 1 : 0,
                b:  e.isBoss ? 1 : 0
            })),
            bl: s.bullets.map(b => ({
                x: Math.round(b.x),
                y: Math.round(b.y),
                a: +b.angle.toFixed(2),
                ip: b.isPlayer ? 1 : 0
            })),
            sc: s.score,
            gm: s.gameRunning ? 0 : 1,
            w:  s.pvpWinner ?? null
        });
    }

    // ──────────────────────────── RENDEROVÁNÍ (strážce) ──────────────────────────

    _drawRemoteEnemy(e, index) {
        const { ctx } = this;
        const sel = this.guardCtrl?.selectedIndex ?? -1;
        const isSelected = index === sel;

        const COLOR = { patrol: '#3355ff', alert: '#ff8800', combat: '#ff2222', search: '#ffcc00' };
        const bodyColor = e.pc ? '#00ccff' : (COLOR[e.st] ?? '#3355ff');

        // Výběrový kroužek
        if (isSelected) {
            ctx.save();
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 3;
            ctx.setLineDash([6, 3]);
            ctx.beginPath();
            ctx.arc(e.x, e.y, 18, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Tělo
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.b ? 14 : 10, 0, Math.PI * 2);
        ctx.fill();

        // Bos – extra obrys
        if (e.b) {
            ctx.strokeStyle = '#ff8800';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(e.x, e.y, 16, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Ukazatel směru
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x + Math.cos(e.a) * 16, e.y + Math.sin(e.a) * 16);
        ctx.stroke();

        // Číslo (1-based)
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(index + 1, e.x, e.y);
    }

    _drawRemoteSpy(p) {
        const { ctx } = this;
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = '#ff3333';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ff8888';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + Math.cos(p.a) * 14, p.y + Math.sin(p.a) * 14);
        ctx.stroke();
        ctx.restore();
    }

    _drawGuardHUD(rs) {
        const { ctx, canvas } = this;
        const sel = this.guardCtrl?.selectedIndex ?? -1;

        // Panel vlevo nahoře
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.beginPath();
        ctx.roundRect?.(8, 8, 220, 100, 8) ?? ctx.fillRect(8, 8, 220, 100);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`🕵️ Špion: ${rs.p?.l ?? '?'} ❤️`, 18, 20);
        ctx.fillText(`⚔️ Nepřátelé: ${rs.e?.length ?? 0}`, 18, 42);

        const selLabel = sel >= 0 ? `Strážce #${sel + 1}` : '— žádný —';
        ctx.fillStyle = sel >= 0 ? '#00ffff' : '#888';
        ctx.fillText(`🎯 Vybraný: ${selLabel}`, 18, 64);

        if (sel >= 0 && rs.e?.[sel]) {
            const states = { patrol: 'Hlídka', alert: 'Pozor', combat: 'Boj', search: 'Hledání' };
            const st = states[rs.e[sel].st] ?? rs.e[sel].st;
            ctx.fillStyle = '#aaa';
            ctx.fillText(`   Stav: ${st}`, 18, 86);
        }

        // Nápověda dole
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, canvas.height - 38, canvas.width, 38);
        ctx.fillStyle = '#aaa';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Klik na č. strážce = vybrat  |  WASD = pohyb  |  Myš = míření  |  Klik na prázdno = střelba', canvas.width / 2, canvas.height - 19);
    }

    _drawGameOverOverlay(winner) {
        const { ctx, canvas } = this;
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const won = (winner === 'guard');
        ctx.fillStyle = won ? '#00ff88' : '#ff4444';
        ctx.font = 'bold 48px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(won ? '🛡️ Strážce vyhrál!' : '🕵️ Špion vyhrál!', canvas.width / 2, canvas.height / 2 - 20);

        ctx.fillStyle = '#ccc';
        ctx.font = '20px monospace';
        ctx.fillText('Stiskni ESC pro návrat do menu', canvas.width / 2, canvas.height / 2 + 40);
    }

    _drawCenterText(text) {
        const { ctx, canvas } = this;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ccc';
        ctx.font = '22px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    }
}
