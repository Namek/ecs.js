// @flow

import {
  BaseSystem, ComponentFamily, Entity, EntitySystem, World
} from "./ecs.js";
import {
  InputSystem, ShapeRenderSystem, newShapeRect, newShapeCircle
} from "./systems/engine.js"
import {
  AvatarLogicSystem
} from "./systems/game_logic.js"

import c from './components.js'
import C from './constants.js'



// setTimeout(() => {
  let world = new World([
    InputSystem,
    AvatarLogicSystem,
    ShapeRenderSystem
  ])
  world.newEntity()
    .set(c.Avatar, { doesSomething: false })
    .set(c.Shape, newShapeCircle(20))
    .set(c.Color, {fill: 'blue'})
    .set(c.Spatial, {x: 80, y: 200})

  function processWorld() {
    world.process(0.016)
    requestAnimationFrame(() => processWorld())
  }

  window.addEventListener("gamepadconnected", function (e) {
    let gamepad = window.navigator.getGamepads()[e.gamepad.index];

    console.log(
      "Gamepad connected at index %d: %s. %d buttons, %d axes.",
      gamepad.index, gamepad.id,
      gamepad.buttons.length, gamepad.axes.length
    );

    world.getSystem(InputSystem).gamepad = gamepad

    processWorld()
  })

// }, 100)



/*
class AvatarRenderSystem extends EntitySystem {
  process() {
    const entities = this.getEntities()


    for (let a of avatar.parts) {
      ctx.fillStyle = 'red'
      let x = a.x - a.w / 2
      let y = a.y - a.h / 2
      ctx.fillRect(x, y, a.w, a.h)
    }
  }
}


class RenderSystem extends EntitySystem {
  constructor() {
    super(RenderCmp)
    this.canvas = document.getElementById('canvas')
    this.ctx = canvas.getContext('2d')
  }

  process(dt) {
    const entities = this.getEntities()
    const input = this.world.getSystem(InputSystem)
    const ctx = this.ctx
    let btnA = input.buttonJustPressed(input.gamepad.buttons[0], 'A')
    let axisX = input.gamepad.axes[0]
    let axisY = input.gamepad.axes[1]
    let xlen = Math.abs(axisX), ylen = Math.abs(axisY)

    ctx.fillStyle = 'steelblue';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (xlen > 0.1 || ylen > 0.1) {
      let dir = {
        x: Math.sign(axisX) * xlen,
        y: -Math.sign(axisY) * ylen
      };
      let len = Math.sqrt(dir.x * dir.x + dir.y * dir.y)
      let normX = dir.x / len
      let normY = dir.y / len
      dir.x = normX
      dir.y = normY
      let lineLen = LINE_LEN * len
      let a = state.avatar.parts[0]

      ctx.fillStyle = 'black'
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(a.x + dir.x * lineLen, a.y - dir.y * lineLen)
      ctx.stroke()
    }
  }


  drawLittleColorfulFucker(dirX, dirY, color) {
    let len = Math.sqrt(dirX * dirX + dirY * dirY)
    let normX = dirX / len
    let normY = dirY / len
    let angle = Math.atan2(normY, normX)

    while (angle < 0)
      angle += Math.PI * 2

    let localX = 1 * lineLen
    let localY = 0 * lineLen
    const c = Math.cos(angle)
    const s = Math.sin(angle)

    const x = c * localX + s * localY;
    const y = s * localX - c * localY;

    ctx.fillStyle = color


    ctx.fillRect(
      a.x + x - POINTER_SIZE / 2,
      a.y + y - POINTER_SIZE / 2,
      POINTER_SIZE, POINTER_SIZE
    )
  }
}
*/