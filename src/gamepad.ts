// Gamepad/Controller Support
// Uses native Gamepad API for Xbox, PlayStation, and generic USB controllers

export interface GamepadCallbacks {
  onPlayPause: () => void;
  onReset: () => void;
  onSpeedUp: () => void;
  onSpeedDown: () => void;
  onNavigateUp: () => void;
  onNavigateDown: () => void;
  onPrevCue: () => void;
  onNextCue: () => void;
}

// Button indices for standard gamepad mapping
const BUTTON = {
  A: 0,         // A/X button - Play/Pause
  B: 1,         // B/Circle - Reset
  X: 2,         // X/Square
  Y: 3,         // Y/Triangle
  LB: 4,        // Left bumper
  RB: 5,        // Right bumper
  LT: 6,        // Left trigger - Speed down
  RT: 7,        // Right trigger - Speed up
  BACK: 8,      // Back/Select
  START: 9,     // Start
  LSTICK: 10,   // Left stick press
  RSTICK: 11,   // Right stick press
  DPAD_UP: 12,  // D-pad up - Navigate up
  DPAD_DOWN: 13, // D-pad down - Navigate down
  DPAD_LEFT: 14, // D-pad left - Previous cue
  DPAD_RIGHT: 15, // D-pad right - Next cue
};

// Trigger threshold for analog triggers
const TRIGGER_THRESHOLD = 0.5;
const BUTTON_REPEAT_DELAY = 500; // ms before repeat starts
const BUTTON_REPEAT_RATE = 100;  // ms between repeats

export class GamepadManager {
  private callbacks: GamepadCallbacks;
  private animationFrameId: number | null = null;
  private connectedGamepads: Set<number> = new Set();
  private buttonStates: Map<number, Map<number, { pressed: boolean; time: number }>> = new Map();
  private triggerHeld: { left: boolean; right: boolean } = { left: false, right: false };
  private triggerRepeatId: { left: number | null; right: number | null } = { left: null, right: null };

  constructor(callbacks: GamepadCallbacks) {
    this.callbacks = callbacks;
    this.setupEventListeners();
    this.startPolling();
  }

  private setupEventListeners() {
    // Listen for gamepad connection/disconnection
    window.addEventListener('gamepadconnected', (e) => {
      const event = e as GamepadEvent;
      this.connectedGamepads.add(event.gamepad.index);
      this.buttonStates.set(event.gamepad.index, new Map());
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      const event = e as GamepadEvent;
      this.connectedGamepads.delete(event.gamepad.index);
      this.buttonStates.delete(event.gamepad.index);
    });
  }

  private startPolling() {
    const poll = () => {
      const gamepads = navigator.getGamepads();

      for (const gamepad of gamepads) {
        if (!gamepad) continue;

        this.processGamepad(gamepad);
      }

      this.animationFrameId = requestAnimationFrame(poll);
    };

    this.animationFrameId = requestAnimationFrame(poll);
  }

  private processGamepad(gamepad: Gamepad) {
    const states = this.buttonStates.get(gamepad.index);
    if (!states) return;

    const now = Date.now();

    // Process buttons
    gamepad.buttons.forEach((button, index) => {
      const prevState = states.get(index);
      const isPressed = button.pressed || button.value > 0.5;

      if (isPressed && !prevState?.pressed) {
        // Button just pressed
        states.set(index, { pressed: true, time: now });
        this.handleButtonPress(index);
      } else if (!isPressed && prevState?.pressed) {
        // Button released
        states.set(index, { pressed: false, time: now });
        this.handleButtonRelease(index);
      } else if (isPressed && prevState?.pressed) {
        // Button held - handle repeat for navigation
        if (index === BUTTON.DPAD_UP || index === BUTTON.DPAD_DOWN) {
          const holdDuration = now - prevState.time;
          if (holdDuration > BUTTON_REPEAT_DELAY) {
            const timeSinceLastRepeat = holdDuration % BUTTON_REPEAT_RATE;
            if (timeSinceLastRepeat < 16) { // ~1 frame at 60fps
              this.handleButtonPress(index);
            }
          }
        }
      }
    });

    // Process triggers for continuous speed adjustment
    const leftTrigger = gamepad.buttons[BUTTON.LT]?.value ?? 0;
    const rightTrigger = gamepad.buttons[BUTTON.RT]?.value ?? 0;

    if (leftTrigger > TRIGGER_THRESHOLD && !this.triggerHeld.left) {
      this.triggerHeld.left = true;
      this.startTriggerRepeat('left', this.callbacks.onSpeedDown);
    } else if (leftTrigger <= TRIGGER_THRESHOLD && this.triggerHeld.left) {
      this.triggerHeld.left = false;
      this.stopTriggerRepeat('left');
    }

    if (rightTrigger > TRIGGER_THRESHOLD && !this.triggerHeld.right) {
      this.triggerHeld.right = true;
      this.startTriggerRepeat('right', this.callbacks.onSpeedUp);
    } else if (rightTrigger <= TRIGGER_THRESHOLD && this.triggerHeld.right) {
      this.triggerHeld.right = false;
      this.stopTriggerRepeat('right');
    }
  }

  private handleButtonPress(index: number) {
    switch (index) {
      case BUTTON.A:
        this.callbacks.onPlayPause();
        break;
      case BUTTON.B:
        this.callbacks.onReset();
        break;
      case BUTTON.DPAD_UP:
        this.callbacks.onNavigateUp();
        break;
      case BUTTON.DPAD_DOWN:
        this.callbacks.onNavigateDown();
        break;
      case BUTTON.DPAD_LEFT:
        this.callbacks.onPrevCue();
        break;
      case BUTTON.DPAD_RIGHT:
        this.callbacks.onNextCue();
        break;
    }
  }

  private handleButtonRelease(_index: number) {
    // Handle button release if needed
  }

  private startTriggerRepeat(side: 'left' | 'right', callback: () => void) {
    // Call immediately
    callback();

    // Then repeat
    const id = window.setInterval(callback, 150);
    this.triggerRepeatId[side] = id;
  }

  private stopTriggerRepeat(side: 'left' | 'right') {
    if (this.triggerRepeatId[side] !== null) {
      clearInterval(this.triggerRepeatId[side]!);
      this.triggerRepeatId[side] = null;
    }
  }

  isConnected(): boolean {
    return this.connectedGamepads.size > 0;
  }

  getConnectedCount(): number {
    return this.connectedGamepads.size;
  }

  destroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.stopTriggerRepeat('left');
    this.stopTriggerRepeat('right');
    this.connectedGamepads.clear();
    this.buttonStates.clear();
  }
}
