// Handles dynamic canvas drawing on the background of the home "scene"

// Classes in JavaScript are not hoisted. All other letables/functions are lifted to the top of their scope for order-less reference
// So order matters for 'class' declarations
// =========================================================================================================================

// Color palette
var __color_background     = "rgb(44,54,64)";
var __color_foreground     = "white";
var __color_text          = "rgb(234,236,238)";
var __color_tonic         = "rgb(0,102,153)";
var __color_mediant        = "rgb(0,119,180)";
var __color_dominant      = "rgb(51,153,204)";
var __color_accent        = "rgb(255,204,51)";
var __color_accent_backup  = "rgb(72,88,104)";

window.onresize = function() {
  // Note: Each time the height or width of a canvas is re-set, the canvas transforms will be cleared.
  let transform = bgContext.getTransform()
  canvas_bg.width = canvas_bg.offsetWidth
  canvas_bg.height = canvas_bg.offsetHeight
  canvas_fg.width = canvas_fg.offsetWidth
  canvas_fg.height = canvas_fg.offsetHeight
  bgContext.setTransform(transform)

  renderBounds(fgContext)
};

let RENDER_HERTZ = 1000 / 60; // Render update speed
let canvasRunning = true; // when the GUI setting is enabled or not. Override drawing.
let canvasFlush = true; // if drawing frames are cleared or retained
let bgContext // World entities
let fgContext // Viewport clipping

// HTML element referencess
let canvas_bg = document.getElementById('bgCanvas')
let canvas_fg = document.getElementById('fgCanvas')
let inputField = {
  maxGoops: document.getElementById("input-max-goops"),
  spawnRate: document.getElementById("input-spawn-rate")
  // maxSpeed: document.getElementById("input-max-speed"),
  // turnRate: document.getElementById("input-turn-rate")
}
let menuPause = document.getElementById('menu-pause')

// Player Controls
const KEYCODE = {
  LEFT: 65,
  UP: 87,
  RIGHT: 68,
  DOWN: 83,
  LEFT_ALT: 37,
  UP_ALT: 38,
  RIGHT_ALT: 39,
  DOWN_ALT: 40
}
let player = {
  wisp: null
}
let input = {
  keyDown: {
    [KEYCODE.LEFT]: false,
    [KEYCODE.UP]: false,
    [KEYCODE.RIGHT]: false,
    [KEYCODE.DOWN]: false,
    [KEYCODE.LEFT_ALT]: false,
    [KEYCODE.UP_ALT]: false,
    [KEYCODE.RIGHT_ALT]: false,
    [KEYCODE.DOWN_ALT]: false
  }
}

let GAME_MODE = {
  NONE: {
    id: 0,
    settings: {
      maxGoops: 50,
      startSize: 5,
      spawnRate: 100,
      sizeVariance: 22
    }
  },
  ROAM: {
    id: 1,
    settings: {
      maxGoops: 20,
      startSize: 8,
      spawnRate: 250,
      sizeVariance: 4
    }
  },
  RUN: {
    id: 2,
    settings: {
      maxGoops: 30,
      startSize: 9,
      spawnRate: 1000,
      sizeVariance: 13
    }
  },
  CHASE: {
    id: 3,
    settings: {
      maxGoops: 60,
      startSize: 8,
      spawnRate: 1000,
      sizeVariance: 5
    }
  },
}
let gameMode = GAME_MODE.NONE
let upgrades = {
  vision: true
}
let view = {
  MOVE_SPEED: 3,
  width: 800,
  height: 600,
  x: 0,
  y: 0
}
let wisps = []
let spawnTimer = null
let spawnTimerRemaining = gameMode.settings.spawnRate // use to keep track of paused timer
let spawnTimerStart = 0
let gameIsOver = true;

function toggleCanvasDrawing() {
  canvasRunning = !canvasRunning;
  if (canvasRunning) {
    update()
    resumeSpawner()
  } else {
    pauseSpawner()
  }

  if (gameMode != GAME_MODE.NONE && !canvasRunning) {
    menuPause.style.display = "inline-block"
  } else {
    menuPause.style.display = "none"
  }
};

// document.getElementById('drawer-close-button').onmouseup = e => {
//   let sideDrawer = document.getElementById('side-drawer')
//   if (sideDrawer.style.right == "0px") {
//     sideDrawer.style.right = "-" + sideDrawer.offsetWidth + "px"
//     e.target.style.backgroundImage = "url('./images/icon_arrow_left.png')"
//   } else {
//     sideDrawer.style.right = 0
//     e.target.style.backgroundImage = "url('./images/icon_arrow_right.png')"
//   }
// }

