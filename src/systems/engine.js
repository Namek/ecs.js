// @flow

import {
  BaseSystem, ComponentFamily, Entity, EntitySystem
} from "../ecs.js"

import {c, C} from '../enums/index.js'


export function newShapeRect(width: number, height: number, rotation: ?number) {
  return {
    type: 'rect',
    width,
    height,
    rotation: rotation || 0
  }
}
export function newShapeCircle(radius: number) {
  return {
    type: 'circle',
    radius
  }
}

export class ShapeRenderSystem extends EntitySystem {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D

  constructor() {
    super(ComponentFamily
      .all(c.Shape)
      .not(c.Invisible)
    )
  }

  init() {
    this.canvas = this.inject(C.Canvas)
    this.ctx = this.inject(C.Context2D)
  }

  begin() {
    this.ctx.fillStyle = 'steelblue'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }

  process(dt: number, e: Entity) {
    const input = this.world.getSystem(GamepadInputSystem)
    const ctx = this.ctx
    const shape = e.get(c.Shape)
    const color = e.get$(c.Color)//optional

    if (color) {
      ctx.fillStyle = color.fill || '#000'
      ctx.strokeStyle = color.stroke || 'transparent'
    }

    if (shape.type === 'rect') {
      const pos = e.get(c.Position)
      const rotating = shape.rotation*1 !== 0

      if (rotating) {
        ctx.save()
        ctx.translate(pos.x + shape.width/2, pos.y + shape.height/2)
        ctx.rotate(shape.rotation * Math.PI / 180.0)
        ctx.fillRect(-shape.width/2, -shape.height/2, shape.width, shape.height)
        ctx.restore()
      }
      else {
        ctx.fillRect(pos.x, pos.y, shape.width, shape.height)
      }
    }
    else if (shape.type === 'line') {
      const pos = e.get$(c.Position)//optional
      const x = pos ? pos.x : 0
      const y = pos ? pos.y : 0

      ctx.beginPath()
      ctx.moveTo(x + shape.x0, y + shape.y0)
      ctx.lineTo(x + shape.x1, y + shape.y1)
      this.strokeFill(ctx, color)
    }
    else if (shape.type === 'circle') {
      const pos = e.get(c.Position)

      ctx.beginPath()
      ctx.arc(pos.x, pos.y, shape.radius, 0, 2*Math.PI)
      this.strokeFill(ctx, color)
    }
    else {
      throw new Error(`Unsupported shape: ${shape.type}`)
    }
  }

  strokeFill(ctx: CanvasRenderingContext2D, color: String) {
    if (color) {
      if (color.fill) {
        ctx.fill()
      }
      if (color.stroke) {
        ctx.stroke()
      }
    }
    else {
      ctx.stroke()
    }
  }
}

/**
 * Supports XBox 360 game pad.
 */
export class GamepadInputSystem extends BaseSystem {
  gamepad: any
  buttonState: Object
  prevButtonState: Object
  justPressedButtons: Object
  justReleasedButtons: Object
  axes: Array<number>
  leftStick: Array<any>

  constructor() {
    super()
    this.gamepad = null
    this.buttonState = { }
    this.prevButtonState = { }
    this.justPressedButtons = { }
    this.justReleasedButtons = { }
    this.axes = [ ]
    this.leftStick = [0, 0, 0, 0, 0]
  }

  init() {
    window.addEventListener("gamepadconnected", evt => {
      let gamepad = this.gamepad = window.navigator.getGamepads()[evt.gamepad.index];

      console.log(
        "Gamepad connected at index %d: %s. %d buttons, %d axes.",
        gamepad.index, gamepad.id,
        gamepad.buttons.length, gamepad.axes.length
      )
    })
  }

  process(dt: number) {
    const gamepad = this.gamepad
    for (let i in gamepad.buttons) {
      let btn = gamepad.buttons[i]
      let isPressed = this.isButtonPressed(btn)
      this.prevButtonState[i] = this.buttonState[i]
      this.justPressedButtons[i] = isPressed && this.prevButtonState[i] !== true
      this.justReleasedButtons[i] = !isPressed && this.prevButtonState[i] === true
      this.buttonState[i] = isPressed
    }
    this.axes = gamepad.axes
    this.leftStick[0] = gamepad.axes[0]
    this.leftStick[1] = gamepad.axes[1]
  }

  get isAnyGamepadConnected(): boolean {
    return !!this.gamepad
  }

  isButtonPressed(b: any) {
    if (typeof (b) == "object") {
      return b.pressed
    }
    return b == 1.0
  }

  wasButtonJustPressed(btnNameOrIndex: string | number) {
    let btnIdx = this._getBtnIndex(btnNameOrIndex)
    return this.justPressedButtons[btnIdx]
  }

  wasButtonJustReleased(btnNameOrIndex: string | number) {
    let btnIdx = this._getBtnIndex(btnNameOrIndex)
    return this.justReleasedButtons[btnIdx]
  }

  getLeftStick(moveBias: number) {
    let axisXMoves = this.leftStick[2] = Math.abs((this.leftStick[0]: number)) >= moveBias
    let axisYMoves = this.leftStick[3] = Math.abs((this.leftStick[1]: number)) >= moveBias
    this.leftStick[4] = axisXMoves || axisYMoves
    return this.leftStick
  }

  _getBtnIndex(btnNameOrIndex: string | number) {
    let btnIdx = btnNameOrIndex

    if (btnNameOrIndex.constructor === String) {
      // TODO change letter switch to simple constants
      switch (btnNameOrIndex) {
        case 'A':
          btnIdx = 0
          break
        case 'B':
          btnIdx = 1
          break
        case 'X':
          btnIdx = 2
          break
        case 'Y':
          btnIdx = 3
          break
        default:
          throw new Error(`Unknown button name: ${btnNameOrIndex}`)
      }
    }
    return btnIdx
  }
}

export class MovementSystem extends EntitySystem {
  constructor() {
    super(ComponentFamily.all(c.Position, c.Velocity))
  }

  process(dt: number, e: Entity) {
    const pos = e.get(c.Position)
    const vel = e.get(c.Velocity)

    pos.x += vel.x * dt
    pos.y += vel.y * dt
  }
}