export class UIManager {
    constructor(root = document) {
        this.root = root;
        this.speedElement = root.querySelector('[data-race-speed]');
        this.gearElement = root.querySelector('[data-race-gear]');
        this.timerElement = root.querySelector('[data-race-timer]');
        this.lapElement = root.querySelector('[data-race-lap]');
        this.driftElement = root.querySelector('[data-race-drift]');
    }

    update({ speedKmh = 0, gear = 'D', elapsed = 0, lap = 1, drifting = false } = {}) {
        if (this.speedElement) this.speedElement.textContent = String(Math.round(Math.abs(speedKmh))).padStart(3, '0');
        if (this.gearElement) this.gearElement.textContent = gear;
        if (this.timerElement) this.timerElement.textContent = UIManager.formatTime(elapsed);
        if (this.lapElement) this.lapElement.textContent = String(lap);
        if (this.driftElement) this.driftElement.classList.toggle('is-active', drifting);
    }

    static formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainder = (seconds % 60).toFixed(2).padStart(5, '0');
        return `${String(minutes).padStart(2, '0')}:${remainder}`;
    }
}
