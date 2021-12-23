import Player from './entities/player.js'
import * as Entity from './entities/entity.js'
import { CAMERA_STYLE, viewWidth, viewHeight, viewX, viewY, COLOR } from './core.js'
import Goop from './entities/goop.js'
import { Segment, Point } from './geometry.js'
import Input from './input.js'

import { STATE } from './entities/entity.js'

export let player = null

export const GAME_MODE = {
  NONE: {
    id: 0,
    settings: {
      maxGoops: 5,
      startSize: 10,
      spawnRate: 2000,
      sizeVariance: 20
    },
    applyCamera: () => CAMERA_STYLE.PAN(1.05, 0),
    spawnGoop: () => {
      let goop = spawnRoamer(2)
      if (goop == undefined) return
      let alpha = goop.size / gameMode.settings.startSize
      goop.color = COLOR.setRgbaAlpha(goop.color, alpha)
      goop.accelerationMax = 0.2
      goop.velocityTerminal = 4
    }
  },
  ROAM: {
    id: 1,
    settings: {
      maxGoops: 100,
      startSize: 6,
      spawnRate: 50,
      sizeVariance: 30
    },
    applyCamera: () => CAMERA_STYLE.FOLLOW(),
    spawnGoop: () => spawnRoamer(1 + Math.floor(Math.random() * 2))
  },
  RUN: {
    id: 2,
    settings: {
      maxGoops: 50,
      startSize: 14,
      spawnRate: 250,
      sizeVariance: 4
    },
    applyCamera: () => CAMERA_STYLE.PAN(2.25, 0),
    spawnGoop: spawnRunner
  },
  CHASE: {
    id: 3,
    settings: {
      maxGoops: 60,
      startSize: 7,
      spawnRate: 500,
      sizeVariance: 2
    },
    applyCamera: () => CAMERA_STYLE.FOLLOW(),
    spawnGoop: spawnChaser
  },
  HORDE: {
    id: 4,
    settings: {
      maxGoops: 100,
      startSize: 14,
      spawnRate: 100,
      sizeVariance: 4
    },
    applyCamera: () => CAMERA_STYLE.STATIC(),
    spawnGoop: spawnHorde
  },
  DEV: {
    id: 5,
    settings: {
      maxGoops: 0,
      startSize: 5,
      spawnRate: 1000,
      sizeVariance: 5
    },
    applyCamera: () => CAMERA_STYLE.FOLLOW(), // .STATIC
    spawnGoop: () => spawnRoamer(1)
  }
}
let gameMode = GAME_MODE.NONE
export function getGameMode() {
  return gameMode
}
export function setGameMode(mode) {
  gameOver()
  gameMode = mode
}
let spawnTimerRemaining = gameMode.settings.spawnRate
let spawnActive = true

export function gameOver() {
  if (player.state == Entity.STATE.NONE) player.explode()
  spawnActive = false

  if ([GAME_MODE.ROAM, GAME_MODE.NONE, GAME_MODE.DEV].includes(gameMode)) {
    Entity._entities.forEach(entity => {
      if (!(entity instanceof Goop) || entity instanceof Player) return
      // All goops flee to closest side of view
      let stoppingPoint = entity.stoppingVector()
      let x = entity.position.x + stoppingPoint.x()
      let y = entity.position.y + stoppingPoint.y()
      let closest = { destination: { x: 0, y: 0 }, dist: 9999 }
      for (let s = 0; s < 4; s++) {
        let dist = Math.abs((x - viewX()) * ((s + 1) % 2) - viewWidth() * (s == 2)) + Math.abs((y - viewY()) * (s % 2) - (viewHeight()) * (s == 3))
        if (dist < closest.dist) {
          closest = {
            destination: { x: x - ((s == 0) * 9999) + ((s == 2) * 9999), y: y - ((s == 1) * 9999) + ((s == 3) * 9999) },
            dist: dist
          }
        }
      }
      entity.waypoints.set([{ x: closest.destination.x, y: closest.destination.y }])
      entity.state = Entity.STATE.FLEE
    })
  }
  else if (gameMode == GAME_MODE.CHASE || gameMode == GAME_MODE.HORDE) {
    Entity._entities.forEach(entity => {
      if (!(entity instanceof Goop) || entity instanceof Player) return
      entity.state = Entity.STATE.FLEE
      entity.waypoints.clear()
    })
  }
  else if (gameMode == GAME_MODE.RUN) {
    for (let w = 0; w < Entity._entities.length; w++) {
      let entity = Entity._entities[w]
      if (!(entity instanceof Goop)) continue
      entity.waypoints.set([{ x: entity.position.x + 9999, y: entity.position.y }])
      entity.state = Entity.STATE.FLEE
      entity.color = entity.color // setRgbaAlpha(entity.color, 1)
    }
  }
}

