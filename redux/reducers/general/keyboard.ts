import { Action } from "../../reduxIndex";

export interface KeyboardState {
  customer?: {
    keyFunction: string | null;
    key: number | null;
  };
  keyboardLayout?: {
    [key: string]: number;
  };
  [key: string]: any;
}

export const keyboardReducer = (
  state: KeyboardState = {
    customer: { keyFunction: null, key: null },
    keyboardLayout: {},
  },
  action: Action<KeyboardState>,
): KeyboardState => {
  switch (action.type) {
    case "UPDATE_KEYBOARD_STATE":
      return Object.assign({}, state, action.payload);
    default:
      return state;
  }
};
