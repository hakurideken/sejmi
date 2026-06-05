const SIGNAL_URL = '/.netlify/functions/pvp-signal';

const RTC_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

/**
 * Čeká na dokončení ICE gatheringu.
 * Výsledný localDescription pak obsahuje všechny kandidáty přímo v SDP.
 */
function waitForIceComplete(pc) {
    return new Promise((resolve) => {
        if (pc.iceGatheringState === 'complete') { resolve(); return; }
        const handler = () => {
            if (pc.iceGatheringState === 'complete') {
                pc.removeEventListener('icegatheringstatechange', handler);
                resolve();
            }
        };
        pc.addEventListener('icegatheringstatechange', handler);
        // Timeout pojistka – po 8 s jedeme dál s tím, co máme
        setTimeout(resolve, 8000);
    });
}

export class WebRTCManager {
    constructor() {
        this.pc = null;
        this.channel = null;
        this.role = null;       // 'spy' | 'guard'
        this.roomCode = null;
        this._pollTimer = null;

        // Callbacky
        this.onMessage = null;
        this.onConnected = null;
        this.onDisconnected = null;
        this.onStatusChange = null; // (text) => void
    }

    // ─────────────────────────── PUBLIC API ───────────────────────────

    /** Špion: vytvoří místnost a čeká na strážce. Vrátí kód místnosti. */
    async createRoom() {
        this._status('Vytvářím místnost…');
        const res = await this._post({ action: 'create' });
        if (res.error) throw new Error(res.error);
        this.roomCode = res.code;
        this.role = 'spy';

        this._createPC();

        // DataChannel vytváří iniciátor (špion)
        this.channel = this.pc.createDataChannel('game', { ordered: false, maxRetransmits: 0 });
        this._setupChannel(this.channel);

        this._status('Generuji offer…');
        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        await waitForIceComplete(this.pc);

        this._status('Ukladám offer…');
        await this._post({
            action: 'offer',
            room: this.roomCode,
            offer: JSON.stringify(this.pc.localDescription)
        });

        this._status('Čekám na strážce…');
        this._startPolling();

        return this.roomCode;
    }

    /** Strážce: připojí se do existující místnosti. */
    async joinRoom(code) {
        this.roomCode = code.toUpperCase().trim();
        this.role = 'guard';

        this._status('Hledám místnost…');
        const room = await this._get(`action=poll&room=${this.roomCode}`);
        if (!room.offer) throw new Error('Místnost nenalezena nebo není připravena.');

        this._createPC();

        // DataChannel přijme příchozí od špiona
        this.pc.addEventListener('datachannel', (evt) => {
            this.channel = evt.channel;
            this._setupChannel(this.channel);
        });

        this._status('Zpracovávám offer…');
        await this.pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(room.offer)));

        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        await waitForIceComplete(this.pc);

        this._status('Posílám answer…');
        await this._post({
            action: 'answer',
            room: this.roomCode,
            answer: JSON.stringify(this.pc.localDescription)
        });

        this._status('Čekám na spojení…');
    }

    /** Odešle data přes DataChannel (pokud je otevřený). */
    send(data) {
        if (this.channel?.readyState === 'open') {
            try { this.channel.send(JSON.stringify(data)); } catch { /* ignorovat */ }
        }
    }

    get isConnected() {
        return this.channel?.readyState === 'open';
    }

    close() {
        this._stopPolling();
        try { this.channel?.close(); } catch { /* */ }
        try { this.pc?.close(); } catch { /* */ }
        this.channel = null;
        this.pc = null;
    }

    // ─────────────────────────── PRIVATE ───────────────────────────

    _createPC() {
        this.pc = new RTCPeerConnection(RTC_CONFIG);
        this.pc.addEventListener('connectionstatechange', () => {
            const s = this.pc.connectionState;
            if (s === 'connected') {
                this._stopPolling();
                this._status('Připojeno!');
                this.onConnected?.();
            }
            if (s === 'disconnected' || s === 'failed' || s === 'closed') {
                this._stopPolling();
                this.onDisconnected?.();
            }
        });
    }

    _setupChannel(ch) {
        ch.addEventListener('open', () => {
            this._stopPolling();
            this._status('Připojeno!');
            this.onConnected?.();
        });
        ch.addEventListener('close', () => this.onDisconnected?.());
        ch.addEventListener('message', (evt) => {
            try {
                const data = JSON.parse(evt.data);
                this.onMessage?.(data);
            } catch { /* špatná zpráva */ }
        });
    }

    /** Špion polluje odpověď strážce každé 2 s. */
    _startPolling() {
        this._stopPolling();
        this._pollTimer = setInterval(async () => {
            try {
                const data = await this._get(`action=poll&room=${this.roomCode}`);
                if (data.answer && this.pc?.signalingState !== 'stable') {
                    this._stopPolling();
                    await this.pc.setRemoteDescription(
                        new RTCSessionDescription(JSON.parse(data.answer))
                    );
                    this._status('Answer přijat – navazuji spojení…');
                }
            } catch { /* síťová chyba, zkusit znovu */ }
        }, 2000);
    }

    _stopPolling() {
        if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null; }
    }

    _status(text) { this.onStatusChange?.(text); }

    async _post(data) {
        const r = await fetch(SIGNAL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return r.json();
    }

    async _get(query) {
        const r = await fetch(`${SIGNAL_URL}?${query}`);
        return r.json();
    }
}
