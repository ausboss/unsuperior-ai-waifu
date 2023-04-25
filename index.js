const { app, BrowserWindow } = require('electron')


function createWindow() {
  const win = new BrowserWindow({
    frame: false,
    fullscreen: false,
    transparent: true,
    width: 1500,
    height: 1500,
    movable: true, // enable moving the window
    resizable: false, // disable resizing the window
    webPreferences: {
      nodeIntegration: true
    }
  })

  // Load the Live2D character on the window
  win.loadURL(`file://${__dirname}/index.html`)
  win.setIgnoreMouseEvents(false)

  // Open DevTools - remove this for production
  win.webContents.openDevTools()

  // Make the window draggable
  let isDragging = false
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