document.getElementById('menu-pause-restart').onclick = e => {
  toggleCanvasDrawing()
  gameOver()
}

document.getElementById('menu-pause-menu').onclick = e => {
  toggleCanvasDrawing()
  gameOver()
  gameMode = GAME_MODE.NONE
  startSpawner()

  let menuItems = document.getElementById('menu-items')
  TweenLite.to(menuItems, 1, {
    display: "inline-block",
    alpha: 1
  });
}

document.getElementById('menu-item-play-roam').onclick = e => {
  let menuItems = document.getElementById('menu-items')
  TweenLite.to(menuItems, 1, {alpha: 0})
  TweenLite.set(menuItems, {delay: 1, display: 'none'})
  player.wisp.position.x = view.x + view.width/2
  player.wisp.position.y = view.y + view.height/2
  gameOver()
  gameMode = GAME_MODE.ROAM
}

document.getElementById('menu-item-play-run').onclick = e => {
  let menuItems = document.getElementById('menu-items')
  TweenLite.to(menuItems, 1, {alpha: 0})
  TweenLite.set(menuItems, {delay: 1, display: 'none'})
  player.wisp.position.x = view.x + view.width/2
  player.wisp.position.y = view.y + view.height/2
  gameOver()
  gameMode = GAME_MODE.RUN
}

document.getElementById('menu-item-play-chase').onclick = e => {
  let menuItems = document.getElementById('menu-items')
  TweenLite.to(menuItems, 1, {alpha: 0})
  TweenLite.set(menuItems, {delay: 1, display: 'none'})
  player.wisp.position.x = view.x + view.width/2
  player.wisp.position.y = view.y + view.height/2
  gameOver()
  gameMode = GAME_MODE.CHASE
}

// Object.keys(inputField).forEach(key => {
//   let field = inputField[key]
//   field.value = field.placeholder = gameMode.settings[key]
//   field.onblur = e => {
//     let num = parseInt(e.target.value)
//     if (num != NaN) {
//       gameMode.settings[key] = num
//     } else {
//       e.target.value = gameMode.settings[key]
//     }
//     e.target.value = e.target.placeholder = gameMode.settings[key]
//   }
// })

// ================================================================================================ Key Press Init =====

document.onkeyup = document.onkeydown = e => {
  e = e || window.event;
  input.keyDown[e.keyCode] = e.type == 'keydown'; //console.log(e.keyCode);

  // pressing 'esc'
  if (e.keyCode == 27 && gameMode != GAME_MODE.NONE && e.type == 'keydown') {
    toggleCanvasDrawing();
  }

  // Pressing 'p' key
  if (e.keyCode == 112 && gameMode == GAME_MODE.ROAM && e.type == 'keydown') {
    if (player.wisp.state == STATE_PHASED) {
      player.wisp.phaseIn();
    } else if (player.wisp.state == STATE_NONE) {
      player.wisp.phaseOut();
    }
  }

  // Pressing 'i' key
  if (e.keyCode == 110 && e.type == 'keydown') {
    canvasFlush = !canvasFlush;
  }
}

// ======================================================================================================================== Clock =====
window.requestAnimFrame =
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function (callback) {
      window.setTimeout(callback, RENDER_HERTZ);
  };

