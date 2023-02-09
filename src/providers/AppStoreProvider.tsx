import { Component, createContext, JSX, useContext } from "solid-js";
import { createStore, SetStoreFunction } from "solid-js/store";

import User from "../models/User";

interface AppStore {
  // TODO(11b): Type up proper domain models and use them here.
  auth: { jwt?: string; user?: User };
}

const defaultStore = {
  auth: {
    jwt: undefined,
    user: undefined,
  },
};

const AppStoreContext = createContext<AppStoreContextValue>();
type AppStoreContextValue = [AppStore, SetStoreFunction<AppStore>];

/** Provides a SolidJS store for storing global data. */
export const AppStoreProvider: Component<{
  children: JSX.Element;
}> = (props) => {
  const [appStore, updateAppStore] = createStore<AppStore>(defaultStore);

  return (
    <AppStoreContext.Provider value={[appStore, updateAppStore]}>
      {props.children}
    </AppStoreContext.Provider>
  );
};

export const useAppStore = (): AppStoreContextValue =>
  useContext(AppStoreContext)!;
