// TODO(11b): This needs to come from some environment variable that Parcel will
// expose to us.
export const BASE_API_URL = "http://localhost:3001/api/v1";

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
