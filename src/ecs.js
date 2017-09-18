export class World {
  constructor(systemsTypes) {
    this.allEntities = []
    this.lastEntityId = 0

    // systemName -> entities[]
    this.entitiesBySystem = {}

    // entityId -> {componentTypes: [int], components:{cmpTypeId -> data}}
    this.components = {}

    this.systems = []
    this.systemsByName = {}

    for (let type of systemsTypes) {
      let system = new type()
      let name = type.name
      system.world = this
      this.systems.push(system)
      this.systemsByName[name] = system
      this.entitiesBySystem[name] = []
    }
    for (let system of this.systems) {
      system.init()
    }

    this.onNextFrameActions = []

    // TODO component deletion/set events
  }

  process(deltaTime) {
    for (let action of this.onNextFrameActions) {
      action()
    }
    this.onNextFrameActions.length = 0

    for (let system of this.systems) {
      system.begin()
      system._process(deltaTime)
      system.end()
    }
    // TODO deletion/set events
  }

  getSystem(typeOrName) {
    let name = this._toSystemName(typeOrName)
    let system = this.systemsByName[name]
    if (!system) {
      throw new Error(`System ${name} not found!`)
    }
    return system
  }

  getEntitiesForSystem(systemName) {
    return this.entitiesBySystem[systemName]
  }

  newEntity() {
    let entity = new Entity(this, ++this.lastEntityId)
    this.allEntities.push(entity)
    return entity
  }

  deleteEntity(entityIdOrEntity, onNextFrame) {
    let id = entityIdOrEntity.constructor.prototype === Entity
      ? entityIdOrEntity.id : entityIdOrEntity

    if (onNextFrame) {
      this.onNextFrameActions.push(
        this.deleteEntity().bind(this, id)
      )
    }
    else {
      // remove all components for this entity
      delete this.components[id]

      // clear the cache for systems
      for (let systemName in this.entitiesBySystem) {
        if (!this.entitiesBySystem.hasOwnProperty(systemName)) {
          continue
        }

        let systemEntities = this.entitiesBySystem[systemName]
        let entityIndex = this._findEntityIndex(id, systemEntities)
        systemEntities.splice(entityIndex, 1)
      }
    }
  }

  getEntity(id) {
    let idx = this._findEntityIndex(id, this.allEntities)
    return idx !== null ? this.allEntities[idx] : null;
  }

  _findEntityIndex(id, collection) {
    let s = 0
    let n = collection.length

    while (s !== n) {
      let center = s + Math.floor((n-s)/2)

      if (center >= n) {
        break
      }

      let entity = collection[center]
      if (entity.id < id) {
        s = center
      }
      else if (entity.id > id) {
        n = center
      }
      else {
        return center
      }
    }

    return null
  }

  getComponent(cmpTypeId, entityId, dontThrowErrorComponentNotFound) {
    let entityComponents = this.components[entityId]
    if (!entityComponents) {
      throw new Error(`Entity ${entityId} was not found!`)
    }

    let component = entityComponents.components[cmpTypeId]
    if (!dontThrowErrorComponentNotFound && !component) {
      throw new Error(`Component ${cmpTypeId} not found for entity ${entityId}!`)
    }
    return component
  }

  setComponent(cmpTypeId, entityId, data, onNextFrame) {
    if (onNextFrame) {
      this.onNextFrameActions.push(
        this.setComponent.bind(this, cmpTypeId, entityId, data)
      )
    }
    else {
      let cmps = this.components[entityId]
      if (!cmps) {
        cmps = this.components[entityId] = {
          componentTypes: [],
          components: {}
        }
      }
      if (cmps.componentTypes.indexOf(cmpTypeId) < 0) {
        cmps.componentTypes.push(cmpTypeId)
      }
      cmps.components[cmpTypeId] = data

      this._updateEntitySystemBelongingness(entityId, cmps.componentTypes)
    }
  }

  deleteComponent(entityId, cmpTypeId, onNextFrame) {
    if (onNextFrame) {
      this.onNextFrameActions.push(
        this.deleteComponent.bind(this, entityId, cmpTypeId)
      )
    }
    else {
      const cmps = this.components[entityId]
      if (cmps) {
        delete cmps.components[cmpTypeId]
        let idx = cmps.componentTypes.indexOf(cmpTypeId)
        cmps.componentTypes.splice(idx, 1)

        this._updateEntitySystemBelongingness(entityId, cmps.componentTypes)

        // TODO call delete event
      }
    }
  }

  hasComponent(cmpTypeId, entityId) {
    return !!this.getComponent(cmpTypeId, entityId, true)
  }

  _toSystemName(typeOrName) {
    let name =
      typeOrName.constructor.prototype === String
      ? typeOrName
      : typeOrName.name

    return name
  }

  _updateEntitySystemBelongingness(entityId, componentTypes) {
    for (let system of this.systems) {
      if (!(system instanceof EntitySystem)) {
        continue
      }
      let systemEntities = this.entitiesBySystem[system.constructor.name]
      let idx = this._findEntityIndex(entityId, systemEntities)
      let belongsToSystem = idx !== null
      let canBeAdopted = system.componentFamily.accepts(componentTypes)

      if (canBeAdopted && !belongsToSystem) {
        let entity = this.getEntity(entityId)
        systemEntities.push(entity)
      }
      else if (!canBeAdopted && belongsToSystem) {
        if (idx === null) {
          throw new Error(`Entity ${entityId} not found when looked for the system ${system.constructor.name}`)
        }

        systemEntities.splice(idx, 1)
      }
    }
  }
}


