import { Action } from "../../reduxIndex";

export interface settingState {
  text: string;
  [key: string]: any;
}

export const setting = (
  state: settingState = {
    text: "hello"
  },
  action: Action<settingState>,
): settingState => {
  switch (action.type) {
    case "UPDATE_SETTING_STATE":
      return Object.assign({}, state, action.payload);
    default:
      return state;
  }
};
