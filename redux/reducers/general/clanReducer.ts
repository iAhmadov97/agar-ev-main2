import { Action } from "../../reduxIndex";

export interface ClanObject {
  bg?: string;
  skin?: string;
  name?: string;
  tag?: string;
  [key: string]: any;
}

export interface ClanState {
  clan?: null | ClanObject;
  fetch?: any;
  clanCreation: null | ClanObject;
  wrappers: string[];
  [key: string]: any;
}

export const clan = (
  state: ClanState = {
    fetching: {},
    clan: null,
    wrappers: ["GENERALE_SETING", "CLAN_CREATION"],
    clanCreation: null,
  },
  action: Action<ClanState>,
): ClanState => {
  switch (action.type) {
    case "UPDATE_CLAN_STATE":
      return Object.assign({}, state, action.payload);
    case "UPDATE_CLAN_CREATION_STATE":
      return Object.assign({}, state, {
        clanCreation: Object.assign({}, state.clanCreation === null ? {} : state.clanCreation, action.payload),
      });
    default:
      return state;
  }
};
