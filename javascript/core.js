import * as Ui from './ui.js'
import * as World from './world.js'
import * as Engine from './engine.js'
import InputReader, { InputInitializer } from './input.js'

let contentContext = Ui.canvasBg().getContext('2d') // World entities
let clippingContext = Ui.canvasFg().getContext('2d') // Viewport clipping
let canvasFlush = true
let view = {
  width: 800,
  height: 600,
  x: 0,
  y: 0
}
export function viewX() {
  return view.x
}
export function viewY() {
  return view.y
}
export function viewWidth() {
  return view.width
}
export function viewHeight() {
  return view.height
}

// Color palette
let documentStyle = getComputedStyle(document.documentElement)
export const COLOR = {
  BACKGROUND: documentStyle.getPropertyValue('--color-background'),
  FOREGROUND: documentStyle.getPropertyValue('--color-foreground'),
  TEXT: documentStyle.getPropertyValue('--color-text'),
  TONIC: documentStyle.getPropertyValue('--color-tonic'),
  MEDIANT: documentStyle.getPropertyValue('--color-mediant'),
  DOMINANT: documentStyle.getPropertyValue('--color-dominant'),
  ACCENT: documentStyle.getPropertyValue('--color-accent'),
  ACCENT_BACKUP: documentStyle.getPropertyValue('--color-accent-backup'),
  BLACK: 'rgb(0, 0, 0)',
  GREEN: 'rgb(0, 128, 0)',
  setRgbaAlpha: (rgba, alpha) => {
    if (rgba.lastIndexOf(',') == -1) return rgba
    alpha = (alpha == NaN) ? 1 : alpha || 1
    if ((rgba.match(/,/g) || []).length == 2) {
      return rgba.substring(0, rgba.lastIndexOf(')')) + `,${alpha})`
    }
    return rgba.substring(0, rgba.lastIndexOf(',')) + `,${alpha})`
  }
  
}

function handleRender() {
  if (canvasFlush) contentContext.clearRect(view.x, view.y, view.width, view.height)

  World.render(contentContext)
}

function handleTick(delta) {
  World.updateTick(delta)
}

// let cameraFollowPrev = {x: 0, y: 0}
export const CAMERA_STYLE = {
  STATIC: () => {},
  FOLLOW: () => {
    let xTarget = World.player.position.x - view.width / 2
    let yTarget = World.player.position.y - view.height / 2
    let xMod = xTarget - view.x
    let yMod = yTarget - view.y
    // cameraFollowPrev = {x: World.player.position.x, y: World.player.position.y}
    contentContext.translate(-xMod, -yMod)
    view.x = xTarget
    view.y = yTarget
    // TODO - accel
  },
  PAN: (xMod, yMod) => {
    contentContext.translate(xMod, yMod)
    view.x -= xMod
    view.y -= yMod
  }
}

function initInputs() {
  InputInitializer.initMouseListener(Ui.canvasFg())

  InputInitializer.setKeyAction(InputReader.KEYCODE.P, () => {
    if ([GAME_MODE.ROAM, GAME_MODE.DEV].includes(World.getGameMode())) {
      if (player.state == Entity.STATE.PHASED) {
        player.phaseIn()
      } else if (player.state == Entity.STATE.NONE) {
        player.phaseOut()
      }
    }
  })

  InputInitializer.setKeyAction(InputReader.KEYCODE.ESC, () => {
    if (Engine.updating()) {
      Engine.stop()
    } else {
      Engine.start()
    }
    if (World.getGameMode() != World.GAME_MODE.NONE) {
      Ui.pauseVisible(!Engine.updating())
    }
  })

  InputInitializer.setKeyAction(InputReader.KEYCODE.I, () => {
    canvasFlush = !canvasFlush
  })

  InputInitializer.setKeyAction(InputReader.KEYCODE.R, () => {
    World.gameOver()
  })

}

function initUi() {
  Ui.setRestartAction(() => {
    World.gameOver()
    Engine.start()
    Ui.pauseVisible(false)
  })
  Ui.setMenuAction(() => {
    World.gameOver()
    Engine.start()
    World.setGameMode(World.GAME_MODE.NONE)
    Ui.pauseVisible(false)
    Ui.menuVisible(true)
  })
  Ui.setGameModeButtons(World.GAME_MODE, (mode) => {
    let menuItems = document.getElementById('menu-items')
    TweenLite.to(menuItems, 1, { alpha: 0 })
    TweenLite.set(menuItems, { delay: 1, display: 'none' })
    World.player.position.x = view.x + view.width / 2
    World.player.position.y = view.y + view.height / 2
    World.setGameMode(mode)
  })
}

function renderBounds() {
  // gray outer bounds
  clippingContext.fillStyle = "rgb(234, 236, 238)"
  clippingContext.fillRect(0, 0, Ui.canvasFg().width, Ui.canvasFg().height)
  // Erase pixels for viewport
  clippingContext.clearRect(0, 0, view.width, view.height)
  // border lines
  // clippingContext.strokeStyle = "black"
  // clippingContext.lineWidth = 1
  // clippingContext.strokeRect(0, 0, view.width, view.height)
}

function syncCanvasSize() {
  // Each time the height or width of a canvas is set, 
  // the canvas transforms will be cleared.
  let transform = contentContext.getTransform()

  // Keep canvas render size matching style size
  Ui.syncCanvasSize()

  // Apply preserved context transformations
  contentContext.setTransform(transform)

  // World viewport is kept at same size as canvas
  view.width = Ui.canvasBg().offsetWidth
  view.height = Ui.canvasBg().offsetHeight

  renderBounds()
}
window.addEventListener('resize', syncCanvasSize);

(function init() {
  initUi()
  syncCanvasSize()
  initInputs()

  World.init()

  Engine.addTickEvent(handleTick)
  Engine.addRenderEvent(handleRender)
  Engine.start()

  if (World.getGameMode() === World.GAME_MODE.NONE) {
    Ui.playLogoSequence()
  }
})()
