// @flow

import {BaseSystem} from '../ecs.js'
import {newShapeRect} from './engine.js'
import {c, C} from '../enums/index.js'

export default class EntityFactoryManager extends BaseSystem {
  spawnPoints: Array<number>
  lastSpawnIndex: number
  canvas: any

  constructor() {
    super()
    this.spawnPoints = [0.4, 0.2, 0.7, 0.1, 0.6]
    this.lastSpawnIndex = -1
  }

  init() {
    this.canvas = this.inject(C.Canvas)
  }

  spawnBlock() {
    this.lastSpawnIndex = (this.lastSpawnIndex + 1) % this.spawnPoints.length
    let x = this.spawnPoints[this.lastSpawnIndex] * this.canvas.clientWidth

    this.world.newEntity()
      .set(c.Block, {speed: 20})
      .set(c.Position, {x, y: 0})
      .set(c.Shape, newShapeRect(20, 20, 16))
  }
}
