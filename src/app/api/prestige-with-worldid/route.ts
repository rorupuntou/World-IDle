import { NextResponse, type NextRequest } from 'next/server';
import { verifyCloudProof, IVerifyResponse, ISuccessResult } from '@worldcoin/minikit-js';

const APP_ID = (process.env.NEXT_PUBLIC_WLD_APP_ID || 'app_3b83f308b9f7ef9a01e4042f1f48721d') as `app_${string}`;

interface IRequestPayload {
    payload: ISuccessResult;
    action: string;
    signal: string | undefined;
}

export async function POST(req: NextRequest) {
    const { payload, action, signal } = (await req.json()) as IRequestPayload;

    const verifyRes = (await verifyCloudProof(payload, APP_ID, action, signal)) as IVerifyResponse;

    if (verifyRes.success) {
        // Proof is valid
        return NextResponse.json({ success: true }, { status: 200 });
    } else {
        // Proof is invalid or already used
        console.warn('World ID verification failed:', verifyRes);
        return NextResponse.json(verifyRes, { status: 400 });
    }
}