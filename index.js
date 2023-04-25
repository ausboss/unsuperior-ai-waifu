const { app, BrowserWindow } = require('electron')
const electronReload = require('electron-reload');

const pathToApp = __dirname;
electronReload(pathToApp, {
  electron: require(`${pathToApp}/node_modules/electron`)
});

function createWindow() {
  const win = new BrowserWindow({
    frame: false,
    fullscreen: false,
    transparent: true,
    
    width: 700,
    height: 1000,
    movable: true, // enable moving the window
    resizable: true, // disable resizing the window
    hasShadow: false,

    webPreferences: {
      nodeIntegration: true,
      devTools: false
    }
  })

const textbox = new BrowserWindow({
  parent: win,
  frame: false,
  fullscreen: false,
  transparent: true,
  width: 700,
  height: 100,
  movable: true, // enable moving the window})
  resizable: true, // disable resizing the window
  hasShadow: false,
  spellcheck: false,
  webPreferences: {
    nodeIntegration: true,
    devTools: false
  }})

  textbox.loadURL(`file://${__dirname}/textbox.html`)
  textbox.webContents.on('did-finish-load', () => {
    const parentBounds = win.getBounds();
    const childBounds = textbox.getBounds();
    textbox.setBounds({
        x: parentBounds.x + (parentBounds.width - childBounds.width) / 2,
        y: parentBounds.y + parentBounds.height - childBounds.height,
        width: childBounds.width,
        height: childBounds.height
    });
});


  // Load the Live2D character on the window
  win.loadURL(`file://${__dirname}/index.html`)
  win.setIgnoreMouseEvents(false)

  win.setAlwaysOnTop(true, 'screen');
  win.setMinimizable(false)

  // Open DevTools - remove this for production
 // win.webContents.openDevTools()

  // Make the window draggable
  let isDragging = true
  let mouseOffset = [0, 0]


  win.on('mousedown', (e) => {
    isDragging = true
    const currentWindowPosition = win.getPosition()
    mouseOffset = [
      currentWindowPosition[0] - e.screenX,
      currentWindowPosition[1] - e.screenY
    ]
  })

  win.on('mouseup', () => {
    isDragging = false
  })

  win.on('mousemove', (e) => {
    if (isDragging) {
      const newX = e.screenX + mouseOffset[0]
      const newY = e.screenY + mouseOffset[1]
      win.setPosition(newX, newY)
    }
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
