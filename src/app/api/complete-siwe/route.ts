import { SiweMessage } from 'siwe';
import { getSession } from '@/lib/session';
import { IronSessionData } from 'iron-session';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { payload } = await req.json();
  const session = await getSession();

  try {
    const siweMessage = new SiweMessage(payload.message);
    const verification = await siweMessage.verify({
      signature: payload.signature,
      nonce: session.nonce, // Comprobar el nonce de la sesión
    });

    if (verification.success) {
      (session as IronSessionData).siwe = verification.data; // Guardar datos del usuario en la sesión
      await session.save();
      return NextResponse.json({ isValid: true, address: verification.data.address });
    }
    return NextResponse.json({ isValid: false }, { status: 401 });
  } catch (error) {
    console.error("SIWE verification error:", error);
    return NextResponse.json({ isValid: false }, { status: 500 });
  }
}
