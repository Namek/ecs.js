import {
  BaseSystem, ComponentFamily, EntitySystem
} from "../ecs.js"

import c from '../components.js'


export function newShapeRect(width, height, rotation) {
  return {
    type: 'rect',
    width,
    height,
    rotation: rotation || 0
  }
}
export function newShapeCircle(radius) {
  return {
    type: 'circle',
    radius
  }
}

export class ShapeRenderSystem extends EntitySystem {
  constructor() {
    super(ComponentFamily.all(
      c.Shape
    ))
    this.canvas = document.getElementById('canvas')
    this.ctx = this.canvas.getContext('2d')
  }

  begin() {
    this.ctx.fillStyle = 'steelblue'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }

  process(dt, e) {
    const input = this.world.getSystem(InputSystem)
    const ctx = this.ctx
    const shape = e.get(c.Shape)
    const color = e.get$(c.Color)//optional
    const invisible = e.get$(c.Invisible)//optional

    if (invisible) {
      return
    }

    if (color) {
      ctx.fillStyle = color.fill || '#000'
      ctx.strokeStyle = color.stroke || 'transparent'
    }

    if (shape.type === 'rect') {
      const spatial = e.get(c.Spatial)
      const rotating = shape.rotation*1 !== 0

      if (rotating) {
        ctx.rotate(shape.rotation)
      }

      ctx.fillRect(spatial.x, spatial.y, shape.width, shape.height)

      if (rotating) {
        ctx.setTransform(1,0,0,1,0,0)
      }
    }
    else if (shape.type === 'line') {
      const spatial = e.get$(c.Spatial)//optional
      const x = spatial ? spatial.x : 0
      const y = spatial ? spatial.y : 0

      ctx.beginPath()
      ctx.moveTo(x + shape.x0, y + shape.y0)
      ctx.lineTo(x + shape.x1, y + shape.y1)
      this.strokeFill(ctx, color)
    }
    else if (shape.type === 'circle') {
      const spatial = e.get(c.Spatial)

      ctx.beginPath()
      ctx.arc(spatial.x, spatial.y, shape.radius, 0, 2*Math.PI)
      this.strokeFill(ctx, color)
    }
    else {
      throw new Error(`Unsupported shape: ${shape.type}`)
    }
  }

  strokeFill(ctx, color) {
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
export class InputSystem extends BaseSystem {
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

  process(dt) {
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

  isButtonPressed(b) {
    if (typeof (b) == "object") {
      return b.pressed
    }
    return b == 1.0
  }

  wasButtonJustPressed(btnNameOrIndex) {
    let btnIdx = this._getBtnIndex(btnNameOrIndex)
    return this.justPressedButtons[btnIdx]
  }

  wasButtonJustReleased(btnNameOrIndex) {
    let btnIdx = this._getBtnIndex(btnNameOrIndex)
    return this.justReleasedButtons[btnIdx]
  }

  getLeftStick(moveBias) {
    let axisXMoves = this.leftStick[2] = Math.abs(this.leftStick[0]) >= moveBias
    let axisYMoves = this.leftStick[3] = Math.abs(this.leftStick[1]) >= moveBias
    this.leftStick[4] = axisXMoves || axisYMoves
    return this.leftStick
  }

  _getBtnIndex(btnNameOrIndex) {
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