function update(delta) {
  if (canvasFlush) {
    bgContext.clearRect(view.x, view.y, canvas_bg.width, canvas_bg.height)
  }

  // key control player wisp
  if (player.wisp.state == STATE_NONE || player.wisp.state == STATE_PHASED) {
    // TODO: change 300 to calcuated shortest distance to stop if not pressing key else max distance
    let stoppingDistance = 300
    if (input.keyDown[KEYCODE.RIGHT] || input.keyDown[KEYCODE.LEFT] || input.keyDown[KEYCODE.UP] || input.keyDown[KEYCODE.DOWN]) {
      stoppingDistance = 9999
    }
    let moveModifier = {
      x: stoppingDistance * input.keyDown[KEYCODE.RIGHT] - stoppingDistance * input.keyDown[KEYCODE.LEFT],
      y: stoppingDistance * input.keyDown[KEYCODE.DOWN] - stoppingDistance * input.keyDown[KEYCODE.UP]
    }
    if (moveModifier.x != 0 || moveModifier.y != 0) {
      player.wisp.waypoint.set(player.wisp.position.x + moveModifier.x, player.wisp.position.y + moveModifier.y);
    }
  }

  // viewport movement
  if (gameMode == GAME_MODE.ROAM || gameMode == GAME_MODE.CHASE) {
    let xMod = (player.wisp.position.x - view.width/2) - view.x
    let yMod = (player.wisp.position.y - view.height/2) - view.y
    bgContext.translate(-xMod, -yMod)
    view.x = player.wisp.position.x - view.width/2
    view.y = player.wisp.position.y - view.height/2
  } else
  if (gameMode == GAME_MODE.RUN) {
    let SCROLL_SPEED = 5.72 // camera is faster for some reason
    let xMod = SCROLL_SPEED
    if (!gameIsOver) {
      bgContext.translate(xMod, 0);
      view.x -= xMod
    }
  } else
  if (gameMode == GAME_MODE.NONE) {
    let SCROLL_SPEED = 1.1
    let xMod = SCROLL_SPEED
    bgContext.translate(xMod, 0);
    view.x -= xMod
  }

  // Wisp updates
  for (let w = 0; w < wisps.length; w++) {
    let wisp = wisps[w]
    if (wisp != player.wisp) {
      // remove killed wisps
      if (wisp.state == STATE_PERGATORY) {
        wisps.splice(w, 1)
        w--
        continue;
      }
      // remove fleeing wisps outside of bounds
      if (wisp.state == STATE_FLEE) {
        if ((gameMode == GAME_MODE.ROAM || gameMode == GAME_MODE.CHASE) && wisp.tail.joint.length > 0) {
          let tailEndPoint = wisp.tail.joint[wisp.tail.joint.length - 1].position
          if (tailEndPoint.x < view.x || tailEndPoint.x > view.x + view.width ||
            tailEndPoint.y < view.y || tailEndPoint.y > view.y + view.height) {
            wisps.splice(w, 1)
            w--
            continue;
          }
        }
      }
      if (gameMode == GAME_MODE.RUN) {
        if (gameIsOver) {
          if (wisp.position.x < view.x || wisp.position.x > view.x + view.width ||
            wisp.position.y < view.y || wisp.position.y > view.y + view.height) {
            wisps.splice(w, 1)
            w--
            continue;
          }
        }
        if (wisps.length > 1 && wisp.state != STATE_RAGE) {
          if (wisp.position.x > wisps[1].position.x - wisps[1].size - wisp.size) {
            wisp.explode(Math.PI, 5, 60)
            continue;
          }
        }
      }
      // generate new destination
      if (gameMode == GAME_MODE.ROAM || gameMode == GAME_MODE.NONE) {
        if (wisp.waypoint.distToTargetSqrd < 5 && wisp.state == STATE_NONE) { // if arrived
          wisp.waypoint.x = view.x + Math.floor(Math.random() * view.width)
          wisp.waypoint.y = view.y + Math.floor(Math.random() * view.height)
        }
      } else
      if (gameMode == GAME_MODE.CHASE) {
        if (!gameIsOver) {
          wisp.waypoint.x = player.wisp.position.x
          wisp.waypoint.y = player.wisp.position.y
        }
      }

      // Color based on size
      if (upgrades.vision && gameMode != GAME_MODE.NONE && !gameIsOver && wisp.state != STATE_RAGE) {
        if (wisp.size < player.wisp.size) {
          wisp.color = "rgba(50, 170, 100, 0.2)"
        } else
        if (wisp.size == player.wisp.size) {
          wisp.color = "rgba(50, 170, 100, 0.5)"
        } else {
          wisp.color = "rgba(50, 170, 100, 1)"
        }
      }
    }

    wisp.update()
    wisp.render()
  }

  // Wisp collision detection
  if (player.wisp.state == STATE_NONE) {
    for (let w = 0; w < wisps.length; w++) {
      let wisp = wisps[w]
      if (wisp == player.wisp || !movementStates.includes(wisp.state)) {
        continue;
      }

      // Eat Goops
      let xDist = Math.pow(wisp.position.x - player.wisp.position.x, 2)
      let yDist = Math.pow(wisp.position.y - player.wisp.position.y, 2)
      if (xDist + yDist < Math.pow(wisp.size + player.wisp.size, 2)) {
        if (player.wisp.size >= wisp.size && wisp.state != STATE_RAGE) {
          if (player.wisp.size == wisp.size) {
            player.wisp.size += 1;
          }
          wisp.explode(player.wisp.velocity.direction, player.wisp.velocity.magnitude)
        } else {
          gameOver();
        }
      }
    }
  }

  // reset game
  if (gameMode != GAME_MODE.NONE && gameIsOver && wisps.length == 1) {
    player.wisp.size = gameMode.settings.startSize
    player.wisp.position.x = view.x + view.width/2
    player.wisp.position.y = view.y + view.height/2
    player.wisp.waypoint.x = player.wisp.position.x - 100
    player.wisp.waypoint.y = player.wisp.position.y
    player.wisp.velocity.direction = Math.PI
    console.log('reset')
    if (gameMode != GAME_MODE.RUN) player.wisp.reform()
    else player.wisp.state = STATE_NONE
    startSpawner()
    gameIsOver = false

    if (gameMode == GAME_MODE.RUN) {
      let size = 20
      for (let i = 0; i < Math.floor(view.height/size); i++) {
        let wSize = size / 2 - 2 + Math.floor((Math.random() * 4 - 2))
        let newWisp = new Wisp(
          view.x + view.width - wSize * 2 + Math.random() * 6,
          view.y + i * (size + 1) + Math.floor(Math.random() * 4 - 2),
          wSize,
          "red",
          bgContext
        );
        let terminalSpeed = newWisp.velocity.TERMINAL * 1.5
        newWisp.waypoint.x = newWisp.position.x - 99999
        newWisp.waypoint.y = newWisp.position.y
        newWisp.velocity.TERMINAL = terminalSpeed
        newWisp.velocity.magnitude = terminalSpeed
        newWisp.velocity.direction = Math.PI
        newWisp.velocity.ACCELERATION = 10
        newWisp.state = STATE_RAGE
        insertSortedWisp(newWisp)
      }
    }
  }

  if (canvasRunning) {
    window.requestAnimFrame(update);
  }
}

