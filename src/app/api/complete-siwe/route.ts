import { SiweMessage } from 'siwe';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { payload } = await req.json();
  
  try {
    const siweMessage = new SiweMessage(payload.message);
    const verification = await siweMessage.verify({ signature: payload.signature });

    if (verification.success) {
      return NextResponse.json({ isValid: true, address: verification.data.address });
    }
    return NextResponse.json({ isValid: false }, { status: 401 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ isValid: false }, { status: 500 });
  }
}
