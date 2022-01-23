import { useDispatch, useSelector } from "react-redux";
import { overlayState } from "../redux/reducers/general/overly";
import { Dispatch, StateInterface } from "../redux/reduxIndex";

import { Reader, Writer } from "./binaryPacket";
// import BinaryReader from "./BinaryReader.js";
// import BinaryWriter from "./BinaryWriter.js";

type CacheType = {
  [key: number]: Uint8Array;
};

export class WsHandler {
  public wn: any;
  private useHTTPS: boolean;
  private cacheUint: CacheType;
  public token: string | null;
  public wsUrl: string | undefined;

  constructor(url?: string) {
    this.token = localStorage.getItem("token");
    this.wn = window;
    this.useHTTPS = "https:" == window.location.protocol;
    this.wsUrl = url;
    this.cacheUint = {
      0x8: new Uint8Array([0x8]),
    };
  }
  public wsInit(account?: any) {
    let disconnectDelay = 1e3;
    this.wn.socket = new WebSocket(`ws${this.useHTTPS ? "s" : ""}://${this.wsUrl}`);
    this.wn.socket.binaryType = "arraybuffer";
    this.wn.socket.addEventListener("open", () => {
      this.wsOpen(account);
    });
    this.wn.socket.addEventListener("close", () => {
      setTimeout(() => {
        if (this.wn.socket && this.wn.socket.readyState === 1) return;
        this.wn.socket = null;
        this.wsInit(account);
      }, (disconnectDelay *= 1.5));
    });
    this.wn.socket.addEventListener("message", this.wsMessage);
  }
  public sendPacket(data: any) {
    if (!this.wn.socket) return;
    if (this.wn.socket.readyState !== 1) return;
    if (data.build) this.wn.socket.send(data.build());
    else this.wn.socket.send(data);
  }
  private wsMessage(event: any) {
    this.wn = window; // update window objects
    if (!(event.data instanceof ArrayBuffer)) return;
    var reader = new Reader(new DataView(event.data), 0, true);
    var packetId = reader.getUint8();
    try {
      switch (packetId) {
        case 0x10: // Message
          let message = reader.getStringUTF8();
          message && this.wn.sendSystemMessage(message);
          break;
        case 0x11: // MUTED
        case 0x12: // UNMUTED
          if (packetId === 0x12) {
            this.wn.sendSystemMessage("تم فك الميوت تلقائيا");
          }
          if (this.wn.account && this.wn.reduxDispatch) {
            this.wn.reduxDispatch({
              type: "UPDATE_OVERALY_STATE",
              payload: {
                account: Object.assign({}, this.wn.account, {
                  playerDetails: {
                    ...this.wn.account.playerDetails,
                    muted: { muted: packetId === 0x11 },
                  },
                }),
              },
            });
          }
          break;
        case 0x13: // BAN
        case 0x14: // UNBAN
          if (this.wn.account && this.wn.reduxDispatch) {
            if (packetId === 0x14) {
              this.wn.onunload = this.wn.onbeforeunload = null;
              location.reload();
            } else this.wn.showESCOverlay();
            this.wn.reduxDispatch({
              type: "UPDATE_OVERALY_STATE",
              payload: {
                account: Object.assign({}, this.wn.account, {
                  banned: {
                    banned: packetId === 0x13
                  },
                }),
              },
            });
          }
          break;
        case 0x15: // XP SYSTEM
          if (this.wn.account && this.wn.reduxDispatch) {
            let [xp, level, total, score, balance] = reader.getStringUTF8().toString().split("_");
            if (!xp || (!level && parseInt(level) !== 0) || !total || !score || !balance) break;
            this.wn.reduxDispatch({
              type: "UPDATE_OVERALY_STATE",
              payload: {
                account: Object.assign({}, this.wn.account, {
                  xp: { lastScore: score, currentXP: xp, totalXP: total },
                  level,
                  balance
                }),
              },
            });
          }

          break;
        case 0x16: // KILLED
          if (this.wn.ret && ("admin" in this.wn.account.role || this.wn.account.role.admin !== true)) {
            this.wn.ret("/kill");
          }
        break;
      }
    } catch (e) {
      console.log(e);
    }
  }
  private wsOpen(account?: any) {
    if (this.token && account && "pid" in account) {
      let writer = new Writer();
      writer.setUint8(0x1);
      writer.setStringUTF8(String(account.pid));
      writer.setStringUTF8(this.token);
      this.sendPacket(writer);
    }
  }
}
