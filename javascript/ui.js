
let _canvasBg = document.getElementById('bgCanvas')
export function canvasBg() {
  return _canvasBg
}
let _canvasFg = document.getElementById('fgCanvas')
export function canvasFg() {
  return _canvasFg
}

export function setRestartAction(action) {
  document.getElementById('menu-pause-restart').onclick = action 
}
export function setMenuAction(action) {
  document.getElementById('menu-pause-menu').onclick = action
}
export function setGameModeButtons(gameModes, action) {
  document.getElementById('menu-item-play-roam').onclick = () => action(gameModes.ROAM)
  document.getElementById('menu-item-play-run').onclick = () => action(gameModes.RUN)
  document.getElementById('menu-item-play-chase').onclick = () => action(gameModes.CHASE)
  document.getElementById('menu-item-play-horde').onclick = () => action(gameModes.HORDE)
}

// HTML element referencess
let menuPause = document.getElementById('menu-pause')

export function syncCanvasSize() {
  _canvasBg.width = _canvasBg.offsetWidth
  _canvasBg.height = _canvasBg.offsetHeight
  _canvasFg.width = _canvasFg.offsetWidth
  _canvasFg.height = _canvasFg.offsetHeight
}

export function pauseVisible(visible) {
  menuPause.style.display = visible ? 'inline-block' : 'none'
}

export function menuVisible(visible) {
  let menuItems = document.getElementById('menu-items')
  TweenLite.to(menuItems, 1, {
    delay: 4,
    display: "inline-block",
    alpha: 1
  })
}

export function playLogoSequence() {
  let titleElement = document.getElementById("menu-logo")
  TweenLite.set(titleElement, { display: "inline-block" })
  TweenLite.to(titleElement, 1, { delay: 1, alpha: 1 })
  TweenLite.to(titleElement, 1, { delay: 3, alpha: 0 })
  TweenLite.set(titleElement, { delay: 4, display: "none" })
  menuVisible(true)
}
