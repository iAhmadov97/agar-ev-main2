import axios from "axios";
import { Initialize } from "./before";
import styled from "styled-components";
import { particles } from "./Particles";
import { FC, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { StateInterface, Dispatch } from "../redux/reduxIndex";
import { overlayState } from "../redux/reducers/general/overly";
import { InitKeysEvents } from "./KeyboardEvents";

const LoaderComponent = styled.div`
  width: 100%;
  height: 100%;
  position: fixed;
  top: 0;
  left: 0;
  background: #000;
  z-index: 99999999999999999;
  padding: 0;
  margin: 0;
  .background {
    width: 100%;
    height: 100%;
    background-size: cover;
    animation: fadein 2s linear;
    z-index: 1;
  }
  .cn-loader,
  canvas,
  .content {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 9;
  }
  .content {
    z-index: 999;
    .progress {
      width: 100%;
      position: absolute;
      bottom: 10px;
      left: 0;
      .line {
        padding: 0 10px;
        display: flex;
        justify-content: space-between;
        div {
          color: #fff;
          font-size: 15px;
          text-transform: uppercase;
        }
      }
      .progress-line {
        height: 3px;
        background: #fff5;
        margin: 5px auto;
        width: calc(100% - 20px);
        div {
          background: #fff;
          height: 100%;
          width: 0;
        }
      }
    }
  }
  @keyframes fadein {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

export const LoaderScreen: FC = () => {
  const { dropDown } = useSelector<StateInterface, overlayState>((state) => state.overaly);
  const dispatch = useDispatch<Dispatch<overlayState>>();

  var [bg, setBG] = useState<string | null>(null);
  var [progressLine, setProgress] = useState<number>(0);

  useEffect(() => {
    let wn = window as any;
    let endpoint = wn.env.ENDPOINT;
    let progress: number = progressLine;
    let token = localStorage.token;
    (async () => {
      try {
        setProgress((progress = ~~(Math.random() * 20)));
        if (!endpoint) throw new Error("There's no endpoint stored");
        const globalInfo = await axios.request({
          url: `${endpoint}/global`,
        });
        if (globalInfo) {
          let result = globalInfo.data;
          if ("status" in result && result.status === true && "content" in result) {
            let content = result.content;
            let imagBackground = new Image();
            imagBackground.src = content.bg;
            imagBackground.onload = async () => {
              if ("bg" in content) setBG(content.bg);
              if ("title" in content) document.title = content.title;
              particles.init();
              setProgress((progress += ~~((40 - progress) / (Math.random() * 30))));
              let AccountFetched: null | overlayState["account"] = null;
              try {
                if (token) {
                  let fetchAccount = await axios.request({
                    url: `${endpoint}/me`,
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  });
                  let result = fetchAccount.data;
                  console.log("AGAREV -> Account has been fetched successfully");
                  if (!result || !("status" in result) || result.status !== true) {
                    if (localStorage.token) {
                      localStorage.removeItem("token");
                    }
                    wn.onunload = wn.onbeforeunload = null;
                    location.reload();
                  } else {
                    delete result["status"];
                    AccountFetched = wn.account = result;
                    setProgress(~~(progress += ~~((60 - progress) / (Math.random() * 60)) % 80));
                  }
                }
              } catch (e) {
                console.log("ERROR -> " + String(e));
              }
              Initialize(content, () => {
                setProgress(~~(progress += 100 - progress));
                setTimeout(() => {
                  dispatch({
                    type: "UPDATE_OVERALY_STATE",
                    payload: Object.assign(
                      { loader: false },
                      AccountFetched ? { account: AccountFetched } : {},
                      "servers" in content ? { dropDown: { ...dropDown, content: content.servers } } : {},
                      "prixs" in content ? content.prixs : {},
                      "muoas" in content ? { mauos: content.muoas } : {},
                    ),
                  });
                  InitKeysEvents();
                }, 2e3);
              });
            };
          }
        }
      } catch (e) {
        console.log("ERROR LOADER -> " + String(e));
      }
    })();
  }, []);
  return (
    <LoaderComponent id="loader-screen">
      {bg ? (
        <>
          <div className="background" style={{ backgroundImage: `url(${bg})` }} />
          <canvas id="particles"></canvas>
        </>
      ) : null}
      <div className="content">
        <div className="progress">
          <div className="line">
            <div className="name">AGAEEV</div>
            <div className="count-loaded">{progressLine}%</div>
          </div>
          <div className="progress-line">
            <div style={{ width: `${progressLine}%` }}></div>
          </div>
        </div>
      </div>
    </LoaderComponent>
  );
};
