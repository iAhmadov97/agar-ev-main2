export const MainOut = function (wHandle, wjQuery, loaded) {
  wHandle.onunload = wHandle.onbeforeunload = () => {
    wHandle.account && wHandle.sendCloseClient();
    return "You really wanna leave the game?";
  }

  if (navigator.appVersion.indexOf("MSIE") != -1) {
    alert("You're using a pretty old browser, some parts of the website might not work properly.");
  }

  try {
    var playerStorage = localStorage.playerDetails;
    if (playerStorage) {
      playerStorage = JSON.parse(playerStorage);
      if (playerStorage && "skinCode" in playerStorage) {
        // double check
        window.globalPreference.defaultSkin = playerStorage.skinCode;
      }
    }
  } catch (e) {}

  if (window.globalPreference.defaultSkin) {
    pushIntoSkinsLoaded(window.globalPreference.defaultSkin, true);
  }

  Date.now ||
    (Date.now = function () {
      return (+new Date()).getTime();
    });
  var LOAD_START = Date.now();
  Array.prototype.peek = function () {
    return this[this.length - 1];
  };
  Array.prototype.remove = function (a) {
    var i = this.indexOf(a);
    if (i !== -1) this.splice(i, 1);
    return i !== -1;
  };

  function bytesToColor(r, g, b) {
    var r1 = ("00" + (~~r).toString(16)).slice(-2);
    var g1 = ("00" + (~~g).toString(16)).slice(-2);
    var b1 = ("00" + (~~b).toString(16)).slice(-2);
    return `#${r1}${g1}${b1}`;
  }

  function colorToBytes(color) {
    if (color.length === 4)
      return {
        r: parseInt(color[1] + color[1], 16),
        g: parseInt(color[2] + color[2], 16),
        b: parseInt(color[3] + color[3], 16),
      };
    else if (color.length === 7)
      return {
        r: parseInt(color[1] + color[2], 16),
        g: parseInt(color[3] + color[4], 16),
        b: parseInt(color[5] + color[6], 16),
      };
    throw new Error(`invalid color ${color}`);
  }

  function darkenColor(color) {
    var a = colorToBytes(color);
    return bytesToColor(a.r * 0.9, a.g * 0.9 , a.b * 0.9);
  }
  
  function cleanupObject(object) {
    for (var i in object) delete object[i];
  }

  var log = {
    verbosity: 4,
    error: function (a) {
      if (log.verbosity <= 0) return;
      console.error(a);
    },
    warn: function (a) {
      if (log.verbosity <= 1) return;
      console.warn(a);
    },
    info: function (a) {
      if (log.verbosity <= 2) return;
      console.info(a);
    },
    debug: function (a) {
      this.info(a);
    },
  };

  var wsUrl = null,
    USE_HTTPS = "https:" == wHandle.location.protocol,
    PI_2 = Math.PI * 2,
    SEND_254 = new Uint8Array([254, 6, 0, 0, 0]),
    SEND_255 = new Uint8Array([255, 1, 0, 0, 0]),
    UINT8_CACHE = {
      1: new Uint8Array([1]),
      17: new Uint8Array([17]),
      21: new Uint8Array([21]),
      18: new Uint8Array([18]),
      19: new Uint8Array([19]),
      22: new Uint8Array([22]),
      23: new Uint8Array([23]),
      24: new Uint8Array([24]),
      254: new Uint8Array([254]),
    };

  let wS2 = {
    wsUrl: null
  };

  function wsCleanup() {
    if (!ws) return;
    log.debug("ws cleanup trigger");
    ws.onopen = null;
    ws.onmessage = null;
    ws.close();
    ws = null;
    ws2 = null;
  }
  function wsInit(url) {
    if (ws) {
      log.debug("ws init on existing conn");
      wsCleanup();
    }
    ws = new WebSocket(`ws${USE_HTTPS ? "s" : ""}://${(wsUrl = url)}`);

    ws.binaryType = "arraybuffer";
    ws.onopen = wsOpen;
    ws.onmessage = wsMessage;
    ws.onerror = wsError;
    ws.onclose = wsClose;

    let connected = null;

    ws2 = new WebSocket(`ws${USE_HTTPS ? "s" : ""}://${(wS2.wsUrl = url)}`);
    ws2.binaryType = "arraybuffer";

    ws2.onopen = () => {
      wsSend(SEND_254, true);
      wsSend(SEND_255, true);
      connected = true;
      sendSystemMessage("Multibox connected");
    };
    ws2.onmessage = (data) => {
      syncUpdStamp = Date.now();
      var reader = new Reader(new DataView(data.data), 0, true);
      var packetId = reader.getUint8();
      switch (packetId) {
        case 0x10: // update nodes
          var killer,
            killed,
            id,
            node,
            x,
            y,
            s,
            flags,
            cell,
            updColor,
            updName,
            updSkin,
            count,
            color,
            name,
            skin,
            m;
      
          // consume records
          count = reader.getUint16();
          for (var i = 0; i < count; i++) {
            killer = reader.getUint32();
            killed = reader.getUint32();
            if (
              !cells2.byId.hasOwnProperty(killer) ||
              !cells2.byId.hasOwnProperty(killed)
            )
              continue;
            cells2.byId[killed].destroy(killer);
          }
      
          // update records
          while (true) {
            id = reader.getUint32();
            if (id === 0) break;
            x = reader.getInt32();
            y = reader.getInt32();
            s = reader.getUint16();
      
            flags = reader.getUint8();
            updColor = !!(flags & 0x02);
            updName = !!(flags & 0x08);
            updSkin = !!(flags & 0x04);
            color = updColor
              ? bytesToColor(reader.getUint8(), reader.getUint8(), reader.getUint8())
              : null;
            skin = updSkin ? reader.getStringUTF8() : null;
            name = updName ? reader.getStringUTF8() : null;
      
            if (cells2.byId.hasOwnProperty(id)) {
              cell = cells2.byId[id];
              cell.update(syncUpdStamp);
              cell.updated = syncUpdStamp;
              cell.ox = cell.x;
              cell.oy = cell.y;
              cell.os = cell.s;
              cell.nx = x;
              cell.ny = y;
              cell.ns = s;
              if (color) cell.setColor(color);
              if (name) cell.setName(name);
              if (skin) cell.setSkin(skin);
            } else {
              cell = new Cell(id, x, y, s, name, color, skin, flags, true);
              cells2.byId[id] = cell;
              cells2.list.push(cell);
            }
          }
          // dissapear records
          count = reader.getUint16();
          for (i = 0; i < count; i++) {
            killed = reader.getUint32();
            if (cells2.byId.hasOwnProperty(killed) && !cells2.byId[killed].destroyed)
              cells2.byId[killed].destroy(null);
          }
          break;
        case 0x11: // update pos
          if (window.globalPreference.TAB_ACTIVE) {
            targetX = reader.getFloat32();
            targetY = reader.getFloat32();
            targetZ = reader.getFloat32();
          }
          break;
        case 0x12: // clear all
          for (var i in cells2.byId) cells2.byId[i].destroy(null);
        case 0x14: // clear my cells2
          cells2.mine = [];
          break;
        case 0x15: // draw line
          log.warn("got packer 0x15 (draw line) which is unsupported");
          break;
        case 0x20: // new cell
          cells2.mine.push(reader.getUint32());
          break;
        case 0x40: // set border
          if (window.globalPreference.TAB_ACTIVE) {
            border.left = reader.getFloat64();
            border.top = reader.getFloat64();
            border.right = reader.getFloat64();
            border.bottom = reader.getFloat64();
            border.width = border.right - border.left;
            border.height = border.bottom - border.top;
            border.centerX = (border.left + border.right) / 2;
            border.centerY = (border.top + border.bottom) / 2;
            if (data.data.byteLength === 33) break;
            if (!mapCenterSet) {
              mapCenterSet = true;
              cameraX = targetX = border.centerX;
              cameraY = targetY = border.centerY;
              cameraZ = targetZ = 1;
            }
          }
          break;
      }
      
    }
    ws2.onclose = ws2.onerror = () => {
      window.globalPreference.TAB_CELL_INGAME = false;
      if (connected === false) return;
      connected = false;
      sendSystemMessage("Multibox diconnected");
    };
  }
  function wsOpen() {
    disconnectDelay = 1000;
    //wjQuery("#connecting").hide();
    wsSend(SEND_254);
    wsSend(SEND_255);
    log.debug(`ws connected, using https: ${USE_HTTPS}`);
  }
  function wsError(error) {
    log.warn(error);
  }
  function wsClose(e) {
    log.debug(`ws disconnected ${e.code} '${e.reason}'`);
    wsCleanup();
    gameReset();
    setTimeout(function () {
      if (ws && ws.readyState === 1) return;
      wsInit(wsUrl);
    }, (disconnectDelay *= 1.5));
  }
  function wsSend(data, isWS2) {
    let wsR = ws;
    if (!wsR) return;
    if ((isWS2 && isWS2 === true) || window.globalPreference.TAB_ACTIVE === true) {
      wsR = ws2;
    }
    if (wsR.readyState !== 1) return;
    if (data.build) wsR.send(data.build());
    else wsR.send(data);
  }
  function wsMessage(data) {
    syncUpdStamp = Date.now();
    var reader = new Reader(new DataView(data.data), 0, true);
    var packetId = reader.getUint8();
    switch (packetId) {
      case 0x10: // update nodes
        var killer, killed, id, node, x, y, s, flags, cell, updColor, updName, updSkin, count, color, name, skin,m;

        // consume records
        count = reader.getUint16();
        for (var i = 0; i < count; i++) {
          killer = reader.getUint32();
          killed = reader.getUint32();
          if (!cells.byId.hasOwnProperty(killer) || !cells.byId.hasOwnProperty(killed)) continue;
          cells.byId[killed].destroy(killer);
        }

        // update records
        while (true) {
          id = reader.getUint32();
          if (id === 0) break;
          x = reader.getInt32();
          y = reader.getInt32();
          s = reader.getUint16();

          flags = reader.getUint8();
          updColor = !!(flags & 0x02);
          updName = !!(flags & 0x08);
          updSkin = !!(flags & 0x04);
          color = updColor ? bytesToColor(reader.getUint8(), reader.getUint8(), reader.getUint8()) : null;
          skin = updSkin ? reader.getStringUTF8() : null;
          name = updName ? reader.getStringUTF8() : null;

          if (cells.byId.hasOwnProperty(id)) {
            cell = cells.byId[id];
            cell.update(syncUpdStamp);
            cell.updated = syncUpdStamp;
            cell.ox = cell.x;
            cell.oy = cell.y;
            cell.os = cell.s;
            cell.nx = x;
            cell.ny = y;
            cell.ns = s;
            if (color) cell.setColor(color);
            if (name) cell.setName(name);
            if (skin) cell.setSkin(skin);
          } else {
            cell = new Cell(id, x, y, s, name, color, skin, flags, false);
            cells.byId[id] = cell;
            cells.list.push(cell);
          }
        }
        // dissapear records
        count = reader.getUint16();
        for (i = 0; i < count; i++) {
          killed = reader.getUint32();
          if (cells.byId.hasOwnProperty(killed) && !cells.byId[killed].destroyed) cells.byId[killed].destroy(null);
        }
        break;
      case 0x11: // update pos
        if (!window.globalPreference.TAB_ACTIVE) {
          targetX = reader.getFloat32();
          targetY = reader.getFloat32();
          targetZ = reader.getFloat32();
        }
        
        break;
      case 0x12: // clear all
        for (var i in cells.byId) cells.byId[i].destroy(null);
      case 0x14: // clear my cells
        cells.mine = [];
        break;
      case 0x15: // draw line
        log.warn("got packer 0x15 (draw line) which is unsupported");
        break;
      case 0x20: // new cell
        cells.mine.push(reader.getUint32());
        break;
      case 0x30: // text list
        leaderboard.items = [];
        leaderboard.type = "text";

        var count = reader.getUint32();
        for (i = 0; i < count; ++i) {
          let f = reader.getStringUTF8();
          leaderboard.items.push(f);
        }
        drawLeaderboard();
        break;
      case 0x31: // ffa list
        leaderboard.items = [];
        leaderboard.type = "ffa";

        var count = reader.getUint32();
        for (i = 0; i < count; ++i) {
          let obj = {
            me: !!reader.getUint32(),
            name: reader.getStringUTF8(),
          };
          obj.name = obj.name.toString().replace(/(\{.*\}|\[.*\]|\%\^)/gi, "");
          leaderboard.items.push(obj);
        }

        drawLeaderboard();
        break;
      case 0x32: // pie chart
        leaderboard.items = [];
        leaderboard.type = "pie";

        var count = reader.getUint32();
        for (i = 0; i < count; ++i) leaderboard.items.push(reader.getFloat32());
        drawLeaderboard();
        break;
      case 0x40: // set border
        if (!window.globalPreference.TAB_ACTIVE) {
          border.left = reader.getFloat64();
          border.top = reader.getFloat64();
          border.right = reader.getFloat64();
          border.bottom = reader.getFloat64();
          border.width = border.right - border.left;
          border.height = border.bottom - border.top;
          border.centerX = (border.left + border.right) / 2;
          border.centerY = (border.top + border.bottom) / 2;
          if (data.data.byteLength === 33) break;
          if (!mapCenterSet) {
            mapCenterSet = true;
            cameraX = targetX = border.centerX;
            cameraY = targetY = border.centerY;
            cameraZ = targetZ = 1;
          }
        }
        
        reader.getUint32(); // game type
        if (!/MultiOgar|OgarII/.test(reader.getStringUTF8()) || stats.pingLoopId) break;
        stats.pingLoopId = setInterval(function () {
          wsSend(UINT8_CACHE[254], false);
          stats.pingLoopStamp = Date.now();
        }, 2000);
        break;
      case 0x63: // chat message
        var flags = reader.getUint8();
        var color = bytesToColor(reader.getUint8(), reader.getUint8(), reader.getUint8());

        var name = reader.getStringUTF8().trim();
        var accountDetails = null;
        var reg = /\{([\w]+)\}/.exec(name);
        if (reg) name = name.replace(reg[0], "").trim();

        try {
          let o = window.parseName(name);

          if (o) {
            if ("name" in o) name = o.name;
            if ("account" in o && typeof o.account === "object") {
              accountDetails = o.account;
            }
          }
        } catch (e) {
          console.log(e);
        }
        if (accountDetails && "pid" in accountDetails) {
          var message = reader.getStringUTF8();

          var server = !!(flags & 0x80),
            admin = !!(flags & 0x40),
            mod = !!(flags & 0x20),
            role = accountDetails && "role" in accountDetails ? accountDetails.role : "";
          /*
                ? "called" in accountDetails.role
                  ? accountDetails.role.called
                  : accountDetails.role.name
                : "",*/
          id = accountDetails && "pid" in accountDetails ? accountDetails.pid : null;

          if (server && name !== "SERVER") role = "server";
          if (admin && role.length === 0) role = "admin";
          if (mod && role.length === 0) role = "moderator";

          var wait = Math.max(3000, 1000 + message.length * 150);
          chat.waitUntil = syncUpdStamp - chat.waitUntil > 1000 ? syncUpdStamp + wait : chat.waitUntil + wait;

          let idElement = Date.now().toString(36);

          chat.messages[idElement] = {
            role: role,
            idElement: idElement,
            id: id,
            verified: accountDetails && "verified" in accountDetails ? accountDetails.verified : false,
            server: server,
            admin: admin,
            mod: mod,
            color: "color" in accountDetails ? accountDetails.color : color,
            name: name,
            message: message,
            time: syncUpdStamp,
          };
          drawChat(true);
        }

        break;
      case 0xfe: // server stat
        stats.info = JSON.parse(reader.getStringUTF8());
        stats.latency = syncUpdStamp - stats.pingLoopStamp;
        drawStats();
        break;
      default:
        // invalid packet
        wsCleanup();
        break;
    }
  }

  function sendMouseMove(x, y, isWS2) {
    var writer = new Writer(true);
    writer.setUint8(0x10);
    writer.setUint32(x);
    writer.setUint32(y);
    writer._b.push(0, 0, 0, 0);
    // wsSend(writer, isWS2 === true ? true : false);
    wsSend(writer);
    wsSend(writer, true);
  }

  function sendPlay(name) {
    log.debug("play trigger");

    if (!name) return alert("لايمكنك اللعب بدون كتابة اسم");
    if (window.globalPreference.TAB_ACTIVE === true) window.globalPreference.TAB_ACTIVE = false;
    var writer = new Writer(true),
      skin = null;

    name = name.replace(/(\{.*\}|\[.*\]|\<.*\>|\%\^+$)/gi, "");

    if (globalPreference.currentSkin) {
      skin = globalPreference.currentSkin;
    }

    localStorage.setItem(
      "playerDetails",
      JSON.stringify({
        name: name,
        skinCode: skin,
      }),
    );

    if (window.account && typeof window.account === "object") {
      if (window.account.pid) window.globalPreference.PID_PLAYER = window.account.pid;
      let jsonEncrypted = null;
      if ("jsonEncrypted" in window.account && window.account.jsonEncrypted) {
        jsonEncrypted = window.account.jsonEncrypted;
      }
      name = `${name}[${jsonEncrypted}]`;
    }

    window.globalPreference = {
      ...window.globalPreference,
      PLAYER_NAME: name,
      PLAYER_INGAME: true,
    };
    writer.setUint8(0x00);
    writer.setStringUTF8(`{${skin}}${name}`);
    wsSend(writer);
  }

  window.pushIntoChatList = (object, draw) => {
    let idElement = Date.now().toString(36);
    let tempObject = {
      idElement: idElement,
      role: "role" in object ? object.role : "",
      id: "id" in object ? object.id : 0,
      verified: "verified" in object ? object.verified : false,
      server: false,
      admin: false,
      mod: false,
      color: "color" in object ? object.color : "#ddd",
      name: "name" in object ? object.name.replace(/\%\^/g, "") : "Bot",
      message: "message" in object ? object.message : null,
      time: "time" in object ? object.time : Date.now(),
    };

    chat.messages[idElement] = tempObject;
    if (draw) drawChat(true);
  };
  window.sendSystemMessage = (message) => {
    window.pushIntoChatList(
      {
        role: "BOT",
        verified: true,
        name: "Lyder Bot",
        message: message,
      },
      true,
    );
  }
  function handleTimeTaken(commandFullLine) {
    let time = null;
    if ("2" in commandFullLine) {
      let timeTaken = commandFullLine[2],
        type = timeTaken.match(/([a-zA-Z]{1})$/g),
        howMuch = timeTaken.replace(/[a-zA-Z]+$/g, "");
      if (type && type[0] && howMuch.match(/^[0-9]+$/) && parseInt(howMuch) > 0) {
        type = type[0];
        if (type === "h" || type === "m" || type === "d") {
          time = timeTaken;
        }
      }
    }
    return time;
  }
  function sendChat(text) {
    var isMuted =
      account &&
      "playerDetails" in account &&
      "muted" in account.playerDetails &&
      "muted" in account.playerDetails.muted &&
      account.playerDetails.muted.muted === true
        ? true
        : false;
    if (!text /*|| isMuted*/) return;
    if (text.charAt(0) === "$" && window.account) {
      let commandFullLine = text.replace(/\$/g, "").trim().split(/\s/g);
      let command = commandFullLine.length > 0 ? commandFullLine[0].toString().toLowerCase() : null;
      if (command && typeof command === "string" && "1" in commandFullLine) {
        let token = localStorage.getItem("token");
        switch (command) {
          case "mute":
          case "unmute":
          case "ban":
          case "unban":
          case "kill":
            if (command === "kill" && !commandFullLine[1]) {
              sendChat("/kill");
              break;
            }
            if ("role" in window.account && window.wsServer) {
              if (!token) {
                window.onbeforeunload = null;
                location.reload();
                return;
              }

              if (
                (("admin" in window.account.role && window.account.role.admin === true) ||
                  ("permission" in window.account.role &&
                  command in window.account.role.permission &&
                    window.account.role.permission[command] === true))
              ) {
                let writer = new Writer(), packetId = command === "mute" ? 0x3 : 0x4;
                if (command.indexOf("ban") !== -1) packetId = command === "ban" ? 0x5 : 0x6;
                  else packetId = command === "kill" ? 0x8 : null;
                if (!packetId) break;
                writer.setUint8(packetId);
                writer.setStringUTF8(token); // TOKEN
                writer.setStringUTF8(commandFullLine[1]); // PID
                if (packetId === 0x3 || packetId === 0x5) {
                  let timeForUnmute = handleTimeTaken(commandFullLine);
                  if (timeForUnmute) writer.setStringUTF8(timeForUnmute); // TIME
                }
                alert(packetId)
                window.wsServer.sendPacket(writer);
              } else {
                window.sendSystemMessage("ليس لديك صلحيه لهذا");
              }
            } else window.sendSystemMessage("You can't do that right now maybe later");
          break;
        }
      } else window.sendSystemMessage("Invalid command pleas check the list help");
    } else {
      if (text.charAt(0) === "/" && text !== "/kill") return;
      var writer = new Writer();
      writer.setUint8(0x63);
      writer.setUint8(0);
      writer.setStringUTF8(text);
      wsSend(writer, false);
    }
  }
  window.ret = sendChat;

  function gameReset() {
    cleanupObject(cells);
    cleanupObject(cells2);
    cleanupObject(border);
    cleanupObject(leaderboard);
    cleanupObject(chat);
    cleanupObject(stats);
    chat.messages = {};
    leaderboard.items = [];
    cells.mine = [];
    cells.byId = {};
    cells.list = [];
    cells2.mine = [];
    cells2.byId = {};
    cells2.list = [];
    cameraX = cameraY = targetX = targetY = 0;
    cameraZ = targetZ = 1;
    mapCenterSet = false;
  }

  var cells = Object.create({
    mine: [],
    byId: {},
    list: [],
  });
  var cells2 = Object.create({
    mine: [],
    byId: {},
    list: [],
  });
  var border = Object.create({
    left: -2000,
    right: 2000,
    top: -2000,
    bottom: 2000,
    width: 4000,
    height: 4000,
    centerX: -1,
    centerY: -1,
  });
  var leaderboard = Object.create({
    type: NaN,
    items: null,
    canvas: document.createElement("canvas"),
    teams: ["#F33", "#3F3", "#33F"],
  });
  var chat = Object.create({
    messages: [],
    waitUntil: 0,
    canvas: document.createElement("canvas"),
    visible: false,
  });
  var stats = Object.create({
    framesPerSecond: 0,
    latency: NaN,
    supports: null,
    info: null,
    pingLoopId: NaN,
    pingLoopStamp: null,
    canvas: document.createElement("canvas"),
    visible: false,
    score: NaN,
    maxScore: 0,
  });

  var ws = null;
  var ws2 = null;
  var wsUrl = null;
  var disconnectDelay = 1000;

  var syncUpdStamp = Date.now();
  var syncAppStamp = Date.now();

  var mainCanvas = null;
  var mainCtx = null;
  var escOverlayShown = false;
  var isTyping = false;
  var chatBox = null;
  var mapCenterSet = false;
  var cameraX = 0;
  var cameraY = 0;
  var cameraZ = 1;
  var cameraZInvd = 1;
  var targetX = 0;
  var targetY = 0;
  // 2 Multibox

  var targetX2 = 0;
  var targetY2 = 0;
  var targetZ2 = 1;

  window.clientX2 = 0;
  window.clientY2 = 0;

  var targetZ = 1;
  var viewMult = 1;
  var mouseX = NaN;
  var mouseY = NaN;
  var mouseZ = 1;

  var settings = {
    mobile: "createTouch" in document,
    showMass: false,
    showNames: true,
    showLeaderboard: true,
    showChat: true,
    showGrid: true,
    showTextOutline: true,
    showColor: true,
    showSkins: true,
    showMinimap: true,
    darkTheme: false,
    allowGETipSet: false,
  };
  var pressed = {
    space: false,
    w: false,
    f: false,
    r: false,
    t: false,
    p: false,
    q: false,
    esc: false,
    tab: false,
    h: false,
    g: false,
    k: false,
    j: false,
  };

  function hideESCOverlay() {
    escOverlayShown = false;
    wjQuery("#overlays").hide();
  }

  window.showESCOverlay = (losed) => {
    if (losed === true) window.globalPreference.PLAYER_INGAME = false;
    escOverlayShown = true;
    wjQuery("#overlays").fadeIn(300);
  }

  function toCamera(ctx) {
    ctx.translate(mainCanvas.width / 2, mainCanvas.height / 2);
    scaleForth(ctx);
    ctx.translate(-cameraX, -cameraY);
  }
  function scaleForth(ctx) {
    ctx.scale(cameraZ, cameraZ);
  }
  function scaleBack(ctx) {
    ctx.scale(cameraZInvd, cameraZInvd);
  }
  function fromCamera(ctx) {
    ctx.translate(cameraX, cameraY);
    scaleBack(ctx);
    ctx.translate(-mainCanvas.width / 2, -mainCanvas.height / 2);
  }

  function drawChat(drawLatestOne) {
    let chatMessages = Object.keys(chat.messages).map((key) => chat.messages[key]);
    if (chatMessages.length === 0 && settings.showChat) return;

    let chatContentElement = wjQuery(".content-messages");

    let getContentDOM = (elemntObject) => {
      return `
        <div class="message" id="${elemntObject.idElement}">
          <div class="id">${elemntObject.server ? 0 : elemntObject.id}</div>
          ${elemntObject.verified ? `<div class="id"><i class="fal fa-badge-check"/></div>` : ""}
          ${
            elemntObject.role.length > 0 || elemntObject.server
              ? `<div class="role" style="color:${elemntObject.color}">${elemntObject.role || "server"}</div>`
              : ""
          }
          ${!elemntObject.server ? `<div class="title">${elemntObject.name}</div>` : ""}
          <p>${elemntObject.message}</p>
        </div>`;
    };

    if (drawLatestOne) {
      let chatMessageObject = chatMessages.slice(-1);
      chatContentElement.append(getContentDOM(chatMessageObject[0]));
    } else {
      let tempMessages = [],
        latest7Messages = chatMessages.slice(-7);
      for (var i = 0; i < latest7Messages.length; i++) {
        let user = latest7Messages[i];
        tempMessages.push(getContentDOM(user));
      }
      chatContentElement.html(tempMessages.join(""));
    }

    var element = document.querySelector(".content-messages");
    element.scrollTop = element.scrollHeight;
  }

  setInterval(() => {
    let chatMessages = Object.keys(chat.messages).map((key) => chat.messages[key]);
    if (chatMessages.length >= 7) {
      let oldMessage = chatMessages[0];
      delete chat.messages[oldMessage.idElement];
      wjQuery(`#${oldMessage.idElement}`).fadeOut(1600, () => wjQuery(this).remove());
    }
  }, 2000);

  function drawStats() {
    if (!stats.info) return (stats.visible = false);
    stats.visible = true;
  }

  function drawLeaderboard() {
    if (leaderboard.type === NaN) return (leaderboard.visible = false);
    if (!settings.showNames || leaderboard.items.length === 0) return (leaderboard.visible = false);
    leaderboard.visible = true;
    let canvas = leaderboard.canvas;
    let ctx = canvas.getContext("2d");
    let len = leaderboard.items.length;
    canvas.width = 210;
    canvas.height = 290;

    var text;
    let isMe = false;
    let cH = 10;
    let latestLen = len % 7 === 0 ? 7 : len % 7;

    for (var i = 0; i < latestLen; i++) {
      if (String(i) in leaderboard.items) {
        if (leaderboard.type === "text") text = leaderboard.items[i];
        else (text = leaderboard.items[i].name), (isMe = leaderboard.items[i].me);

        ctx.fillStyle = "rgba(0,0,0, 0.6)";

        // leader number
        ctx.fillRect(10, cH, 30, 30);
        ctx.fillStyle = "#ddd";
        ctx.font = `Bold 15px 'Open Sans'`;
        ctx.fillText(i + 1, 21, cH + 20);

        // name
        text = (text.length > 12 ? text.slice(0, 12) + ".." : text).toUpperCase();
        ctx.fillStyle = "rgba(0,0,0, 0.6)";

        ctx.fillRect(40 + 5, cH, 153, 30);

        ctx.fillStyle = isMe ? "rgb(41, 119, 221)" : "#ddd";
        ctx.font = `bold 15px 'Open Sans'`;
        ctx.fillText(text, 50 + 2, cH + 20);

        if (i + 1 >= 7) {
          cH = 0;
        } else cH += 35;
      }
    }
  }
  function drawBorders() {
    let grad = mainCtx.createLinearGradient(2046, 45, 45, 45);
    grad.addColorStop(0.0, `#50fda6`);
    grad.addColorStop(0.25, `#55fcfc`);
    grad.addColorStop(0.4, `#ff4ba5`);
    grad.addColorStop(0.5, `#4aa3fc`);
    grad.addColorStop(0.8, `#ff4dff`);
    grad.addColorStop(0.75, `#4242ff`);
    grad.addColorStop(1.0, `#a54dfd`);

    mainCtx.strokeStyle = grad;

    mainCtx.lineWidth = 0x14;
    mainCtx.lineCap = "round";
    mainCtx.lineJoin = "round";
    mainCtx.beginPath();

    mainCtx.moveTo(border.left, border.top);
    mainCtx.lineTo(border.right, border.top);
    mainCtx.lineTo(border.right, border.bottom);

    mainCtx.lineTo(border.left, border.bottom);
    mainCtx.closePath();
    mainCtx.stroke();

    let url = null;
    try {
      url = window.globalPreference.SETTINGS.GENERALE.content.BG_BORDER.url;
    } catch (e) {}

    let bg = new Image();
    bg.src = url || "https://i.pinimg.com/originals/ac/74/99/ac74999a0c3ac959416fff86a02928bf.jpg";
    mainCtx.globalAlpha = 0.3;
    mainCtx.drawImage(bg, border.left, border.top, border.width, border.height);
    mainCtx.globalAlpha = 1;

    var targetSize = border.right - border.left;

    var beginX = border.left;
    var beginY = border.top;

    var sectorCount = 4;
    var sectorNames = ["ABCD", "1234"];
    var sectorWidth = targetSize / sectorCount;
    var sectorNameSize = sectorWidth / 3;

    mainCtx.fillStyle = "rgba(0,0,0,0.5)";

    for (var i = 0; i < sectorCount; i++) {
      var x = sectorWidth + i * sectorWidth - sectorWidth;
      for (var j = 0; j < sectorCount; j++) {
        var y = sectorWidth + j * sectorWidth - sectorWidth;
        mainCtx.fillStyle = "rgba(0,0,0,0.5)";

        mainCtx.fillRect(beginX + x, beginY + y, sectorWidth, sectorWidth);

        mainCtx.fillStyle = "rgba(255,255,255,0.1)";
        mainCtx.textBaseline = "middle";
        mainCtx.textAlign = "center";
        mainCtx.font = `${sectorNameSize}px 'Open Sans'`;
        mainCtx.fillText(
          `${sectorNames[0][i]}${sectorNames[1][j]}`,
          beginX + x + sectorWidth / 2,
          beginY + y + sectorWidth / 2,
        );
      }
    }
    mainCtx.textBaseline = "left";
    mainCtx.textAlign = "left";
  }
  function drawMinimap() {
    if (border.centerX !== 0 || border.centerY !== 0 || !settings.showMinimap) return;
    mainCtx.save();
    var targetSize = 150;
    var width = targetSize * (border.width / border.height);
    var height = targetSize * (border.height / border.width);
    var beginX = mainCanvas.width / viewMult - width - 10;
    var beginY = mainCanvas.height / viewMult - height - 10;

    mainCtx.fillStyle = "rgba(0,0,0,0.8)";

    mainCtx.fillRect(beginX, beginY, width, height);

    mainCtx.fillStyle = "#fff";

    var myPosX = beginX + ((cameraX + border.width / 2) / border.width) * width;
    var myPosY = beginY + ((cameraY + border.height / 2) / border.height) * height;
    mainCtx.beginPath();
    mainCtx.arc(myPosX, myPosY, 5, 0, PI_2, false);
    mainCtx.closePath();
    mainCtx.fill();

    if (window.globalPreference.TAB_ACTIVE) {
      
      var myPosX2 =  beginX + (clientX2 / border.width) * width;
      var myPosY2 =  beginX + (clientY2 / border.height) * height;

      mainCtx.beginPath();
      mainCtx.arc(myPosX2, myPosY2, 5, 0, PI_2, false);
      mainCtx.closePath();
      mainCtx.fill();
    }

    mainCtx.restore();
  }

  function drawGame() {
    stats.framesPerSecond += (1000 / Math.max(Date.now() - syncAppStamp, 1) - stats.framesPerSecond) / 10;
    syncAppStamp = Date.now();
    
    var drawList = (window.globalPreference.TAB_ACTIVE ? cells2 : cells).list.slice(0).sort(cellSort);
    
    for (var i = 0, l = drawList.length; i < l; i++) drawList[i].update(syncAppStamp);
    cameraUpdate();

    mainCtx.save();

    mainCtx.fillStyle = "#0c0c0c";
    mainCtx.fillRect(0, 0, mainCanvas.width, mainCanvas.height);

    toCamera(mainCtx);
    drawBorders();
    for (var i = 0, l = drawList.length; i < l; i++) drawList[i].draw(mainCtx);

    fromCamera(mainCtx);
    mainCtx.scale(viewMult, viewMult);

    var height = 5;
    mainCtx.fillStyle = settings.darkTheme ? "#FFF" : "#000";
    mainCtx.textBaseline = "top";
    if (leaderboard.visible) {
      mainCtx.drawImage(leaderboard.canvas, mainCanvas.width / viewMult - 10 - leaderboard.canvas.width, 10);
    }
    if (!isNaN(stats.score)) {
      mainCtx.font = "bold 20px 'Open Sans'";
      let fullTextScore = `SCORE ${stats.score}`,
        padding = 10;
      let getSizeText = mainCtx.measureText(fullTextScore);
      mainCtx.fillStyle = "rgba(0,0,0, 0.6)";

      mainCtx.fillRect(5, height, Math.floor(getSizeText.width) + (padding + 5), 20 + padding);
      mainCtx.fillStyle = "rgb(125, 125, 125)";
      mainCtx.fillText(fullTextScore, 13, height + 8);
      height += 30;
    }

    mainCtx.font = "20px 'Open Sans'";
    let countFPS = ~~stats.framesPerSecond;
    let gameStatsFPS = `${countFPS} FPS`;
    let getSizeTextFPS = mainCtx.measureText(gameStatsFPS);

    mainCtx.fillStyle = "rgba(0,0,0, 0.6)";

    mainCtx.fillRect(5, height + 5, Math.floor(getSizeTextFPS.width) + 20, 30);
    if (countFPS >= 60) {
      mainCtx.fillStyle = "rgb(27, 165, 96)";
    } else if (countFPS <= 30) {
      mainCtx.fillStyle = "rgb(165, 27, 27)";
    } else {
      mainCtx.fillStyle = "rgb(235, 200, 48)";
    }
    mainCtx.fillText(gameStatsFPS, 13, height + 13);

    if (!isNaN(stats.latency)) {
      let ping = stats.latency;
      let fullTextPing = ` ${ping} PING`;
      let getSizeTextPing = mainCtx.measureText(fullTextPing);

      mainCtx.fillStyle = "rgba(0,0,0, 0.6)";
      mainCtx.fillRect(Math.floor(getSizeTextFPS.width) + 30, height + 5, Math.floor(getSizeTextPing.width) + 5, 30);
      if (ping <= 170) {
        mainCtx.fillStyle = "rgb(27, 165, 96)";
      } else if (countFPS > 275) {
        mainCtx.fillStyle = "rgb(165, 27, 27)";
      } else {
        mainCtx.fillStyle = "rgb(235, 200, 48)";
      }
      mainCtx.fillText(fullTextPing, Math.floor(getSizeTextFPS.width) + 28, height + 13);
    }

    drawMinimap();

    mainCtx.restore();

    cacheCleanup();
    wHandle.requestAnimationFrame(drawGame);
  }

  function cellSort(a, b) {
    return a.s === b.s ? a.id - b.id : a.s - b.s;
  }

  function cameraUpdate() {
    var myCells = [];
    var cl = window.globalPreference.TAB_ACTIVE ? cells2 : cells;
    for (var i = 0; i < cl.mine.length; i++)
      if (cl.byId.hasOwnProperty(cl.mine[i])) myCells.push(cl.byId[cl.mine[i]]);

    if (myCells.length > 0) {
      var x = 0,
        y = 0,
        s = 0,
        score = 0;
      for (var i = 0, l = myCells.length; i < l; i++) {
        var cell = myCells[i];
        score += ~~((cell.ns * cell.ns) / 100);
        x += cell.x;
        y += cell.y;
        s += cell.s;
      }
      targetX = x / l;
      targetY = y / l;
      
      targetZ = Math.pow(Math.min(64 / s, 1), 0.4);
      cameraX += (targetX - cameraX) / 2;
      cameraY += (targetY - cameraY) / 2;
      stats.score = score;
      stats.maxScore = Math.max(stats.maxScore, score);
    } else {
      stats.score = NaN;
      stats.maxScore = 0;
      cameraX += (targetX - cameraX) / 20;
      cameraY += (targetY - cameraY) / 20;
    }
    cameraZ += (targetZ * viewMult * mouseZ - cameraZ) / 9;
    cameraZInvd = 1 / cameraZ;
  }

  function Cell(id, x, y, s, name, color, skin, flags, multi = false) {
    this.id = id;
    this.multi = multi;
    this.x = this.nx = this.ox = x;
    this.y = this.ny = this.oy = y;
    this.s = this.ns = this.os = s;
    this.setColor(color);
    this.setName(name);
    this.setSkin(skin);
    this.jagged = flags & 0x01 || flags & 0x10;
    this.ejected = !!(flags & 0x20);
    this.born = syncUpdStamp;
  }
  Cell.prototype = {
    destroyed: false,
    id: 0,
    diedBy: 0,
    ox: 0,
    x: 0,
    nx: 0,
    oy: 0,
    y: 0,
    ny: 0,
    os: 0,
    s: 0,
    ns: 0,
    rad: 0,
    rot: 0,
    pi: Math.PI,
    nameSize: 0,
    drawNameSize: 0,
    pidPlayer: null,
    multi: false,
    color: "#FFF",
    sColor: "#E5E5E5",
    skin: null,
    tag: null,
    jagged: false,
    born: null,
    updated: null,
    dead: null, // timestamps
    destroy: function (killerId) {
      if (this.multi) if (this.id in cells2.byId) delete cells2.byId[this.id];
        else if (this.id in cells.byId) delete cells.byId[this.id];
      if (this.multi && cells2.mine.remove(this.id) && cells2.mine.length === 0) {
        window.globalPreference.TAB_ACTIVE = false;
      }
      if (!this.multi && cells.mine.remove(this.id) && cells.mine.length === 0) {
        showESCOverlay(true);
      }
      this.destroyed = true;
      this.dead = syncUpdStamp;
      if (killerId && !this.diedBy) {
        this.diedBy = killerId;
      }
    },
    update: function (relativeTime) {
      var dt = (relativeTime - this.updated) / 120;
      dt = Math.max(Math.min(dt, 1), 0);
      if (this.destroyed && Date.now() > this.dead + 200) {
        if (this.multi) cells2.list.remove(this);
          else cells.list.remove(this);
      } else if (this.diedBy) {
        if (!this.multi && cells.byId.hasOwnProperty(this.diedBy)) {
          this.nx = cells.byId[this.diedBy].x;
          this.ny = cells.byId[this.diedBy].y;
        } else if (this.multi && cells2.byId.hasOwnProperty(this.diedBy)) {
          this.nx = cells2.byId[this.diedBy].x;
          this.ny = cells2.byId[this.diedBy].y;
        }
      }
      this.x = this.ox + (this.nx - this.ox) * dt;
      this.y = this.oy + (this.ny - this.oy) * dt;
      this.s = this.os + (this.ns - this.os) * dt;
      this.nameSize = ~~(~~Math.max(~~(0.3 * this.ns), 24) / 3) * 3;
      this.drawNameSize = ~~(~~Math.max(~~(0.3 * this.s), 24) / 3) * 3;
    },
    setName: function (value) {
      if (typeof value === "string" && value.match(/\[.*\]/g)) {
        let accountDetails = window.parseName(value);
        if (
          window.account &&
          typeof accountDetails === "object" &&
          "account" in accountDetails &&
          typeof accountDetails.account === "object"
        ) {
          if ("pid" in accountDetails.account) {
            this.pidPlayer = accountDetails.account.pid;
            if ("tag" in accountDetails.account) {
              this.tag = accountDetails.account.tag;
            }
          }
        }
      }
      if (this.skin === null && value) {
        let nameSkin = /\{([\w\W]+)\}/.exec(value);
        this.name = value.replace(/(\{.*\}|\[.*\])/gi, "");
        this.setSkin(nameSkin[1]);
      } else this.name = value;
    },
    setSkin: function (value) {
      this.skin = (value && value[0] === "%" ? value.slice(1) : value) || this.skin;
      if (this.skin !== null && !loadedSkins[this.skin]) {
        this.skin = pushIntoSkinsLoaded(this.skin, false);
      }
    },
    setColor: function (value) {
      if (!value) return;
      this.color = value;
      this.sColor = darkenColor(value);
    },
    draw: function (ctx) {
      ctx.save();
      this.drawShape(ctx);
      this.drawText(ctx);
      ctx.restore();
    },
    drawShape: function (ctx) {
      ctx.fillStyle = settings.showColor ? this.color : Cell.prototype.color;
      ctx.strokeStyle = settings.showColor ? this.sColor : Cell.prototype.sColor;
      ctx.lineWidth = Math.max(~~(this.s / 50), 10);
      if (!this.ejected && 20 < this.s) this.s -= ctx.lineWidth / 2 - 2;

      ctx.beginPath();
      if (this.jagged) {
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = "20";
        ctx.arc(this.x, this.y, this.s, 0, PI_2, false);
      } else {
        ctx.fillStyle = this.sColor;
        ctx.strokeStyle = this.sColor;
        ctx.arc(this.x, this.y, this.s, 0, PI_2, false);
      }
      ctx.closePath();

      if (this.destroyed) ctx.globalAlpha = Math.max(200 - Date.now() + this.dead, 0) / 100;
      else ctx.globalAlpha = Math.min(Date.now() - this.born, 200) / 100;

      if (!this.ejected && 20 < this.s) this.jagged && ctx.stroke();

      ctx.fill();
      var sScaled = this.s * cameraZ;

      if (settings.showSkins && this.skin) {
        mainCtx.strokeStyle = "#ddd";

        var skin = loadedSkins[this.skin];
        if (skin && skin.complete && skin.width && skin.height) {
          ctx.save();
          ctx.clip();

          scaleBack(ctx);

          let sc = sScaled * 2.5;
          let skinActivated = window.settingProperty("GENERALE", "SHOW_SKIN_CELL");
          if (skinActivated !== false) {
            ctx.drawImage(skin, this.x * cameraZ - sScaled, this.y * cameraZ - sScaled, (sScaled *= 2), sScaled);
          }
          ctx.closePath();
          ctx.restore();

          let lineActivated = window.settingProperty("GENERALE", "LINE_MOUSE");

          if (this.pidPlayer === window.globalPreference.PID_PLAYER) {
            scaleBack(ctx);
            let MuoaActivated = window.settingProperty("GENERALE", "MUOA_CIRCLE");

            if (
              MuoaActivated !== false &&
              this.name &&
              ((!this.name.match(/(\%\^)+$/) && window.globalPreference.TAB_ACTIVE === false) ||
                (this.name.match(/(\%\^)+$/) && window.globalPreference.TAB_ACTIVE === true))
            ) {
              ctx.drawImage(MaouCircle.canvas, this.x * cameraZ - sc + sc / 2, this.y * cameraZ - sc + sc / 2, sc, sc);
            }

            scaleForth(ctx);
            if (lineActivated !== false) {
              mainCtx.lineWidth = 0x05;
              mainCtx.lineCap = "round";
              mainCtx.lineJoin = "round";
              mainCtx.beginPath();

              mainCtx.moveTo(this.x, this.y);
              mainCtx.lineTo(
                (mouseX - mainCanvas.width / 2) / cameraZ + cameraX,
                (mouseY - mainCanvas.height / 2) / cameraZ + cameraY,
              );
              mainCtx.closePath();
              mainCtx.stroke();
            }
          } else if (this.name) console.log(this.name);
        }
      }
      if (!this.ejected && 20 < this.s) this.s += ctx.lineWidth / 2 - 2;
    },
    drawText: function (ctx) {
      if (this.s < 20 || this.jagged) return;

      let nameActivated = window.settingProperty("GENERALE", "SHOW_NAME_CELL");
      let massActivated = window.settingProperty("GENERALE", "MASS_CELL");
      let cl = window.globalPreference.TAB_ACTIVE ? cells2 : cells;
      if ((massActivated !== false && cl.mine.indexOf(this.id) !== -1) || cl.mine.length === 0) {
        var mass = (~~((this.s * this.s) / 100)).toString();
        if (this.name) {
          if (this.tag) {
            drawText(ctx, false, this.x, this.y - (Math.max(this.s / 4.5, this.nameSize / 1.5) + 10), this.nameSize / 2, this.drawNameSize / 2, this.tag);
          }
          if (nameActivated !== false)
            drawText(ctx, false, this.x, this.y, this.nameSize, this.drawNameSize, this.name.replace(/\%\^/g, ""));
          var y = this.y + Math.max(this.s / 4.5, this.nameSize / 1.5);
          drawText(ctx, true, this.x, y, this.nameSize / 2, this.drawNameSize / 2, mass);
        } else drawText(ctx, true, this.x, this.y, this.nameSize / 2, this.drawNameSize / 2, mass);
      } else if (this.name) {
        if (nameActivated !== false) {
          if (this.tag) {
            drawText(ctx, false, this.x, this.y - Math.max(this.s / 4.5, this.nameSize / 1.5), this.nameSize / 2, this.drawNameSize / 2, this.tag);
          }
          drawText(ctx, false, this.x, this.y, this.nameSize, this.drawNameSize, this.name.replace(/\%\^/g, ""));
        }
      }
    },
  };

  function cacheCleanup() {
    for (var i in cachedNames) {
      for (var j in cachedNames[i]) if (syncAppStamp - cachedNames[i][j].accessTime >= 5000) delete cachedNames[i][j];
      if (cachedNames[i] === {}) delete cachedNames[i];
    }
    for (var i in cachedMass) if (syncAppStamp - cachedMass[i].accessTime >= 5000) delete cachedMass[i];
  }

  // 2-var draw-stay cache
  var cachedNames = {};
  var cachedMass = {};

  function drawTextOnto(canvas, ctx, text, size) {
    ctx.font = `${size}px 'Open Sans'`;
    ctx.lineWidth = settings.showTextOutline ? Math.max(~~(size / 10), 2) : 2;
    canvas.width = ctx.measureText(text).width + 2 * ctx.lineWidth;
    canvas.height = 4 * size;
    ctx.font = `${size}px 'Open Sans'`;
    ctx.lineWidth = settings.showTextOutline ? Math.max(~~(size / 10), 2) : 2;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    let nameColored = window.settingProperty("GENERALE", "COLOR_NAME_CELL");
    let nameStrokeColored = window.settingProperty("GENERALE", "OUTER_COLOR_TEXT");
    ctx.fillStyle = nameColored ? nameColored : "#FFF";
    ctx.strokeStyle = nameStrokeColored ? nameStrokeColored : "#000";
    ctx.translate(canvas.width / 2, 2 * size);
    ctx.lineWidth !== 1 && ctx.strokeText(text, 0, 0);
    ctx.fillText(text, 0, 0);
  }
  function drawRaw(ctx, x, y, text, size) {
    ctx.font = `${size}px 'Open Sans'`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.lineWidth = settings.showTextOutline ? Math.max(~~(size / 10), 2) : 2;
    ctx.fillStyle = "#FFF";
    ctx.strokeStyle = "#000";
    ctx.lineWidth !== 1 && ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
    ctx.restore();
  }
  function newNameCache(value, size) {
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    drawTextOnto(canvas, ctx, value, size);

    cachedNames[value] = cachedNames[value] || {};
    cachedNames[value][size] = {
      width: canvas.width,
      height: canvas.height,
      canvas: canvas,
      value: value,
      size: size,
      accessTime: syncAppStamp,
    };
    return cachedNames[value][size];
  }
  function newMassCache(size) {
    var canvases = {
      0: {},
      1: {},
      2: {},
      3: {},
      4: {},
      5: {},
      6: {},
      7: {},
      8: {},
      9: {},
    };
    for (var value in canvases) {
      var canvas = (canvases[value].canvas = document.createElement("canvas"));
      var ctx = canvas.getContext("2d");
      drawTextOnto(canvas, ctx, value, size);
      canvases[value].canvas = canvas;
      canvases[value].width = canvas.width;
      canvases[value].height = canvas.height;
    }
    cachedMass[size] = {
      canvases: canvases,
      size: size,
      lineWidth: settings.showTextOutline ? Math.max(~~(size / 10), 2) : 2,
      accessTime: syncAppStamp,
    };
    return cachedMass[size];
  }
  function toleranceTest(a, b, tolerance) {
    return a - tolerance <= b && b <= a + tolerance;
  }
  function getNameCache(value, size) {
    if (!cachedNames[value]) return newNameCache(value, size);
    var sizes = Object.keys(cachedNames[value]);
    for (var i = 0, l = sizes.length; i < l; i++)
      if (toleranceTest(size, sizes[i], size / 4)) return cachedNames[value][sizes[i]];
    return newNameCache(value, size);
  }
  function getMassCache(size) {
    var sizes = Object.keys(cachedMass);
    for (var i = 0, l = sizes.length; i < l; i++)
      if (toleranceTest(size, sizes[i], size / 4)) return cachedMass[sizes[i]];
    return newMassCache(size);
  }

  function drawText(ctx, isMass, x, y, size, drawSize, value) {
    ctx.save();
    if (size > 500) return drawRaw(ctx, x, y, value, drawSize);
    ctx.imageSmoothingQuality = "high";
    if (isMass) {
      var cache = getMassCache(size);
      cache.accessTime = syncAppStamp;
      var canvases = cache.canvases;
      var correctionScale = drawSize / cache.size;

      // calculate width
      var width = 0;
      for (var i = 0; i < value.length; i++) width += canvases[value[i]].width - 2 * cache.lineWidth;

      ctx.scale(correctionScale, correctionScale);
      x /= correctionScale;
      y /= correctionScale;
      x -= width / 2;
      for (var i = 0; i < value.length; i++) {
        var item = canvases[value[i]];
        ctx.drawImage(item.canvas, x, y - item.height / 2);
        x += item.width - 2 * cache.lineWidth;
      }
    } else {
      var cache = getNameCache(value, size);
      cache.accessTime = syncAppStamp;
      var canvas = cache.canvas;
      var correctionScale = drawSize / cache.size;
      ctx.scale(correctionScale, correctionScale);
      x /= correctionScale;
      y /= correctionScale;
      ctx.drawImage(canvas, x - canvas.width / 2, y - canvas.height / 2);
    }
    ctx.restore();
  }

  function init() {
    mainCanvas = document.getElementById("canvas");
    mainCtx = mainCanvas.getContext("2d");
    chatBox = document.getElementById("chat_textbox") || null;
    mainCanvas.focus();
    function handleScroll(event) {
      mouseZ *= Math.pow(0.9, event.wheelDelta / -150 || event.detail || 0);
      0.1 > mouseZ && (mouseZ = 0.1);
      mouseZ > 4 / mouseZ && (mouseZ = 4 / mouseZ);
    }
    if (/firefox/i.test(navigator.userAgent)) document.addEventListener("DOMMouseScroll", handleScroll, false);
    else document.body.onmousewheel = handleScroll;

    let im = 1;
    let multiSplit = (h) => {
      if (!h || !pressed.g) return;
      let split = () => wsSend(UINT8_CACHE[17]);
      for (let k = 0; k < h / 4; k++) {
        if (k === 0) split();
        setTimeout(() => {
          split();
        }, 40);
      }
    };
    function feed() {
      if (!pressed.f) return;
      window.onkeydown({ keyCode: 87 });
      window.onkeyup({ keyCode: 87 });
      setTimeout(feed, 0);
    }
    function getMyOwnKey(keyString, defaultKey) {
      let keyboard = window.globalPreference.KEYBOARD;
      if (keyString in keyboard) {
        return keyboard[keyString] || defaultKey;
      } else return defaultKey;
    }

    wHandle.onkeydown = function (event) {
      switch (event.keyCode) {
        case 13: // enter
          if (!chatBox || escOverlayShown || !window.account || !settings.showChat) break;
          if (isTyping) {
            chatBox.blur();
            var chattxt = chatBox.value;
            if (chattxt.length > 0) sendChat(chattxt);
            chatBox.value = "";
          } else chatBox.focus();
          break;
        case getMyOwnKey("FEED", 70): // F
          if (isTyping || escOverlayShown) break;
          pressed.f = true;
          feed();
          break;
        case getMyOwnKey("SPLIT", 32): // space
          if (isTyping || escOverlayShown || pressed.space) break;
          wsSend(UINT8_CACHE[17]);
          pressed.space = true;
          break;
        case getMyOwnKey("SPLIT_4", 71): // G - split 4
          if (isTyping || escOverlayShown || pressed.g) break;
          pressed.g = true;
          multiSplit(4);
          break;
        case getMyOwnKey("SPLIT_16", 72): // H - split 16
          if (isTyping || escOverlayShown || pressed.g) break;
          pressed.g = true;
          multiSplit(16);
          break;
        case getMyOwnKey("SPLIT_32", 74): // j - split 32
          if (isTyping || escOverlayShown || pressed.g) break;
          pressed.g = true;
          multiSplit(32);
          break;
        case getMyOwnKey("SPLIT_64", 75): // k - split 64
          if (isTyping || escOverlayShown || pressed.g) break;
          pressed.g = true;

          multiSplit(64);
          break;
        case 87: // W
          if (isTyping || escOverlayShown || pressed.w) break;
          wsSend(UINT8_CACHE[21]);
          pressed.w = true;
          break;
        case 81: // Q
          if (isTyping || escOverlayShown || pressed.q) break;
          wsSend(UINT8_CACHE[18]);
          pressed.q = true;
          break;
        case 82: // R
          if (isTyping || escOverlayShown || pressed.r) break;
          wsSend(UINT8_CACHE[23]);
          pressed.r = true;
          break;
        case 84: // T
          if (isTyping || escOverlayShown || pressed.t) break;
          wsSend(UINT8_CACHE[24]);
          pressed.t = true;
          break;
        case 80: // P
          if (isTyping || escOverlayShown || pressed.p) break;
          wsSend(UINT8_CACHE[25]);
          pressed.p = true;
          break;
        case 9: //TAB
          event.preventDefault();
          if (isTyping || escOverlayShown || pressed.tab) break;
          pressed.tab = true;
          if (window.globalPreference.TAB_ACTIVE === false) {
            /** account check error */
            const w = new Writer(true);
            w.setUint8(0x00);
            w.setStringUTF8(`{${window.globalPreference.defaultMultiSkin}}${window.globalPreference.PLAYER_NAME}%^`);
            wsSend(w, true);
            window.globalPreference.TAB_CELL_INGAME = true;
            window.globalPreference.TAB_ACTIVE = true;
            if (window.globalPreference.TAB_CELL_INGAME === false) window.clientX2 = window.clientY2 = 0;
            pressed.tab = false;
          } else {

            window.globalPreference.TAB_ACTIVE = false;
            pressed.tab = false;
          }

          break;
        case 27: // esc
          if (pressed.esc) break;
          pressed.esc = true;
          if (escOverlayShown) hideESCOverlay();
          else showESCOverlay();
          break;
      }
    };
    wHandle.onkeyup = function (event) {
      switch (event.keyCode) {
        case 32: // space
          pressed.space = false;
          break;
        case 87: // W
          pressed.w = false;
          break;
        case 81: // Q
          if (pressed.q) wsSend(UINT8_CACHE[19]);
          pressed.q = false;
          break;
        case getMyOwnKey("FEED", 70): // F
          pressed.f = false;
          break;
        case getMyOwnKey("MULTIBOX", 9): //TAB
          pressed.tab = false;
          break;

        case getMyOwnKey("HIDE_OVERALY", 27): // esc
          pressed.esc = false;
          break;
        case getMyOwnKey("SPLIT_4", 71): // G - split 4
          pressed.g = false;
          break;
        case getMyOwnKey("SPLIT_16", 72): // H - split 16
          pressed.g = false;
          break;
        case getMyOwnKey("SPLIT_32", 74): // j - split 32
          pressed.g = false;
          break;
        case getMyOwnKey("SPLIT_60", 75): // k - split 64
          pressed.g = false;
          break;
      }
    };
    if (chatBox) {
      chatBox.onblur = function () {
        isTyping = false;
        drawChat();
      };
      chatBox.onfocus = function () {
        isTyping = true;
        drawChat();
      };
    }
    
    mainCanvas.onmousemove = function (event) {
      mouseX = event.clientX;
      mouseY = event.clientY;
    };
    setInterval(function () {
      // send mouse update
      let mX = (mouseX - mainCanvas.width / 2) / cameraZ + cameraX,
        mY = (mouseY - mainCanvas.height / 2) / cameraZ + cameraY;
      sendMouseMove(mX, mY);
      if (window.globalPreference.TAB_ACTIVE === true) {
        sendMouseMove(mX, mY, true);
      }
    }, 40);
    wHandle.onresize = function () {
      var cW = (mainCanvas.width = wHandle.innerWidth),
        cH = (mainCanvas.height = wHandle.innerHeight);
      viewMult = Math.sqrt(Math.min(cH / 1080, cW / 1920));
    };
    wHandle.onresize();
    console.log(`AGAREV done in ${Date.now() - LOAD_START}ms`);
    
    loaded();
    gameReset();
    showESCOverlay();

    if (settings.allowGETipSet && wHandle.location.search) {
      var div = /ip=([\w\W]+):([0-9]+)/.exec(wHandle.location.search.slice(1));
      if (div) wsInit(`${div[1]}:${div[2]}`);
    }

    window.requestAnimationFrame(drawGame);
  }
  wHandle.setserver = function (arg) {
    if (wsUrl === arg) return;
    wsInit(arg);
  };

  wHandle.spectate = function (a) {
    wsSend(UINT8_CACHE[1]);
    stats.maxScore = 0;
    hideESCOverlay();
  };
  wHandle.play = function (a) {
    sendPlay(a);
    if (window.closePanel) window.closePanel();
    hideESCOverlay();
  };

  init();
}