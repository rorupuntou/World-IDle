import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SiweMessage } from "siwe";

// Augment the IronSessionData interface to declare the shape of our session data
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

export async function getSession() {
  // The generic is no longer needed here as the type is augmented globally
  return getIronSession(await cookies(), sessionOptions);
}