// ======================================================================================================================= World ======

function renderBounds() {
  // white outer bounds
  fgContext.fillStyle = "rgb(234, 236, 238)"
  fgContext.fillRect(0, 0, canvas_fg.width, canvas_fg.height)

  // // clip outside bounds (ineffecient)
  // fgContext.beginPath()
  // fgContext.rect(0, 0, 100, 100)
  // fgContext.clip()

  // Erase pixels for viewport
  fgContext.clearRect(0, 0, view.width, view.height)

  // border lines
  fgContext.strokeStyle = "black"
  fgContext.lineWidth = 1
  fgContext.strokeRect(0, 0, view.width, view.height)
}

// ======================================================================================================================= Launch =====

function gameOver() {
  gameIsOver = true
  if (player.wisp.state == STATE_NONE) {
    player.wisp.explode()
  }
  stopSpawner()

  // Reset player speeds
  player.wisp.velocity.TURN_RATE = 12 * Math.PI / 180
  player.wisp.velocity.TERMINAL = 3

  // All goops flee to closest side of view
  if (gameMode == GAME_MODE.ROAM) {
    for (let w = 0; w < wisps.length; w++) {
      let wisp = wisps[w]
      if (wisp == player.wisp) continue;

      // just accept it \/
      let closest = {destination: {x: 0, y: 0}, dist: 9999}
      for (let s = 0; s < 4; s++) {
        let dist = Math.abs((wisp.position.x - view.x) * ((s+1)%2) - view.width * (s==2)) + Math.abs((wisp.position.y - view.y) * (s%2) - (view.height) * (s==3))
        if (dist < closest.dist) {
          closest = {destination: {
            x: wisp.position.x - ((s==0) * 9999) + ((s==2) * 9999),
            y: wisp.position.y - ((s==1) * 9999) + ((s==3) * 9999)
          }, dist: dist}
        }
      }

      wisp.waypoint.x = closest.destination.x
      wisp.waypoint.y = closest.destination.y
      wisp.state = STATE_FLEE
    }
  } else
  if (gameMode == GAME_MODE.NONE) {
    for (let w = 0; w < wisps.length; w++) {
      let wisp = wisps[w]
      if (wisp == player.wisp) continue;
      wisp.waypoint.x = wisp.position.x + 9999
      wisp.waypoint.y = wisp.position.y
      wisp.state = STATE_FLEE
    }
  } else
  if (gameMode == GAME_MODE.CHASE) {
    let dir = player.wisp.velocity.direction
    let locPoint = undefined
    let ray = new Segment(new Point(view.width/2, view.height/2), new Point(999 * Math.cos(dir), 999 * Math.sin(dir)))
    let sides = [
      new Segment(new Point(0, 0), new Point(view.width, 0)),
      new Segment(new Point(view.width, 0), new Point(view.width, view.height)),
      new Segment(new Point(view.width, view.height), new Point(0, view.height)),
      new Segment(new Point(0, view.height), new Point(0, 0))
    ]
    while(sides.length != 0 && locPoint === undefined) {
      locPoint = ray.intersectionPoint(sides.pop())
    }
    if (locPoint === undefined) { return }
    let x = locPoint.x - view.width/2
    let y = locPoint.y - view.height/2
    for (let w = 0; w < wisps.length; w++) {
      let wisp = wisps[w]
      if (wisp == player.wisp) continue;
      wisp.waypoint.x = 5 * x + view.x + view.width/2
      wisp.waypoint.y = 5 * y + view.y + view.height/2
      wisp.state = STATE_FLEE
    }
  } else
  if (gameMode == GAME_MODE.RUN) {
    player.wisp.waypoint.set(-999999, player.wisp.position.y);
    player.wisp.velocity.TERMINAL = 6.5
    player.wisp.velocity.magnitude = 6.5
    player.wisp.velocity.direction = -Math.PI
    for (let w = 0; w < wisps.length; w++) {
      let wisp = wisps[w]
      if (wisp == player.wisp) continue;
    }
  }
}

