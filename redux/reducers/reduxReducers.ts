/**
 * reducers-redux-root
 */

import { combineReducers } from "redux";

import { setting } from "./general/setting";
import { overaly } from "./general/overly";
import { clan } from "./general/clanReducer";
import { keyboardReducer } from "./general/keyboard";
import { admin } from "./general/admin";

export const MainReducers = combineReducers({
  setting,
  overaly,
  clan,
  keyboardReducer,
  admin
});
