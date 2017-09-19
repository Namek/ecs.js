// @flow

import {
  BaseSystem, ComponentFamily, Entity, EntitySystem, World
} from "./ecs.js";
import {
  InputSystem, ShapeRenderSystem, newShapeRect, newShapeCircle
} from "./systems/engine.js"
import {
  GameStateSystem, AvatarLogicSystem, BlockLogicSystem, EntityFactoryManager
} from "./systems/game_logic.js"

import c from './components.js'
import C from './constants.js'



const canvas: any = document.getElementById('canvas')
const ctx: any = canvas.getContext('2d')

let world = new World([
  EntityFactoryManager,

  // logic
  GameStateSystem,
  InputSystem,
  BlockLogicSystem,
  AvatarLogicSystem,

  // render
  ShapeRenderSystem,

])
  .register(C.Canvas, canvas)
  .register(C.Context2D, ctx)
  .init()

world.newEntity()
  .set(c.Avatar, { doesSomething: false })
  .set(c.Shape, newShapeCircle(20))
  .set(c.Color, {fill: 'blue'})
  .set(c.Position, {x: 80, y: 200})

function processWorld() {
  world.process(0.016)
  requestAnimationFrame(processWorld)
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

window.world = world