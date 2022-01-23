/**
 * redux-root
 */

import { compose, createStore, applyMiddleware } from "redux";
import thunk, { ThunkDispatch } from "redux-thunk";
import { MainReducers } from "./reducers/reduxReducers";

export const store = createStore(MainReducers, compose(applyMiddleware(thunk)));

export type StateInterface = ReturnType<typeof store.getState>;

export interface Action<T = string> {
  type:
    | "UPDATE_SETTING_STATE"
    | "UPDATE_OVERALY_STATE"
    | "UPDATE_CLAN_STATE"
    | "UPDATE_CLAN_CREATION_STATE"
    | "UPDATE_KEYBOARD_STATE"
    | "UPDATE_ADMIN_STATE";
  payload: Partial<T>;
}

export type Dispatch<A> = ThunkDispatch<StateInterface, Record<string, unknown>, Action<A>>;
