import { handleTimeTaken } from "../components/utils/actions";
import { Writer } from "../middlewares/binaryPacket";

export const CommandsHandler = (commandContent: string) => {
  let wn: any = window;
  let commandFullLine = commandContent.replace(/\$/g, "").trim().split(/\s/g);
  let command = commandFullLine.length > 0 ? commandFullLine[0].toString().toLowerCase() : null;
  let check = (t: string, o: any) => !(t in o);
  if (command && typeof command === "string") {
    let token = localStorage.getItem("token");
    switch (command) {
      case "help":
        let commandsAvailable = ["$kill -> for kill your self"];
        let elements = [];
        if (wn.account && "admin" in wn.account.role && wn.account.role.admin === true) {
          commandsAvailable.push(
            "$mute -> for mute users e.g. ($mute ID (here time or empty for infinity))",
            "$unmute -> for unmute users e.g. ($unmute ID (here time or empty for infinity))",
            "$ban -> ban users from the game e.g. ($ban ID (here time or empty for infinity))",
            "$unban -> unban users if banned before e.g. ($unban ID (here time or empty for infinity))",
            "$killp -> for kill users e.g ($kill ID)",
          );
        }
        for (let commandHelp of commandsAvailable) {
          elements.push(`<div style="font-size: 13px;margin: 0 0 3px 0;">${commandHelp}</div>`);
        }
        wn.sendSystemMessage(elements.join(""));
        break;
      case "kill":
        if (!commandFullLine[1]) {
          wn.sendPacket(wn.wsStuffs.send_3);
          break;
        }
        break;
      case "mute":
      case "unmute":
      case "ban":
      case "unban":
      case "killp":
        if (check("1", commandFullLine)) break; // for get the pid is required
        if ("role" in wn.account && wn.wsServer) {
          if (!token) {
            wn.onbeforeunload = null;
            location.reload();
            return;
          }
          if (
            ("admin" in wn.account.role && wn.account.role.admin === true) ||
            ("permission" in wn.account.role &&
              command in wn.account.role.permission &&
              wn.account.role.permission[command] === true)
          ) {
            let writer = new Writer(),
              packetId: number | null = command === "mute" ? 0x3 : 0x4;
            if (command.indexOf("ban") !== -1) {
              packetId = command === "ban" ? 0x5 : 0x6;
            } else packetId = command === "killp" ? 0x8 : packetId;

            if (!packetId) break;
            writer.setUint8(packetId);
            writer.setStringUTF8(token); // TOKEN
            writer.setStringUTF8(commandFullLine[1]); // PID
            if (packetId === 0x3 || packetId === 0x5) {
              let timeForUnmute = handleTimeTaken(commandFullLine);
              if (timeForUnmute) writer.setStringUTF8(timeForUnmute); // TIME
            }
            wn.wsServer.sendPacket(writer);
          } else {
            wn.sendSystemMessage("ليس لديك صلحيه لهذا");
          }
        } else wn.sendSystemMessage("You can't do that right now maybe later");
        break;
      default:
        wn.sendSystemMessage("Invalid command please check the list help");
        break;
    }
  }
};
