import { getIronSession, IronSessionData } from "iron-session";
import { cookies } from "next/headers";
import { SiweMessage } from "siwe";

// Use module augmentation to declare the shape of the session data
declare module "iron-session" {
  interface IronSessionData {
    nonce?: string;
    siwe?: SiweMessage;
  }
}

export const sessionOptions = {
  cookieName: "world-idle-session",
  password: process.env.SESSION_SECRET as string,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};

export function getSession() {
  return getIronSession(cookies(), sessionOptions);
}
