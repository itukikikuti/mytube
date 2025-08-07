import path from "path"
import { app, BrowserWindow } from "electron"

function createWindow() {
    const mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(__dirname, "preload.js"),
        }
    })

    mainWindow.loadFile(path.join(__dirname, "index.html"))
    mainWindow.maximize()
}

app.whenReady().then(() => {
    createWindow()

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit()
    }
})
