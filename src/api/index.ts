const CORE_API_SERVER = process.env.CORE_API_SERVER || "http://localhost:3000";

/** Base path to the v1 core API. */
export const BASE_CORE_API_URL = `${CORE_API_SERVER}/api/v1`;

/** Minimal JWT decoder. Does not validate signature. */
export const parseJWT = (jwt: string): unknown => {
  const base64Url = jwt.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    window
      .atob(base64)
      .split("")
      .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
      .join("")
  );

  return JSON.parse(jsonPayload);
};
