const SIGNAL_URL = '/.netlify/functions/pvp-signal';

const RTC_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ]
};

const CONNECT_TIMEOUT_MS = 30_000; // 30 s – pak nahlásíme chybu

/** Čeká na dokončení ICE gatheringu (max 10 s). */
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
        setTimeout(resolve, 10_000);
    });
}

export class WebRTCManager {
    constructor() {
        this.pc      = null;
        this.channel = null;
        this.role    = null;        // 'spy' | 'guard'
        this.roomCode = null;

        this._pollTimer    = null;
        this._timeoutTimer = null;
        this._connected    = false; // guard – zavoláme onConnected nejvýše jednou

        // Callbacky nastavené zvenku
        this.onMessage      = null;
        this.onConnected    = null;
        this.onDisconnected = null;
        this.onStatusChange = null;
    }

    // ─────────────────────────── PUBLIC API ───────────────────────────

    /** Špion: vytvoří místnost a čeká na strážce. Vrátí kód místnosti. */
    async createRoom() {
        this._status('Vytvářím místnost…');
        const res = await this._post({ action: 'create' });
        if (res.error) throw new Error(res.error);
        this.roomCode = res.code;
        this.role = 'spy';

        this._initPC();

        // DataChannel vytváří iniciátor (špion) – reliable pro lepší kompatibilitu
        this.channel = this.pc.createDataChannel('game');
        this._wireChannel(this.channel);

        this._status('Generuji offer (čekám na ICE)…');
        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        await waitForIceComplete(this.pc);

        const candidateCount = (this.pc.localDescription.sdp.match(/a=candidate:/g) || []).length;
        this._status(`Ukládám offer (${candidateCount} ICE kandidátů)…`);
        await this._post({
            action: 'offer',
            room: this.roomCode,
            offer: JSON.stringify(this.pc.localDescription)
        });

        this._status('Čekám na strážce…');
        this._startAnswerPoll();
        this._startConnectTimeout();

        return this.roomCode;
    }

    /** Strážce: připojí se do existující místnosti. */
    async joinRoom(code) {
        this.roomCode = code.toUpperCase().trim();
        this.role = 'guard';

        this._status('Hledám místnost…');
        const room = await this._get(`action=poll&room=${this.roomCode}`);
        if (!room.offer) throw new Error('Místnost nenalezena nebo ještě nemá offer.');

        this._initPC();

        // Kanál přijde od špiona přes 'datachannel' event
        this.pc.addEventListener('datachannel', (evt) => {
            this.channel = evt.channel;
            this._wireChannel(this.channel);
        });

        this._status('Zpracovávám offer…');
        await this.pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(room.offer)));

        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);

        this._status('Čekám na ICE kandidáty…');
        await waitForIceComplete(this.pc);

        const candidateCount = (this.pc.localDescription.sdp.match(/a=candidate:/g) || []).length;
        this._status(`Odesílám answer (${candidateCount} kandidátů)…`);
        await this._post({
            action: 'answer',
            room: this.roomCode,
            answer: JSON.stringify(this.pc.localDescription)
        });

        this._status('Čekám na navázání spojení…');
        this._startConnectTimeout();
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
        this._stopAll();
        try { this.channel?.close(); } catch { /* */ }
        try { this.pc?.close(); } catch { /* */ }
        this.channel = null;
        this.pc = null;
    }

    // ─────────────────────────── PRIVATE ───────────────────────────

    /** Vytvoří RTCPeerConnection a napojí všechny state-change listenery. */
    _initPC() {
        this.pc = new RTCPeerConnection(RTC_CONFIG);

        // connectionstatechange (hlavní, ne vždy spolehlivý)
        this.pc.addEventListener('connectionstatechange', () => {
            const s = this.pc.connectionState;
            this._status(`Stav spojení: ${s}`);
            if (s === 'connected')                              this._onConnectedOnce();
            if (s === 'failed' || s === 'closed')              this._onFailed('Spojení selhalo.');
        });

        // iceconnectionstatechange (záložní, spolehlivější v některých prohlížečích)
        this.pc.addEventListener('iceconnectionstatechange', () => {
            const s = this.pc.iceConnectionState;
            this._status(`ICE stav: ${s}`);
            if (s === 'connected' || s === 'completed')        this._onConnectedOnce();
            if (s === 'failed')                                this._onFailed('ICE spojení selhalo.');
            if (s === 'disconnected')                          this.onDisconnected?.();
        });
    }

    /** Napojí DataChannel na eventy. */
    _wireChannel(ch) {
        ch.addEventListener('open', () => {
            this._status('DataChannel otevřen!');
            this._onConnectedOnce();
        });
        ch.addEventListener('close', () => this.onDisconnected?.());
        ch.addEventListener('message', (evt) => {
            try {
                const data = JSON.parse(evt.data);
                this.onMessage?.(data);
            } catch { /* špatná zpráva */ }
        });
    }

    /** Zavolá onConnected právě jednou (brání double-fire). */
    _onConnectedOnce() {
        if (this._connected) return;
        this._connected = true;
        this._stopAll();
        this._status('Připojeno! ✅');
        this.onConnected?.();
    }

    /** Polls každé 2 s na spy straně, hledá answer. */
    _startAnswerPoll() {
        this._stopPoll();
        this._pollTimer = setInterval(async () => {
            try {
                const data = await this._get(`action=poll&room=${this.roomCode}`);
                if (data.answer && !this._connected
                    && this.pc?.signalingState === 'have-local-offer') {
                    this._stopPoll();
                    this._status('Answer přijat – navazuji ICE…');
                    await this.pc.setRemoteDescription(
                        new RTCSessionDescription(JSON.parse(data.answer))
                    );
                }
            } catch (e) {
                this._status('Chyba pollování: ' + e.message);
            }
        }, 2000);
    }

    /** Pokud se nepřipojíme do CONNECT_TIMEOUT_MS, nahlásíme chybu. */
    _startConnectTimeout() {
        this._timeoutTimer = setTimeout(() => {
            if (!this._connected) {
                this._onFailed('Timeout: spojení se nepodařilo navázat do 30 s.');
            }
        }, CONNECT_TIMEOUT_MS);
    }

    _onFailed(msg) {
        if (this._connected) return;
        this._stopAll();
        this._status('❌ ' + msg);
        this.onDisconnected?.();
    }

    _stopPoll() {
        if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null; }
    }

    _stopAll() {
        this._stopPoll();
        if (this._timeoutTimer) { clearTimeout(this._timeoutTimer); this._timeoutTimer = null; }
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
