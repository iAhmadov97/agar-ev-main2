import { Action } from "../../reduxIndex";

interface dropDownType {
  name: string;
  server: string;
  [key: string]: string | string[];
}
interface SkinObject {
  [key: string]: {
    url: string;
    author: string;
    code: string;
    [key: string]: any;
  };
}
export interface overlayState {
  mauos: string[];
  prixBuyClan: number;
  loader: boolean;
  loadingClans: boolean;
  authPageClosed: boolean;
  readyContent: boolean;
  loaded: boolean;
  skins: {
    fullskinsCount: number;
    currentpage: number;
    tags: string[];
    clan?: {
      code: string;
      url: string;
    }
    currentTag: string;
    skinsObjects: SkinObject;
  } | null;
  account: null | { [key: string]: any };
  panel: {
    current: null | string;
  };
  dropDown: {
    current: number;
    currentPanel: number;
    currentServer: number;
    content: dropDownType[];
  };
  [key: string]: any;
}

export const overaly = (
  state: overlayState = {
    mauos: [],
    prixBuyClan: 200,
    loader: true,
    loadingClans: false,
    authPageClosed: false,
    readyContent: false,
    account: null,
    skins: null,
    loaded: false,
    panel: {
      current: null,
    },
    dropDown: {
      current: 0,
      currentPanel: 0,
      currentServer: 0,
      content: [],
    },
  },
  action: Action<overlayState>,
): overlayState => {
  switch (action.type) {
    case "UPDATE_OVERALY_STATE":
      return Object.assign({}, state, action.payload);
    default:
      return state;
  }
};
