const YoutubeMusicApi = require('youtube-music-api')
var qs = require("qs");
var xf = require("xfetch-js")

var api = new YoutubeMusicApi()
var uuid = null
api.initalize()

var ipcRenderer = require('electron').ipcRenderer;
ipcRenderer.on('oAuth', function (event, url) {
    twitchKey = url.split("access_token=")[1].split("&")[0]
    sessionStorage.setItem("key",twitchKey)
    getAjax("https://api.twitch.tv/helix/users",(data)=>{
        sessionStorage.setItem("name", JSON.parse(data).data[0].display_name)
        document.getElementById("display-name").innerText = JSON.parse(data).data[0].display_name
        sendData({
            "req_type": "handshake",
            "display_name": JSON.parse(data).data[0].display_name,
            "key": twitchKey
        })
        .then((uu) => {
            uuid = uu
        })
    })
});

async function sendData(formdata) {
    return xf.post("https://fauxdev.com:5050/dmca/", {
        json: formdata
    }).text()
}

var queue = {
    "currentQueue": [],
    "playing":{}
}

var volume = Number(localStorage.getItem("volume"))
if(!volume || isNaN(volume)) volume = 1
var player = 0
var playerSrc = 0
var decsig = 0

var qcont = document.createElement("div")
qcont.id = "queueControl"
boq = document.createElement("img")
boq.src = "../images/addToQueue.png"
boq.id = "addToQueue"
boq.title = "Add to queue"
boq.addEventListener("click", evt => {
    if (evt.target.id == "addToQueue") {
        addToQueue(document.getElementById("queueControl").parentElement)
        document.getElementById("search-res").style.display = "none"
    }
})
qcont.appendChild(boq)

var remq = document.createElement("div")
remq.id = "remCue"
rimg = document.createElement("img")
rimg.src = "../images/remove.png"
rimg.title = "Remove from queue"
rimg.addEventListener("click",(e) => {
    for (i = 0; i < e.path.length; i++) {
        if (e.path[i].className == "result") {
            x = e.path[i]
            x.removeEventListener("click",playSong)
            met = JSON.parse(x.childNodes[1].role)
            for(z=0;z<queue.currentQueue.length;z++) {
                if(queue.currentQueue[z].id == met.id) {
                    queue.currentQueue.splice(z,1)
                    break
                }
            }
            if(queue.playing.id == met.id) {
                playNext(false)
            }
            x.remove()
            break
        }
    }
})
remq.appendChild(rimg)