function handlePlayerInput() {
  if (player.state == Entity.STATE.NONE || player.state == Entity.STATE.PHASED) {
    let moveMod = {
      x: Input.isKeyPressed(Input.KEYCODE.RIGHT) - Input.isKeyPressed(Input.KEYCODE.LEFT),
      y: Input.isKeyPressed(Input.KEYCODE.DOWN) - Input.isKeyPressed(Input.KEYCODE.UP)
    }
    if (moveMod.x != 0 || moveMod.y != 0) {
      player.waypoints.clear()
      player.acceleration.angle(Math.atan2(moveMod.y, moveMod.x))
      player.acceleration.magnitude(player.accelerationMax)
    } else if (player.waypoints.isEmpty()) {
      player.acceleration.magnitude(0)
    }
  }
  // Mouse control
  // if (Input.isMouseDown() && input.mouse.withShift) {
  //   player.waypoints.add({ x: Input.mouseLocation().x, y: Input.mouseLocation().y })
  //   input.mouseDown = false
  // }
  // if (input.mouse.buttons['2'] !== undefined) {
  //   if (input.mouse.buttons['2'] === true) {
  //     player.waypoints.clear()
  //   }
  // }
}

export function updateTick(delta) {
  handlePlayerInput()
  gameMode.applyCamera()
  handleSpawnTick(delta)

  Entity.update(delta)

  // reset game
  if (player.state == Entity.STATE.EXPLODED) {
    gameOver()
    player.state = Entity.STATE.PERGATORY
  }
  // waits for all goops to die off
  if (player.state == Entity.STATE.PERGATORY && Entity.entityCounts.Goop == 0) {
    if (gameMode != GAME_MODE.NONE) {
      player.size = gameMode.settings.startSize
      player.tail.sync()
      player.position.x = viewX() + viewWidth() / 2
      player.position.y = viewY() + viewHeight() / 2
      player.waypoints.clear()
      player.reform.play()
    }

    spawnActive = true

    if (gameMode == GAME_MODE.ROAM) {
      player.velocityTerminal = 4
      player.accelerationMax = 0.5
    } else
    if (gameMode == GAME_MODE.RUN) {
      let size = 20
      for (let i = 0; i < Math.floor(viewHeight() / size); i++) {
        let newGoop = new Goop(
          viewX() + viewWidth() - size * 2 - 10 - Math.random() * 10,
          viewY() + i * (size + 1) - Math.random() * 6,
          Math.floor(size / 2 + Math.random() * 4), COLOR.GREEN, "MINDLESS")
        newGoop.accelerationMax = 2.25
        newGoop.velocityTerminal = 2.25
        newGoop.acceleration.magnitude(newGoop.accelerationMax)
        newGoop.acceleration.angle(Math.PI)
        newGoop.velocity.magnitude(newGoop.velocityTerminal)
        newGoop.velocity.angle(Math.PI)
        newGoop.state = Entity.STATE.RAGE
      }
    } else
    if (gameMode == GAME_MODE.CHASE) {
      player.accelerationMax = 1
    } else
    if (gameMode == GAME_MODE.HORDE) {
      player.velocityTerminal = 7
    } else
    if (gameMode == GAME_MODE.DEV) {
      player.velocityTerminal = 3.5
    }
  }
}

export function render(context) {
  Entity.render(context)
}

function handleSpawnTick(delta) {
  // Spawn mobs
  if (spawnActive) {
    if (spawnTimerRemaining > 0) {
      spawnTimerRemaining -= delta
    } else {
      spawnTimerRemaining = gameMode.settings.spawnRate
      gameMode.spawnGoop()
    }
  } else {
    spawnTimerRemaining = gameMode.settings.spawnRate
  }
}

/**
 * Spawns a goop outside of a random border of the viewport and gives it a
 * random destination in the viewport.
 */
function spawnRoamer(points = 1) {
  if (Entity.entityCounts.Goop >= gameMode.settings.maxGoops) { return }
  let side = Math.floor(Math.random() * 4)
  let x = Math.floor(Math.random() * viewWidth()) + viewX()
  let y = Math.floor(Math.random() * viewHeight()) + viewY()
  let size = player.size + Math.floor(Math.random() * gameMode.settings.sizeVariance)
  if (side == 0) {
    y = viewY() - size - viewWidth()/2
  } else if (side == 1) {
    x = viewX() + viewWidth() + size + viewHeight()/2
  } else if (side == 2) {
    y = viewY() + viewHeight() + size + viewWidth()/2
  } else if (side == 3) {
    x = viewX() - size - viewHeight()/2
  }
  let newGoop = new Goop(x, y, size, COLOR.GREEN, "ROAM", points)
  newGoop.accelerationMax = 0.05
  newGoop.velocityTerminal = 8
  return newGoop
}

