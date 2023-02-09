import Cookies from "js-cookie";
import { parseJWT } from "../api";
import { useAppStore } from "../providers/AppStoreProvider";

/** Hook to interact with authentication data within the global app store. */
const useAuth = (): {
  isAuthenticated: () => boolean;
  jwt: () => string | undefined;
  login: (jwt: string) => void;
  logout: (jwt: string) => void;
} => {
  const [appStore, updateAppStore] = useAppStore();

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

  /** Returns whether the user is currently authenticated. */
  const isAuthenticated = () => {
    if (appStore.auth.jwt) {
      return true;
    }

    const jwt = Cookies.get("jwt");
    if (!jwt) {
      return false;
    }

    login(jwt);
    return true;
  };

  const jwt = () => appStore.auth.jwt;

  return { isAuthenticated, jwt, login, logout };
};

export default useAuth;
