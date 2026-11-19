export class Engine {
    constructor({ fixedTimeStep = 1 / 120, maxSubSteps = 8, onFixedUpdate, onRender }) {
        this.fixedTimeStep = fixedTimeStep;
        this.maxSubSteps = maxSubSteps;
        this.onFixedUpdate = onFixedUpdate;
        this.onRender = onRender;
        this.accumulator = 0;
        this.previousTime = 0;
        this.running = false;
        this.frameId = 0;
        this.boundFrame = this.frame.bind(this);
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.previousTime = performance.now();
        this.frameId = requestAnimationFrame(this.boundFrame);
    }

    stop() {
        this.running = false;
        cancelAnimationFrame(this.frameId);
    }

    frame(now) {
        if (!this.running) return;
        const frameDelta = Math.min((now - this.previousTime) / 1000, 0.1);
        this.previousTime = now;
        this.accumulator += frameDelta;

        let steps = 0;
        while (this.accumulator >= this.fixedTimeStep && steps < this.maxSubSteps) {
            this.onFixedUpdate?.(this.fixedTimeStep);
            this.accumulator -= this.fixedTimeStep;
            steps++;
        }

        if (steps === this.maxSubSteps && this.accumulator >= this.fixedTimeStep) {
            this.accumulator = 0;
        }

        const alpha = this.accumulator / this.fixedTimeStep;
        this.onRender?.(frameDelta, alpha);
        this.frameId = requestAnimationFrame(this.boundFrame);
    }
}
