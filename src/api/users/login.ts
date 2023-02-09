/* eslint-disable import/prefer-default-export */
import { BASE_CORE_API_URL } from "..";

interface LoginData {
  email: string;
  password: string;
}

interface SuccessfulLoginResponse {
  id: string;
  email: string;
  display_name: string;
  jwt: string;
}

interface FailedLoginResponse {
  error: string;
  code: number;
}

type LoginResponse = SuccessfulLoginResponse | FailedLoginResponse;

/** POSTs `data` to the login endpoint. */
export const performLogin = async (data: LoginData): Promise<LoginResponse> => {
  const body = JSON.stringify(data);
  const res = await fetch(`${BASE_CORE_API_URL}/users/login`, {
    method: "POST",
    body,
  });
  return res.json();
};
