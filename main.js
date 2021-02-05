const { app, session, BrowserWindow } = require('electron')
if (require('electron-squirrel-startup')) return app.quit();
const xf = require("xfetch-js")

var url;

function createWindow() {
    const win = new BrowserWindow({
        width: 1600,
        height: 1000,
        icon: __dirname + "site/images/icon.ico",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })
    win.loadFile('site/index.html')
    session.defaultSession.webRequest.onBeforeRequest({ urls: ["http://localhost/oauth/redirect*"] }, function (details, callback) {
        url = details.url;
        callback({
            cancel: false
        });
        win.loadFile("site/streamer/index.html").then(() => { setTimeout(() => { win.webContents.send('oAuth', url); }, 500) })
    });
    win.removeMenu()
}

app.whenReady().then(createWindow)

async function sendData(formdata) {
    return xf.post("https://fauxdev.com:5050/dmca/", {
        json: formdata
    }).text()
}

app.on('window-all-closed', () => {
    twitchKey = url.split("access_token=")[1].split("&")[0]
    xf.get("https://api.twitch.tv/helix/users", {
        headers: {
            'Authorization': 'Bearer ' + twitchKey,
            'Client-Id': 'mrmpcp0zi27sq0adhv1tdzudif5xlq',
            'X-Requested-With': 'XMLHttpRequest'
        }
    }).text().then((data) => {
        sendData({
            "req_type": "handshake",
            "display_name": JSON.parse(data).data[0].display_name,
            "key": twitchKey
        })
            .then((uuid) => {
                sendData({
                    "req_type": "statechange",
                    "uuid": uuid,
                    "playing": false
                }).then(() => {
                    sendData({
                        "req_type": "videoupdate",
                        "uuid": uuid,
                        "url": "yKEeKrvLMuk"
                    }).then(() => {
                        sendData({
                            "req_type": "timeupdate",
                            "uuid": uuid,
                            "timestamp": 0
                        }).then(()=> {
                            if (process.platform !== 'darwin') {
                                app.quit()
                            }
                        })
                    })
                })
            })
    })

})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})