/**
 * Stop the spawn timer and record remaining seconds for a resumeSpawner call
 */
function pauseSpawner() {
  if (spawnTimer != null) {
    spawnTimerRemaining -= Date.now() - spawnTimerStart
    clearTimeout(spawnTimer)
  }
}
/**
 * If the spawn timer is paused, resume it.
 */
function resumeSpawner() {
  if (spawnTimer != null) {
    startSpawner()
  }
}
/**
 *
 */
function startSpawner() {
  if (!canvasRunning || spawnTimer != null) { return }
  spawn()
}
function spawn() {
  spawnTimer = setTimeout(() => {
    if (spawnTimer == null) return
    spawnTimerRemaining = gameMode.settings.spawnRate
    spawnTimerStart = Date.now()
    spawn()

    switch(gameMode) {
      case GAME_MODE.NONE:
        let wisp = spawnRoamer()
        if (wisp == undefined) break
        let alpha = (wisp.size - gameMode.settings.startSize) / gameMode.settings.sizeVariance
        wisp.color = `rgba(50, 170, 100, ${alpha/3})`
        break
      case GAME_MODE.ROAM:
        spawnRoamer()
        break
      case GAME_MODE.RUN:
        spawnRunner()
        break
      case GAME_MODE.CHASE:
        spawnChaser()
        break
    }

  }, spawnTimerRemaining);
}
/**
 * Halts execution of the spawn timer. The spawn timer cannot be resumed and must be
 * started with startSpawner after this call.
 */
function stopSpawner() {
  clearTimeout(spawnTimer)
  spawnTimer = null
}

/**
 * Spawns a goop outside of a random border of the viewport and gives it a
 * random destination in the viewport.
 */
function spawnRoamer() {
  if (wisps.length >= gameMode.settings.maxGoops + 1 * (player.wisp != null)) {return}
  let side = Math.floor(Math.random() * 4);
  let x = Math.floor(Math.random() * view.width) + view.x
  let y = Math.floor(Math.random() * view.height) + view.y
  let size = player.wisp.size + Math.floor(Math.random() * gameMode.settings.sizeVariance)
  if (side == 0) {
    y = view.y - size
  } else if (side == 1) {
    x = view.x + view.width + size
  } else if (side == 2) {
    y = view.y + view.height + size
  } else if (side == 3) {
    x = view.x - size
  }
  let newWisp = new Wisp(x, y, size, "rgb(50, 200, 100)", bgContext);
  newWisp.waypoint.x = Math.floor(Math.random() * view.width) + view.x
  newWisp.waypoint.y = Math.floor(Math.random() * view.height) + view.y
  insertSortedWisp(newWisp)
  return newWisp
}

/**
 * Spawns a goop significantly outside the left viewport border and gives it a
 * random destination far to the left. But moves much slower than the rage wisps.
 */
