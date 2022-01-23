import { sendChatMessage } from "../components/utils/ChatContainer";
import { Writer } from "../middlewares/binaryPacket";

export interface PressedKeys {
  [key: string]: boolean;
}

var wn: any = window;

var pressed: PressedKeys = (wn.pressed = {
  feed: false,
});

export const getMyOwnKey = (keyString: string, defaultKey: number) => {
  let keyboard = wn.globalPreference.KEYBOARD;
  if (keyString in keyboard) {
    return keyboard[keyString] || defaultKey;
  } else return defaultKey;
};

export const feed = () => {
  if (!pressed.f) return;
  wn.sendPacket(wn.wsStuffs.cache[21]);
  setTimeout(feed, 0);
};

export let multiSplit = (splits: number) => {
  if (!splits || !pressed.g) return;
  let split = () => wn.sendPacket(wn.wsStuffs.cache[17]);
  split();
  for (let o = 0; o < splits; o++) setTimeout(() => split(), 30 * (splits === 4 ? 1 : 2));

  /*
  if (splits > 4) {
    
  } else {
    for (let k = 0; k < splits / 4; k++) {
      if (k === 0) split();
      setTimeout(() => {
        split();
      }, 40);
    }
  }*/
  

  //
  /*
  let splitloop = splits === 4 ? (splits / 4) : splits;
  for (var i = 0; i < splits; ++i) {
    setTimeout(() => {
      split();
    }, splits === 4 ? splits * 10 : i * 5);
  }*/
};

export const InitKeysEvents = () => {
  var chatElement: any = document.getElementById("chat_textbox");
  wn.onkeydown = function (event: KeyboardEvent) {
    let isMuted =
      wn.account &&
      "playerDetails" in wn.account &&
      "muted" in wn.account.playerDetails &&
      Object.prototype.hasOwnProperty.call(wn.account.playerDetails.muted, "muted") &&
      wn.account.playerDetails.muted.muted === true
        ? true
        : false;
    switch (event.keyCode) {
      case 13:
        if (wn.escOverlayShown || !chatElement) break;
        if (isMuted) {
          wn.sendSystemMessage("You can't talk because you're muted");
          break;
        }
        if (wn.isTyping) {
          chatElement.blur();
          var chattxt = chatElement.value;
          if (chattxt.length > 0) sendChatMessage(chattxt);
          chatElement.value = "";
        } else chatElement.focus();
        /*
        if (!wn.isTyping) {
          chatElement.focus();
          wn.onfocusChat();
          break;
        }

        chatElement.blur();
        wn.onblurChat();
        let chattxt = chatElement.value;
        if (chattxt.length > 0) {
          sendChatMessage(chattxt);
        }
        chatElement.value = "";*/
        break;
      case getMyOwnKey("FEED", 70): // F
        if (wn.isTyping || wn.escOverlayShown) break;
        pressed.f = true;
        feed();
        break;
      case getMyOwnKey("SPLIT", 32): // space
        if (wn.isTyping || wn.escOverlayShown || pressed.space) break;
        wn.sendPacket(wn.wsStuffs.cache[17]);
        pressed.space = true;
        break;
      case getMyOwnKey("SPLIT_4", 71): // G - split 4
        if (wn.isTyping || wn.escOverlayShown || pressed.g) break;
        pressed.g = true;
        multiSplit(4);
        break;
      case getMyOwnKey("SPLIT_16", 72): // H - split 16
        if (wn.isTyping || wn.escOverlayShown || pressed.g) break;
        pressed.g = true;
        multiSplit(16);
        break;
      case getMyOwnKey("SPLIT_32", 74): // j - split 32
        if (wn.isTyping || wn.escOverlayShown || pressed.g) break;
        pressed.g = true;
        multiSplit(32);
        break;
      case getMyOwnKey("SPLIT_64", 75): // k - split 64
        if (wn.isTyping || wn.escOverlayShown || pressed.g) break;
        pressed.g = true;

        multiSplit(64);
        break;
      case getMyOwnKey("FEED_ONE", 87): // W
        if (wn.isTyping || wn.escOverlayShown || pressed.w) break;
        wn.sendPacket(wn.wsStuffs.cache[21]);
        pressed.w = true;
        break;
      // case 81: // Q
      //   if (wn.isTyping || wn.escOverlayShown || pressed.q) break;
      //   wn.sendPacket(wn.wsStuffs.cache[18]);
      //   pressed.q = true;
      //   break;
      // case 82: // R
      //   if (wn.isTyping || wn.escOverlayShown || pressed.r) break;
      //   wn.sendPacket(wn.wsStuffs.cache[23]);
      //   pressed.r = true;
      //   break;
      // case 84: // T
      //   if (wn.isTyping || wn.escOverlayShown || pressed.t) break;
      //   wn.sendPacket(wn.wsStuffs.cache[24]);
      //   pressed.t = true;
      //   break;
      // case 80: // P
      //   if (wn.isTyping || wn.escOverlayShown || pressed.p) break;
      //   wn.sendPacket(wn.wsStuffs.cache[25]);
      //   pressed.p = true;
      //   break;
      case getMyOwnKey("MULTIBOX", 9): //TAB
        event.preventDefault();
        if (wn.isTyping || wn.escOverlayShown || pressed.tab) break;
        if (!wn.account) {
          wn.sendSystemMessage("You can't play multibox without account");
          break;
        }
        pressed.tab = true;
        if (wn.globalPreference.TAB_ACTIVE === false) {
          const w = new Writer(true);
          w.setUint8(0x00);
          w.setStringUTF8(`{${wn.globalPreference.currentMulti}}${wn.globalPreference.PLAYER_NAME}%^`);
          wn.sendPacket(w, true);
          wn.globalPreference.TAB_CELL_INGAME = true;
          wn.globalPreference.TAB_ACTIVE = true;
          if (wn.globalPreference.TAB_CELL_INGAME === false) wn.clientX2 = wn.clientY2 = 0;
          pressed.tab = false;
        } else {
          wn.globalPreference.TAB_ACTIVE = false;
          pressed.tab = false;
        }

        break;
      case getMyOwnKey("HIDE_OVERALY", 27): // esc
        if (pressed.esc) break;
        pressed.esc = true;
        if (wn.escOverlayShown) wn.hideESCOverlay();
        else wn.showESCOverlay();
        break;
    }
  };
};

wn.onkeyup = function (event: any) {
  switch (event.keyCode) {
    case getMyOwnKey("SPLIT", 32): // space
      pressed.space = false;
      break;
    case getMyOwnKey("FEED_ONE", 87): // W
      pressed.w = false;
      break;
    case 81: // Q
      if (pressed.q) wn.sendPacket(wn.wsStuffs.cache[19]);
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
