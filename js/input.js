const GAME_KEYS = new Set([
  "Space",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyE",
  "KeyF",
  "KeyR",
  "ShiftLeft",
  "ShiftRight",
]);

export class Input {
  constructor() {
    this.keys = new Set();
    this.justPressed = new Set();
    this.enabled = false;
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.pointerLocked = false;
    this.attackClicked = false;
    this._onMouseMove = null;
    this._onMouseDown = null;
    this._onPointerLockChange = null;
  }

  bind(canvas) {
    window.addEventListener("keydown", (event) => {
      if (!this.enabled) {
        return;
      }
      if (GAME_KEYS.has(event.code)) {
        event.preventDefault();
      }
      if (!this.keys.has(event.code)) {
        this.justPressed.add(event.code);
      }
      this.keys.add(event.code);
    });

    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.code);
    });

    window.addEventListener("blur", () => {
      this.keys.clear();
    });

    this._onMouseMove = (event) => {
      if (!this.enabled || !this.pointerLocked) {
        return;
      }
      this.mouseDeltaX += event.movementX || 0;
      this.mouseDeltaY += event.movementY || 0;
    };
    document.addEventListener("mousemove", this._onMouseMove);

    this._onMouseDown = (event) => {
      if (!this.enabled || !this.pointerLocked) {
        return;
      }
      if (event.button === 0) {
        event.preventDefault();
        this.attackClicked = true;
      }
    };
    canvas.addEventListener("mousedown", this._onMouseDown);

    this._onPointerLockChange = () => {
      this.pointerLocked = document.pointerLockElement === canvas;
      if (!this.pointerLocked) {
        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;
      }
    };
    document.addEventListener("pointerlockchange", this._onPointerLockChange);
  }

  requestPointerLock(canvas) {
    if (!this.enabled || document.pointerLockElement === canvas) {
      return;
    }
    canvas.requestPointerLock?.();
  }

  exitPointerLock() {
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  }

  enable() {
    this.enabled = true;
    this.keys.clear();
    this.justPressed.clear();
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.attackClicked = false;
  }

  disable() {
    this.enabled = false;
    this.keys.clear();
    this.justPressed.clear();
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.attackClicked = false;
    this.exitPointerLock();
  }

  consumeMouseLook() {
    const dx = this.mouseDeltaX;
    const dy = this.mouseDeltaY;
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    return { dx, dy };
  }

  wasAttackClicked() {
    return this.enabled && this.attackClicked;
  }

  isDown(code) {
    return this.enabled && this.keys.has(code);
  }

  wasPressed(code) {
    return this.enabled && this.justPressed.has(code);
  }

  endFrame() {
    this.justPressed.clear();
    this.attackClicked = false;
  }

  getMoveInput() {
    return {
      forward:
        (this.isDown("KeyW") || this.isDown("ArrowUp") ? 1 : 0) -
        (this.isDown("KeyS") || this.isDown("ArrowDown") ? 1 : 0),
      right:
        (this.isDown("KeyD") || this.isDown("ArrowRight") ? 1 : 0) -
        (this.isDown("KeyA") || this.isDown("ArrowLeft") ? 1 : 0),
      run: this.isDown("ShiftLeft") || this.isDown("ShiftRight"),
    };
  }
}
