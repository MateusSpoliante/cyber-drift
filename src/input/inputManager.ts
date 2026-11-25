export interface ControlState {
  steer: number;
  throttle: number;
  brake: number;
  gearReq: number;
}

export class InputManager {
  private keys = new Set<string>();
  private steerValue = 0;
  private throttleValue = 0;
  private brakeValue = 0;
  private pendingGearReq = 0;

  public onCameraToggle?: () => void;
  public onResetLap?: () => void;

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleWindowBlur);
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleWindowBlur);
  }

  private handleWindowBlur = () => {
    // Prevent stuck throttle/steering when the browser loses focus before keyup.
    this.keys.clear();
    this.steerValue = 0;
    this.throttleValue = 0;
    this.brakeValue = 0;
    this.pendingGearReq = 0;
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    const target = e.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        target.closest('input, textarea, select, button, [role="button"]'))
    ) {
      return;
    }

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }

    if (!this.keys.has(e.code)) {
      if (e.code === 'KeyE' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.pendingGearReq = 1;
      } else if (e.code === 'KeyQ' || e.code === 'ControlLeft') {
        this.pendingGearReq = -1;
      } else if (e.code === 'KeyC') {
        this.onCameraToggle?.();
      } else if (e.code === 'KeyR') {
        this.onResetLap?.();
      }
    }

    this.keys.add(e.code);
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  public poll(dt: number): ControlState {
    // 1. Keyboard progressive ramps
    const left = this.keys.has('KeyA') || this.keys.has('ArrowLeft');
    const right = this.keys.has('KeyD') || this.keys.has('ArrowRight');
    const up = this.keys.has('KeyW') || this.keys.has('ArrowUp');
    const down = this.keys.has('KeyS') || this.keys.has('ArrowDown');

    // The vehicle's positive yaw points left in world space; invert the
    // player command so pressing right steers the car to the right.
    let targetSteer = 0;
    if (left) targetSteer += 1;
    if (right) targetSteer -= 1;

    const steerRate = targetSteer !== 0 ? 5.5 : 8.5;
    if (this.steerValue < targetSteer) {
      this.steerValue = Math.min(targetSteer, this.steerValue + steerRate * dt);
    } else if (this.steerValue > targetSteer) {
      this.steerValue = Math.max(targetSteer, this.steerValue - steerRate * dt);
    }

    const targetThrottle = up ? 1 : 0;
    const targetBrake = down ? 1 : 0;

    this.throttleValue += (targetThrottle - this.throttleValue) * Math.min(1, 14 * dt);
    this.brakeValue += (targetBrake - this.brakeValue) * Math.min(1, 18 * dt);

    let steer = this.steerValue;
    let throttle = this.throttleValue;
    let brake = this.brakeValue;
    let gearReq = this.pendingGearReq;
    this.pendingGearReq = 0;

    // 2. Gamepad API override when active
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of gamepads) {
      if (!gp) continue;
      const deadzone = 0.08;
      const rawAxis = gp.axes[0] || 0;
      if (Math.abs(rawAxis) > deadzone) {
        const norm = (Math.abs(rawAxis) - deadzone) / (1 - deadzone);
        steer = -Math.sign(rawAxis) * Math.pow(norm, 1.35);
      }
      // RT (button 7) & LT (button 6)
      const rt = gp.buttons[7]?.value || 0;
      const lt = gp.buttons[6]?.value || 0;
      if (rt > 0.03) throttle = rt;
      if (lt > 0.03) brake = lt;

      if (gp.buttons[5]?.pressed) gearReq = 1; // RB
      if (gp.buttons[4]?.pressed) gearReq = -1; // LB
      break;
    }

    return {
      steer,
      throttle,
      brake,
      gearReq,
    };
  }
}
