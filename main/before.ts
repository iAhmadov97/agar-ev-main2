import { Mao } from "../middlewares/mouacircle";
import { MainOut } from "./MainOut";

export const Initialize = async (contentRequested: any, loaded: () => void) => {
  try {
    var wn = window as any;
    var defaults = (wn.defaults = contentRequested.default ?? {});
    wn.ws = null; // for the player
    wn.wsMulti = null; // for multi box player
    wn.escOverlayShown = false;
    wn.isTyping = false;
    wn.loadedSkins = {};
    if ("settings" in defaults) wn.default_settings = defaults.settings;
    if ("keyboard" in defaults) wn.default_keyboard = defaults.keyboard;
    if ("globalskins" in contentRequested) wn.globalskins = contentRequested.globalskins;
    wn.discord = "discord" in contentRequested ? contentRequested.discord : "";
    wn.bg_game = "bgGame" in contentRequested ? contentRequested.bgGame : "";
    wn.version_game = "version" in contentRequested ? contentRequested.version : 0;
    wn.propertysAllowed = "propertysAllowed" in contentRequested ? contentRequested.propertysAllowed : [];
    wn.ad = "ads" in contentRequested ? contentRequested.ads : null;
    wn.globalPreference = {
      defaultSkin: "skin" in defaults ? defaults.skin : "gxEJvZbjpg",
      defaultMultiSkin: "multi" in defaults ? defaults.skin : "j2OrpXbpng",
      TAB_ACTIVE: false,
      TAB_CELL_INGAME: false,
      PID_PLAYER: null,
      PLAYER_INGAME: false,
      MEOACIRCLE: localStorage.getItem("muoa") ?? "ePzSyUxpng",
      PLAYER_NAME: "",
      SETTINGS: {},
      KEYBOARD: {},
    };

    if ("disabled" in contentRequested && contentRequested.disabled === true) {
      throw new Error("The game was paused for few time try later");
    }
    if ("change_log" in contentRequested) {
      wn.change_log = contentRequested.change_log;
    }
    wn.wsStuffs = {
      PI: Math.PI * 2,
      send_1: new Uint8Array([254, 6, 0, 0, 0]),
      send_2: new Uint8Array([255, 1, 0, 0, 0]),
      send_3: new Uint8Array([99, 0, 47, 107, 105, 108, 108, 0]), // Kill binarys
      cache: {
        1: new Uint8Array([1]),
        17: new Uint8Array([17]),
        21: new Uint8Array([21]),
        18: new Uint8Array([18]),
        19: new Uint8Array([19]),
        22: new Uint8Array([22]),
        23: new Uint8Array([23]),
        24: new Uint8Array([24]),
        254: new Uint8Array([254]),
      },
    };

    wn.parseImgurCode = (code: string) => {
      let regexTypeImage = /(png|jpg|jpeg)+$/g;
      if (code && code.match(regexTypeImage)) {
        let type = code.split(regexTypeImage)[1] || null;
        let imgurCode = code.replace(regexTypeImage, "");
        if (type) return `https://i.imgur.com/${imgurCode}.${type}`;
      }
      return null;
    };

    wn.pushIntoSkinsLoaded = (
      imgurCode: string,
      ChangeTheMain: string | boolean = true,
      getImageContent: boolean = false,
      isPromise: boolean = false,
    ) => {
      try {
        let staticImgurCode = String(imgurCode);
        if (imgurCode && imgurCode.length !== 0) {
          if (ChangeTheMain === true) {
            wn.globalPreference.currentSkin = staticImgurCode;
          } else if (ChangeTheMain === "multi") {
            wn.globalPreference.currentMulti = staticImgurCode;
            wn.globalPreference.defaultMultiSkin = staticImgurCode;
          } else if (ChangeTheMain === "moua") {
            wn.globalPreference.MEOACIRCLE;
          }
          if (imgurCode in wn.loadedSkins) {
            return getImageContent ? wn.loadedSkins[imgurCode] : staticImgurCode;
          }
          let url = wn.parseImgurCode(imgurCode);
          if (url) {
            const imageToLoad = new Image();
            imageToLoad.src = url;
            if (isPromise) {
              return new Promise((resolve) => {
                wn.loadedSkins[staticImgurCode] = imageToLoad;
                imageToLoad.onload = () => {
                  resolve(getImageContent ? imageToLoad : staticImgurCode);
                };
              });
            } else {
              wn.loadedSkins[staticImgurCode] = imageToLoad;
              return getImageContent ? imageToLoad : staticImgurCode;
            }
          } else throw new Error("Invalid type code (image)");
        } else throw new Error("Invalid code");
      } catch (e) {
        console.log(e);
      }
    };

    try {
      var playerStorage = localStorage.playerDetails;
      if (playerStorage) {
        playerStorage = JSON.parse(playerStorage);
        if (playerStorage && "skinCode" in playerStorage) {
          // double check
          wn.globalPreference.defaultSkin = playerStorage.skinCode;
          if ("multiCode" in playerStorage) {
            wn.globalPreference.defaultMultiSkin = playerStorage.multiCode;
          }
        }
      }
    } catch (e) {}

    if (wn.globalPreference.defaultSkin) {
      await wn.pushIntoSkinsLoaded(wn.globalPreference.defaultSkin, true, false, true);
    }
    if (wn.globalPreference.defaultMultiSkin) {
      await wn.pushIntoSkinsLoaded(wn.globalPreference.defaultMultiSkin, "multi", false, true);
    }
    if (wn.globalPreference.MEOACIRCLE) {
      await wn.pushIntoSkinsLoaded(wn.globalPreference.MEOACIRCLE, "moua", false, true);
    }

    wn.MaouCircle = new Mao();

    wn.settingProperty = (pramType: string, type: string) => {
      let res = null;
      if (pramType && type && wn.globalPreference && "SETTINGS" in wn.globalPreference) {
        let settings = wn.globalPreference.SETTINGS;
        if (
          pramType in settings &&
          typeof settings[pramType] === "object" &&
          type in settings[pramType].content &&
          typeof settings[pramType].content[type] === "object"
        ) {
          let setting = settings[pramType].content[type];
          if ("color" in setting) res = setting.color;
          else if ("activated" in setting) res = setting.activated;
        }
      }
      return res;
    };

    wn.parseName = (nameCollected: string) => {
      if (nameCollected) {
        let miniName = nameCollected.replace(/(\{.*\}|\[.*\]|\<.*\>)/g, "");
        let nameOf = nameCollected;
        let accountDetails = null;
        if (nameOf.match(/\[.*\]/)) {
          try {
            let contentInBrackets = nameOf.match(/\[.*\]/);
            let contentInsideBrakets =
              contentInBrackets && "0" in contentInBrackets
                ? (contentInBrackets[0] as any).replace(/(\[|\])/g, "")
                : null;
            if (contentInsideBrakets && window.atob) {
              accountDetails = JSON.parse(decodeURIComponent(window.atob(contentInsideBrakets)));
            }
          } catch (e) {
            console.log(e);
            return;
          }
        }
        return Object.assign({}, { name: miniName }, { account: accountDetails });
      }
    };

    wn.sendCloseClient = () => {
      let token = localStorage.getItem("token");
      if (wn.wsServer && wn.socket && token && "pid" in wn.account && wn.Writer) {
        let writer = new wn.Writer();
        writer.setUint8(0x2);
        writer.setStringUTF8(`<${wn.account.pid}>${token}`);
        wn.wsServer.sendPacket(writer);
      }
      return "Are you sure that you want to leave game?";
    };

    var hosts: any = {
      0: [97, 103, 97, 101, 114, 45, 101, 118],
      1: [108, 111, 99, 97, 108, 104, 111, 115, 116],
      2: [97, 103, 97, 114, 45, 101, 118],
    };

    var matched = false;

    for (let hostKey in hosts) {
      let host = hosts[hostKey];
      let hostString = host.map((o: number) => String.fromCharCode(o)).join("");
      if (wn.location.host.indexOf(hostString) !== -1) {
        matched = true;
      }
    }

    if (!matched) {
      throw new Error("An error occurred");
    }
    // LOAD MAINOUT of game
    let doMain = setInterval(() => {
      if ("jQuery" in wn) {
        console.log("Trying to connect the main_out ..");
        MainOut(wn, wn.jQuery, () => loaded());
        clearInterval(doMain);
      }
    }, 1e3);
  } catch (e) {
    console.error(e);
  }
};