export class Entity {
  constructor(world, id) {
    this.world = world
    this.id = id
  }

  get(cmpTypeId, dontThrowErrorOnLack) {
    return this.world.getComponent(cmpTypeId, this.id, dontThrowErrorOnLack)
  }

  get$(cmpTypeId) {
    return this.get(cmpTypeId, true)
  }

  set(cmpTypeId, data) {
    this.world.setComponent(cmpTypeId, this.id, data)
    return this
  }

  del(cmpTypeId, onNextFrame) {
    this.world.deleteComponent(cmpTypeId, this.id, onNextFrame)
    return this
  }

  has(cmpTypeId) {
    return this.world.hasComponent(cmpTypeId, this.id)
  }

  toggle(cmpTypeId) {
    const has = this.has(cmpTypeId)
    if (has) {
      this.del(cmpTypeId)
    }
    else {
      this.set(cmpTypeId, { })
    }

    return !has
  }

  destroy() {
    this.world.deleteEntity(this.id)
  }
}

/**
 * Usage: 
 * `const [cShape, cColor, cPos] = DefineComponents(3)`
 */
export function DefineComponents(num) {
  return Array.apply(Array, Array(num)).map((_, idx) => idx)
}


export function ComponentFamily() {
  function indicesToArray(indices) {
    const max = Math.max.apply(null, indices)
    const n = max + 1
    let arr = Array(n).fill(false)
    for (let idx of indices) {
      arr[idx] = true
    }
    return arr
  }

  this.all = (...indices) => {
    this._allCache = indices
    return this
  }
  this.not = (...indices) => {
    this._notCache = indicesToArray(indices)
    return this
  }
  this.accepts = cmpTypesIds => {
    if (this._allCache) {
      for (let id of this._allCache) {
        if (cmpTypesIds.indexOf(id) < 0)
          return false
      }
    }

    if (this._notCache) {
      for (let id of cmpTypesIds) {
        if (this._notCache[id] === true) {
          return false
        }
      }
    }

    return true
  }
}
ComponentFamily.all = (indices) => {
  return new ComponentFamily().all(indices)
}
ComponentFamily.not = (indices) => {
  return new ComponentFamily().not(indices)
}


export class BaseSystem {
  constructor() {
    this.world = null
  }

  getSystem(systemNameOrType) {
    return this.world.getSystem(systemNameOrType)
  }

  init() { }
  begin() { }
  end() { }

  // TODO these are not called
  onEntityAdded(e) { }
  onEntityRemoved(e) { }
  onComponentAdded(e, cmpData, cmpTypeId) { }
  onComponentRemoved(e, cmpData, cmpTypeId) { }

  _process(deltaTime) {
    this.process(deltaTime)
  }
  process(deltaTime) { }
}

export class EntitySystem extends BaseSystem {
  constructor(componentFamily) {
    super()
    if (componentFamily.constructor !== ComponentFamily) {
      throw new Error(`ComponentFamily object expected for system: ${this.constructor.name}.`)
    }
    this.componentFamily = componentFamily
  }

  _process(deltaTime) {
    let systemName = this.constructor.name
    let entities = this.world.getEntitiesForSystem(systemName)
    this.processEntities(deltaTime, entities)
  }

  processEntities(deltaTime, entities) {
    for (let entity of entities) {
      this.process(deltaTime, entity)
    }
  }

  process(deltaTime, entity) { }
}

class TagManager extends BaseSystem {
  constructor() {
    super()

    // entityId -> tags[]
    this.taggedEntities = {}

    // tag -> entities[]
    this.tagsList = {}

    // tag -> entityId -> true
    this.tagsHash = {}
  }

  onEntityRemoved(e) {
    const id = e.id
    if (this.taggedEntities[id]) {
      delete this.taggedEntities[id]

      for (let tag of this.tagsList) {
        if (this.tagsList.hasOwnProperty(tag)) {
          const tagEntities = this.tagsList[tag]
          const idx = tagEntities.indexOf(id)

          if (idx >= 0) {
            tagEntities.splice(idx, 1)
            delete this.tagsHash[tag][id]
          }
        }
      }
    }
  }

  tag(e, tag) {
    const id = e instanceof Entity ? e.id : e
    let entities = this.tagsHash[tag]
    if (!entities) {
      entities = this.tagsHash[tag] = {}
    }

    let entityTags = entities[id]
    if (!entityTags) {
      entityTags = entities[id] = {}
    }
    entityTags[tag] = true
  }

  untag(e, tag) {
    const id = e instanceof Entity ? e.id : e
    let entities = this.tagsHash[tag]
    if (entities) {
      let entityTags = entities[id]
      if (entityTags) {
        delete entityTags[tag]
      }
    }
  }

  getEntities(tag) {
    return this.tagsList[tag]
  }
}