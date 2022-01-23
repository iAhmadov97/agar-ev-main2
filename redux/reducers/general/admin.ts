import { Action } from "../../reduxIndex";

export interface SkinState {
  [key: string]: {
    url: string;
    private: boolean;
    id: string;
    author: string;
  };
}

export interface ClanObject {
  bg?: string;
  skin?: string;
  name?: string;
  tag?: string;
  [key: string]: any;
}

export interface AdminState {
  wrappers?: string[];
  skinsWating: SkinState | null;
  usersVerify: any;
  roles?: {
    [key: string]: {
      called?: string;
      color?: string;
      permission?: {
        [key: string]: boolean;
      };
      [key: string]: any;
    };
  } | null;
}

export const admin = (
  state: AdminState = {
    roles: null,
    usersVerify: null,
    wrappers: ["ROLE_CREATION","ROLES_MANAGE", "CLANS_MANAGE", "SKIN_MANAGE", "CHANGE_PROPERTY", "MANAGE_VERIFICATION"],
    skinsWating: null
  },
  action: Action<AdminState>,
): AdminState => {
  switch (action.type) {
    case "UPDATE_ADMIN_STATE":
      return Object.assign({}, state, action.payload);
    default:
      return state;
  }
};
