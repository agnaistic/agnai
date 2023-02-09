import Cookies from "js-cookie";
import { parseJWT } from "../api";
import { useAppStore } from "../providers/AppStoreProvider";

/** Hook to interact with authentication data within the global app store. */
const useAuth = (): {
  isAuthenticated: () => boolean;
  login: (jwt: string) => void;
  logout: (jwt: string) => void;
} => {
  const [appStore, updateAppStore] = useAppStore();

  /** Returns whether the user is currently authenticated. */
  const isAuthenticated = () => appStore.auth.jwt !== undefined;

  /**
   * Logs the user in by saving the JWT to the store and cookie jar, and saves a
   * decoded version of the JWT for use elsewhere.
   */
  const login = (jwt: string) => {
    updateAppStore("auth", { jwt, user: parseJWT(jwt) });
    Cookies.set("jwt", jwt, {
      sameSite: "strict",
      expires: 7,
    });
  };

  /**
   * Logs the user out by clearing out the authentication cookie and deleting
   * the JWT from the store.
   */
  const logout = () => {
    updateAppStore("auth", { jwt: undefined, user: undefined });
    Cookies.remove("jwt");
  };

  return { isAuthenticated, login, logout };
};

export default useAuth;