function spawnRunner() {
  // 30 is number of rage wisps
  if (wisps.length >= gameMode.settings.maxGoops + 30 + 1 * (player.wisp != null)) {return}
  let y = Math.floor(Math.random() * view.height) + view.y
  let size = player.wisp.size + Math.floor(Math.random() * gameMode.settings.sizeVariance)
  let newWisp = new Wisp(view.x - 10 * size, y, size, "rgb(50, 200, 100)", bgContext);
  let terminalSpeed = newWisp.velocity.TERMINAL + Math.random()
  newWisp.waypoint.x = newWisp.position.x - 99999
  newWisp.waypoint.y = y
  newWisp.velocity.magnitude = terminalSpeed
  newWisp.velocity.TERMINAL = terminalSpeed
  newWisp.state = STATE_FLEE
  newWisp.velocity.direction = -Math.PI
  insertSortedWisp(newWisp)
  return newWisp
}

/**
 * Spawns a goop behind the player outside of bounds, increases its speed, reduces
 * turn rate, sets state to rage, and gives the destination as the player's location.
 */
function spawnChaser() {
  if (wisps.length >= gameMode.settings.maxGoops + 1 * (player.wisp != null)) {return}
  let dir = (player.wisp.velocity.direction + Math.PI) % (2 * Math.PI)
  let locPoint = undefined
  let ray = new Segment(new Point(view.width/2, view.height/2), new Point(999 * Math.cos(dir), 999 * Math.sin(dir)))
  let sides = [
    new Segment(new Point(0, 0), new Point(view.width, 0)),
    new Segment(new Point(view.width, 0), new Point(view.width, view.height)),
    new Segment(new Point(view.width, view.height), new Point(0, view.height)),
    new Segment(new Point(0, view.height), new Point(0, 0))
  ]
  while(sides.length != 0 && locPoint === undefined) {
    locPoint = ray.intersectionPoint(sides.pop())
  }
  if (locPoint === undefined) { return }
  let x = view.x + locPoint.x
  let y = view.y + locPoint.y
  let size = Math.max(player.wisp.size - 1 - Math.floor(Math.random() * 3), 1)
  let newWisp = new Wisp(x, y, size, "rgb(50, 200, 100)", bgContext);
  newWisp.waypoint.x = player.wisp.position.x
  newWisp.waypoint.y = player.wisp.position.y
  newWisp.state = STATE_RAGE
  newWisp.velocity.ACCELERATION *= 4
  newWisp.velocity.TURN_RATE = 1.17 * Math.PI / 180
  newWisp.velocity.TERMINAL *= 1.2
  player.wisp.velocity.ACCELERATION = 0.04
  insertSortedWisp(newWisp)
  return newWisp
}

function insertSortedWisp(newWisp) {
  let insertedWisp = false
  for (let w = 0; w < wisps.length; w++) {
    if (newWisp.size < wisps[w].size) {
      wisps.splice(w, 0, newWisp) // keep wisps sorted by size
      insertedWisp = true
      break;
    }
  }
  if (!insertedWisp) {
    wisps.push(newWisp)
  }
}

(function start() {
  bgContext = canvas_bg.getContext('2d')
  fgContext = canvas_fg.getContext('2d')
  canvas_bg.width = canvas_bg.offsetWidth
  canvas_bg.height = canvas_bg.offsetHeight
  canvas_fg.width = canvas_fg.offsetWidth
  canvas_fg.height = canvas_fg.offsetHeight

  let playerWisp = new Wisp(view.x + view.width/2, view.y + view.height/2, gameMode.settings.startSize, __color_dominant, bgContext);
  playerWisp.destination = playerWisp.position
  playerWisp.state = STATE_NONE
  playerWisp.velocity.TURN_RATE = 12 * Math.PI / 180
  playerWisp.velocity.TERMINAL = 3
  player.wisp = playerWisp

  player.wisp.waypoint.set(-999999, player.wisp.position.y);
  player.wisp.velocity.TERMINAL = 6.5
  player.wisp.velocity.magnitude = 6.5
  player.wisp.velocity.direction = -Math.PI

  wisps.push(playerWisp)

  startSpawner()
  update()
  renderBounds()

  if (gameMode != GAME_MODE.NONE) return

  // Menu Segues
  let titleElement = document.getElementById("menu-logo")
  let menuItems = document.getElementById('menu-items')
  TweenLite.to(titleElement, 1, {
    delay: 1,
    alpha: 1
  })
  TweenLite.to(titleElement, 1, {
    delay: 3,
    alpha: 0
  })
  TweenLite.set(titleElement, {
    delay: 4,
    display: "none"
  })
  TweenLite.to(menuItems, 1, {
    delay: 4,
    display: "inline-block",
    alpha: 1
  });
})();
