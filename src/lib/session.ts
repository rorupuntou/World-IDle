import { getIronSession, IronSession, IronSessionData } from "iron-session";
import { cookies } from "next/headers";

export const sessionOptions = {
  cookieName: "world-idle-session",
  password: process.env.SESSION_SECRET as string,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};

export function getSession() {
  return getIronSession<IronSessionData>(cookies(), sessionOptions);
}
