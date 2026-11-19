export class AudioSynth {
    constructor() {
        this.context = null;
        this.master = null;
        this.engineOscillator = null;
        this.engineHarmonic = null;
        this.engineFilter = null;
        this.engineGain = null;
        this.tireNoise = null;
        this.tireFilter = null;
        this.tireGain = null;
        this.started = false;
    }

    async start() {
        if (this.started) {
            if (this.context.state === 'suspended') await this.context.resume();
            return;
        }

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) throw new Error('Web Audio API não é suportada neste navegador.');

        this.context = new AudioContextClass();
        this.master = this.context.createGain();
        this.master.gain.value = 0.24;
        this.master.connect(this.context.destination);

        this.engineOscillator = this.context.createOscillator();
        this.engineHarmonic = this.context.createOscillator();
        this.engineFilter = this.context.createBiquadFilter();
        this.engineGain = this.context.createGain();

        this.engineOscillator.type = 'sawtooth';
        this.engineHarmonic.type = 'triangle';
        this.engineFilter.type = 'lowpass';
        this.engineFilter.frequency.value = 420;
        this.engineGain.gain.value = 0.0001;

        this.engineOscillator.connect(this.engineFilter);
        this.engineHarmonic.connect(this.engineFilter);
        this.engineFilter.connect(this.engineGain);
        this.engineGain.connect(this.master);

        const buffer = this.context.createBuffer(1, this.context.sampleRate * 2, this.context.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;

        this.tireNoise = this.context.createBufferSource();
        this.tireNoise.buffer = buffer;
        this.tireNoise.loop = true;
        this.tireFilter = this.context.createBiquadFilter();
        this.tireFilter.type = 'bandpass';
        this.tireFilter.frequency.value = 1450;
        this.tireFilter.Q.value = 3.5;
        this.tireGain = this.context.createGain();
        this.tireGain.gain.value = 0;
        this.tireNoise.connect(this.tireFilter);
        this.tireFilter.connect(this.tireGain);
        this.tireGain.connect(this.master);

        this.engineOscillator.start();
        this.engineHarmonic.start();
        this.tireNoise.start();
        this.started = true;
        await this.context.resume();
    }

    update({ speed = 0, throttle = 0, slipAngle = 0, drifting = false } = {}) {
        if (!this.started || this.context.state !== 'running') return;
        const now = this.context.currentTime;
        const speedNorm = Math.min(1, Math.abs(speed) / 85);
        const rpm = 48 + speedNorm * 205 + throttle * 42;
        this.engineOscillator.frequency.setTargetAtTime(rpm, now, 0.045);
        this.engineHarmonic.frequency.setTargetAtTime(rpm * 2.02, now, 0.045);
        this.engineFilter.frequency.setTargetAtTime(320 + speedNorm * 1500 + throttle * 550, now, 0.06);
        this.engineGain.gain.setTargetAtTime(0.045 + speedNorm * 0.13 + throttle * 0.035, now, 0.08);

        const tireIntensity = drifting ? Math.min(0.16, Math.abs(slipAngle) * 0.34) : 0;
        this.tireGain.gain.setTargetAtTime(tireIntensity, now, 0.055);
    }

    setMasterVolume(value) {
        if (!this.master || !this.context) return;
        this.master.gain.setTargetAtTime(Math.max(0, Math.min(1, value)), this.context.currentTime, 0.04);
    }

    stop() {
        if (!this.context) return;
        this.context.close();
        this.context = null;
        this.started = false;
    }
}