window.onload = () => {
    if(sessionStorage.getItem("name")) {
        document.getElementById("display-name").innerText = sessionStorage.getItem("name")
    }
    player = document.getElementById("audio")
    playerSrc = document.getElementById("audioIn")
    
    document.getElementsByTagName("body")[0].addEventListener("click",(e)=> {
        if(!e.path.includes(document.getElementById("search-res"))) {
            document.getElementById("search-res").style.display = "none"
        }
    })

    document.getElementById("play").addEventListener("click",(e)=>{
        if(playerSrc.src == "") {
            playNext(false)
            document.getElementById("play").src = "../images/pause.png"
        }
        else if(!player.paused) {
            player.pause()
            document.getElementById("play").src = "../images/play.png"
        }
        else if (player.paused) {
            player.play()
            document.getElementById("play").src = "../images/pause.png"
        }
        else if (player.ended) {
            playNext(true)
            document.getElementById("play").src = "../images/pause.png"
        }
    })

    player.addEventListener("play",(e)=>{
        sendData({
            "req_type":"statechange",
            "uuid":uuid,
            "playing":true
        })
    })

    player.addEventListener("pause", (e) => {
        sendData({
            "req_type": "statechange",
            "uuid": uuid,
            "playing": false
        })
    })

    document.getElementById("skip").addEventListener("click",() => {
        playNext(true)
    })

    document.getElementById("search").addEventListener("keyup",(e)=>{
        if (e.key == "Enter") {
            doSearch(e)
        }
    })

    var c = document.getElementById("duration");
    c.addEventListener('mousedown', function (e) {
        seek(e)
    })
    c.addEventListener('mouseup', function (e) {
        seek(e, true)
    })
    c.addEventListener('mousemove', function (e) {
        if (e.buttons == 1) {
            seek(e)
        }
    })
    var ctx = c.getContext("2d");
    ctx.beginPath()
    ctx.rect(0,0,300,75)
    ctx.fillStyle = "#666"
    ctx.fill()

    var c = document.getElementById("volume");
    c.addEventListener('mousedown', function(e) {
        setVolume(c, e)
    })
    c.addEventListener('mousemove', function(e) {
        if(e.buttons == 1) {
            setVolume(c, e)
        }
    })
    var ctx = c.getContext("2d");
    ctx.beginPath()
    ctx.rect(0,0,300,75)
    ctx.fillStyle = "#666"
    ctx.fill()

    if (volume) {
        setVolume(document.getElementById("volume"), null, volume)
    }

    document.getElementById("audio").addEventListener("loadedmetadata",(e)=>{
        setTime(0,player.duration)
        document.getElementById("player-album").src = `https://i.ytimg.com/vi/`+queue.playing.id+`/hqdefault.jpg`
        document.getElementById("player-title").innerText = queue.playing.title
        document.getElementById("player-artist").innerText = queue.playing.author
        sendData({
            "req_type":"videoupdate",
            "uuid":uuid,
            "url":queue.playing.id
        })
    })

    document.getElementById("audio").addEventListener("timeupdate",(e)=>{
        if(playerSrc.src == "") {
            setTime(0,0)
            document.getElementById("time").innerText = "0:00/0:00"
            return
        }
        player.volume = volume / 100
        sendData({
            "req_type": "videoupdate",
            "uuid": uuid,
            "url": queue.playing.id
        })
        sendData({
            "req_type":"timeupdate",
            "uuid":uuid,
            "timestamp":player.currentTime
        })
        setTime(player.currentTime,player.duration)
        if(player.currentTime == player.duration) {
            playNext(true)
        }
    })

    xf.get(`https://www.youtube.com/embed/yKEeKrvLMuk`)
        .text()
        .then(data => {
            ccc = data.split("s/player/")
            ddd = ccc[1].split("/www-player.css")
            xf.get(`https://www.youtube.com/s/player/${ddd[0]}/player_ias.vflset/en_US/base.js`)
                .text()
                .then(data => {
                    x = /=([a-zA-Z0-9\$]+?)\(decodeURIComponent/.exec(data)
                    dec = x[1]
                    getFunc = new RegExp(
                        dec + '=function\\((.+?)\\){(.+?)}'
                    ).exec(data)
                    func = getFunc[2]
                    argName = getFunc[1]
                    vname = /;(.+?)\..+?\(/.exec(func)[1]
                    funcAssign = new RegExp(
                        'var ' + vname + '={[\\s\\S]+?};'
                    ).exec(data)[0]
                    decsig = new Function([argName], funcAssign + '\n' + func)
                })
        })
}

function playNext(pop) {
    if (queue.currentQueue.length > 0) {
        if(queue.playing && pop) {
            runCue = document.getElementById("queue")
            for(i=0;i<runCue.childNodes.length;i++) {
                if(runCue.childNodes[i].className == "result" && JSON.parse(runCue.childNodes[i].childNodes[1].role).id == queue.playing.id) {
                    runCue.removeChild(runCue.childNodes[i])
                    break
                }
            }
        }
        queue.playing = queue.currentQueue[0]
        queue.currentQueue.splice(0,1)
        document.getElementById("player-album").src = `https://i.ytimg.com/vi/` + queue.playing.id + `/hqdefault.jpg`
        document.getElementById("player-title").innerText = queue.playing.title
        document.getElementById("player-artist").innerText = queue.playing.author
        document.getElementById("time").innerText = "Loading.."
        queue.playing.url.then((e) => {
            document.getElementById("audioIn").src = e
            if (!document.getElementById("audio").paused) {
                document.getElementById("audio").pause()
            }
            document.getElementById("audio").load()
            document.getElementById("audio").play().then(() => {
                document.getElementById("play").src = "../images/pause.png"
            })
        })
    }
    else {
        player.pause()
        playerSrc.src = ""
        player.load()
        document.getElementById("player-album").src = `https://i.ytimg.com/vi/yKEeKrvLMuk/hqdefault.jpg`
        document.getElementById("player-title").innerText = "DMCA"
        document.getElementById("player-artist").innerText = "FauxDev"
        document.getElementById("time").innerText = "0:00/0:00"
        document.getElementById("play").src = "../images/play.png"
    }
}

function cueOver(evt) {
    for (i = 0; i < evt.path.length; i++) {
        if (evt.path[i].className == "result") {
            evt.path[i].appendChild(qcont)
            return
        }
    }
}

function remCueOver(evt) {
    for (i = 0; i < evt.path.length; i++) {
        if (evt.path[i].className == "result") {
            evt.path[i].appendChild(remq)
            remq.style.display = "block";
            return
        }
    }
}

function doSearch(e) {
    document.getElementById("search-res").innerHTML = ""
    if (e.target.value == "" || e.target.value == null) {
        document.getElementById("search-res").style.display = "none"
    }
    else {
        document.getElementById("search-res").style.display = "block"
    }
    api.search(e.target.value, "song").then(res => {
        res = res.content
        for (i = 0; i < res.length; i++) {
            el = document.createElement("div")
            el.className = "result"
            im = document.createElement("img")
            im.id = "album"
            im.src = getThumb(res[i])
            met = document.createElement("div")
            met.id = "meta"
            met.role = JSON.stringify({
                "id": getId(res[i]),
                "title": res[i].name,
                "author": getArtist(res[i]),
                "thumb": getThumb(res[i])
            })
            tit = document.createElement("div")
            tit.id = "title"
            tit.innerText = res[i].name
            art = document.createElement("div")
            art.id = "artist"
            art.innerText = getArtist(res[i])
            met.appendChild(tit)
            met.appendChild(art)
            el.appendChild(im)
            el.appendChild(met)
            el.addEventListener("mouseover", cueOver)
            document.getElementById("search-res").appendChild(el)
        }
        if (document.getElementById("search-res").childNodes.length == 0) {
            if (e.target.value.match("list=([a-zA-Z0-9-]{34})")) {
                api.getPlaylist(e.target.value.match("list=([a-zA-Z0-9-]{34})")[1], 500).then(e => {
                    e.content.forEach(res => {
                        if(res.videoId.length != 0){
                            el = document.createElement("div")
                            el.className = "result"
                            im = document.createElement("img")
                            im.id = "album"
                            im.src = getThumb(res)
                            met = document.createElement("div")
                            met.id = "meta"
                            met.role = JSON.stringify({
                                "id": getId(res),
                                "title": res.name,
                                "author": getArtist(res),
                                "thumb": getThumb(res)
                            })
                            tit = document.createElement("div")
                            tit.id = "title"
                            tit.innerText = res.name
                            art = document.createElement("div")
                            art.id = "artist"
                            art.innerText = getArtist(res)
                            met.appendChild(tit)
                            met.appendChild(art)
                            el.appendChild(im)
                            el.appendChild(met)
                            addToQueue(el)
                        }
                    })
                })
            }
            document.getElementById("search-res").style.display = "none"
        }
    })
}

function getId(res) {
    if(res.videoId != null) {
        return res.videoId
    }
    else {
        st = getThumb(res)
        if (st.match("vi\/(.{11})\/")) {
            id = st.match("vi\/(.{11})\/")[1]
        }
    }
}

function getArtist(res) {
    if(res.artist != null) {
        if(res.artist.length != null) {
            return res.album.name
        }
        else {
            return res.artist.name
        }
    }
    else {
        return res.author.name
    }
}

function getThumb(res) {
    if(res.thumbnails.length != null) {
        return res.thumbnails[res.thumbnails.length - 1].url
    }
    else {
        return res.thumbnails.url
    }
}

function addToQueue(ele) {
    document.getElementById("search").value = ""
    cue = document.getElementById("queue")
    meta = JSON.parse(ele.childNodes[1].role)
    ele.className = "result disabled"
    meta["url"] = getStream(meta.id)
    queue.currentQueue.push(meta)
    if (ele.childNodes.length > 2) {
        ele.removeChild(ele.childNodes[2])
        ele.removeEventListener("mouseover", cueOver)
    }
    ele.addEventListener("mouseover",remCueOver)
    ele.addEventListener("mouseleave", ()=>{
        remq.style.display = "none";
    })
    loadIco = document.createElement("div")
    loadIco.className = "loader"
    ele.appendChild(loadIco)
    cue.appendChild(ele)
    setTimeout(() => {
        ele.addEventListener("click", playSong)
    }, 500)
    setTimeout(() => {
        if(ele.className.indexOf("disabled")!=-1){
            ele.remove()
        }
    }, 30000);
}

function playSong(ele) {
    if(queue.playing.length > 1) {
        runCue = document.getElementById("queue")
        for (i = 0; i < runCue.childNodes.length; i++) {
            if (runCue.childNodes[i].className == "result" && JSON.parse(runCue.childNodes[i].childNodes[1].role).id == queue.playing.id) {
                runCue.removeChild(runCue.childNodes[i])
                break
            }
        }
    }
    for(i=0;i<ele.path.length;i++) {
        if(ele.path[i].className == "result") {
            queue.playing = JSON.parse(ele.path[i].childNodes[1].role)
            for(x=0;x<queue.currentQueue.length;x++) {
                if(queue.currentQueue[x].id == queue.playing.id) {
                    queue.playing = queue.currentQueue[x]
                    queue.currentQueue.splice(x,1)
                    ele.path[i].remove()
                    break
                }
            }
            document.getElementById("player-album").src = `https://i.ytimg.com/vi/` + queue.playing.id + `/hqdefault.jpg`
            document.getElementById("player-title").innerText = queue.playing.title
            document.getElementById("player-artist").innerText = queue.playing.author
            document.getElementById("time").innerText = "Loading.."
            queue.playing.url.then((e) => {
                document.getElementById("audioIn").src = e
                if (!document.getElementById("audio").paused) {
                    document.getElementById("audio").pause()
                }
                document.getElementById("audio").load()
                document.getElementById("audio").play().then(() => {
                    document.getElementById("play").src = "../images/pause.png"
                })
            })
            break
        }
    }
}

function setVolume(c,e=null,x=null) {
    var ctx = c.getContext("2d");
    var rect = c.getBoundingClientRect()
    if(e) {
        var x = e.clientX - rect.left
    }
    ctx.beginPath()
    ctx.rect(0,0,300,75)
    ctx.fillStyle = "#666"
    ctx.fill()
    ctx.beginPath()
    ctx.rect(0,0,x*3,75)
    ctx.fillStyle = "#633b70"
    ctx.fill()
    x = Math.round(x)
    if(isNaN(x)) {
        x = 0
    }
    volume = Number(x)
    localStorage.setItem("volume",Number(x))
    player.volume = x / 100
}

function seek(e, conf) {
    setTime(null,null,e, conf)
}

function setTime(time,duration,e=null, conf = false) {
    var c = document.getElementById("duration");
    var ctx = c.getContext("2d");
    var rect = c.getBoundingClientRect()
    if(time == null && duration == null && playerSrc.src != "") {
        var seekTime = e.clientX - rect.left
        perc = seekTime/400
        time = perc * player.duration
        duration = player.duration
        if(conf) {
            player.currentTime = time
        }
    }
    else {
        perc = (time / duration)
    }
    ctx.beginPath()
    ctx.rect(0,0,300,75)
    ctx.fillStyle = "#666"
    ctx.fill()
    ctx.beginPath()
    ctx.rect(0,0,300*perc,75)
    ctx.fillStyle = "#633b70"
    ctx.fill()
    document.getElementById("time").innerText = timeString(secTime(time))+"/"+timeString(secTime(duration))
}

function secTime(sec) {
    var d,h,m,s
    s = Math.floor(sec)
    if (s >= 60) {
        m = Math.floor(s / 60)
        s = s % 60
    }
    if (m >= 60) {
        h = Math.floor(m / 60)
        m = m % 60
    }
    if (h >= 24) {
        d = Math.floor(h / 24)
        h = h % 24
    }
    return [d,h,m,s]
}

function timeString(arr) {
    var outStr = ""
    if (arr[0] != null) {
        outStr += arr[0] + ":"
    }
    if (arr[1] != null) {
        if (arr[1].toString().length == 1 && outStr.length > 0) {
            outStr += "0"
        }
        outStr += arr[1] + ":"
    }
    if (arr[2] != null) {
        if (arr[2].toString().length == 1 && outStr.length > 0) {
            outStr += "0"
        }
        outStr += arr[2] + ":"
    }
    if (arr[3] != null) {
        if (outStr.length == 0) {
            outStr += "0:"
        }
        if (arr[3].toString().length == 1) {
            outStr += "0"
        }
        outStr += arr[3]
    }
    return outStr
}

function getAjax(url, success) {
    var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP');
    xhr.open('GET', url);
    xhr.onreadystatechange = function () {
        if (xhr.readyState > 3 && xhr.status == 200) success(xhr.responseText);
    };
    xhr.setRequestHeader('Authorization', 'Bearer '+sessionStorage.getItem("key"))
    xhr.setRequestHeader('Client-Id', 'mrmpcp0zi27sq0adhv1tdzudif5xlq')
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.send();
    return xhr;
}

async function getStream(id) {
    data = await xf.get(`https://www.youtube.com/get_video_info?video_id=${id}&el=detailpage`)
        .text()
        .catch(err => null)
    obj = qs.parse(data)
    const playerResponse = JSON.parse(obj.player_response)
    if (obj.status === 'fail') {
        throw obj
    }
    
    let adaptive = []
    if (playerResponse.streamingData.adaptiveFormats) {
        adaptive = playerResponse.streamingData.adaptiveFormats.map(x =>
            Object.assign({}, x, qs.parse(x.cipher || x.signatureCipher))
        )
        if (adaptive[0].sp && adaptive[0].sp.includes('sig')) {
            for (const obj of adaptive) {
                obj.s = decsig(obj.s)
                obj.url += `&sig=${obj.s}`
            }
        }
    }
    best = 0
    auds = {}
    for (stream of adaptive) {
        switch (stream.itag) {
            case 139:
                auds[1] = stream.url
                break;
            case 249:
                auds[2] = stream.url
                break;
            case 250:
                auds[3] = stream.url
                break;
            case 140:
                auds[4] = stream.url
                break;
            case 171:
                auds[5] = stream.url
                break;
            case 251:
                auds[6] = stream.url
                break;
            case 141:
                auds[7] = stream.url
                break;
        }
    }
    q = document.getElementById("queue").childNodes
    for (x of q) {
        if (x.childNodes[1].role.indexOf(id) != -1) {
            x.childNodes[2].remove()
            x.className = "result"
        }
    }
    return auds[Object.keys(auds)[Object.keys(auds).length - 1]]
}