/**
 * Spawns a goop significantly outside the left viewport border and gives it a
 * random destination on the right side of the viewport.
 */
function spawnRunner() {
  let y = Math.floor(Math.random() * viewHeight()) + viewY()
  let size = player.size + Math.floor(Math.random() * gameMode.settings.sizeVariance)
  let newGoop = new Goop(viewX() - size + 1, y, size, COLOR.GREEN, "MINDLESS")
  newGoop.accelerationMax = 0.05
  newGoop.velocityTerminal = 8
  newGoop.acceleration.magnitude(newGoop.accelerationMax)
  newGoop.acceleration.angle(0)
  newGoop.velocity.magnitude(newGoop.velocityTerminal)
  newGoop.velocity.angle(0)
  newGoop.state = Entity.STATE.FLEE
  return newGoop
}

/**
 * Spawns a goop behind the player outside of bounds, increases its speed, reduces
 * turn rate, sets state to rage, and gives the destination as the player's location.
 */
function spawnChaser() {
  if (Entity.entityCounts.Goop >= gameMode.settings.maxGoops) { return }
  let dir = (player.velocity.angle() + Math.PI) % (2 * Math.PI)
  let locPoint = undefined
  let ray = new Segment(new Point(viewWidth() / 2, viewHeight() / 2), new Point(viewWidth() / 2 + 999 * Math.cos(dir), viewHeight() / 2 + 999 * Math.sin(dir)))
  let sides = [
    new Segment(new Point(0, 0), new Point(viewWidth(), 0)),
    new Segment(new Point(viewWidth(), 0), new Point(viewWidth(), viewHeight())),
    new Segment(new Point(viewWidth(), viewHeight()), new Point(0, viewHeight())),
    new Segment(new Point(0, viewHeight()), new Point(0, 0))
  ]
  while (sides.length != 0 && locPoint === undefined) {
    locPoint = ray.intersectionPoint(sides.pop())
  }
  if (locPoint === undefined) { return }
  let x = viewX() + locPoint.x
  let y = viewY() + locPoint.y
  let size = Math.max(player.size - Math.floor(Math.random() * gameMode.settings.sizeVariance), 1)
  let newGoop = new Goop(x, y, size, COLOR.GREEN, "FOLLOW")
  newGoop.state = Entity.STATE.RAGE
  newGoop.velocityTerminal = 14
  newGoop.accelerationMax = 0.2
  newGoop.velocity.angle(dir + Math.PI)
  newGoop.velocity.magnitude(newGoop.velocityTerminal)
  return newGoop
}

/**
 * Similar to spawnChaser except the area behind the player in which a goop can spawn is wider.
 */
function spawnHorde() {
  if (Entity.entityCounts.Goop >= gameMode.settings.maxGoops) return
  let dir = (player.velocity.angle() + Math.PI) % (2 * Math.PI) + ((Math.random() * 80 - 40) / 180 * Math.PI)
  let locPoint = undefined
  let ray = new Segment(new Point(viewWidth() / 2, viewHeight() / 2), new Point(viewWidth() / 2 + 999 * Math.cos(dir), viewHeight() / 2 + 999 * Math.sin(dir)))
  let sides = [
    new Segment(new Point(0, 0), new Point(viewWidth(), 0)),
    new Segment(new Point(viewWidth(), 0), new Point(viewWidth(), viewHeight())),
    new Segment(new Point(viewWidth(), viewHeight()), new Point(0, viewHeight())),
    new Segment(new Point(0, viewHeight()), new Point(0, 0))
  ]
  while (sides.length != 0 && locPoint === undefined) {
    locPoint = ray.intersectionPoint(sides.pop())
  }
  if (locPoint === undefined) { return }
  let x = viewX() + locPoint.x
  let y = viewY() + locPoint.y
  let size = player.size - gameMode.settings.sizeVariance
  let newGoop = new Goop(x, y, size, COLOR.GREEN, "FOLLOW")
  newGoop.state = Entity.STATE.RAGE
  newGoop.velocityTerminal = 5
  newGoop.accelerationMax = 0.2
  newGoop.velocity.angle(dir + Math.PI)
  newGoop.velocity.magnitude(newGoop.velocityTerminal)
  newGoop.turnRate = 10
  return newGoop
}

export function init() {
  player = new Player(0, 0, gameMode.settings.startSize)
  player.state = STATE.PERGATORY
}
