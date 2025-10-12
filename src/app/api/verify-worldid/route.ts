import { NextRequest, NextResponse } from 'next/server';
import { verifyCloudProof, ISuccessResult } from '@worldcoin/minikit-js';

interface IRequestPayload {
    proof: ISuccessResult;
    signal: string;
    action: string;
}

export async function POST(req: NextRequest) {
    const { proof, signal, action } = (await req.json()) as IRequestPayload;

    const app_id = 'app_3b83f308b9f7ef9a01e4042f1f48721d';

    try {
        const verifyRes = await verifyCloudProof(proof, app_id, action, signal);

        if (verifyRes.success) {
            return NextResponse.json({ success: true }, { status: 200 });
        } else {
            console.error("Verification failed:", verifyRes);
            const detail = (verifyRes as { detail?: string }).detail || 'Verification failed.';
            return NextResponse.json({ success: false, detail }, { status: 400 });
        }
    } catch (error) {
        console.error("Error verifying proof:", error);
        const detail = (error instanceof Error) ? error.message : 'An unknown error occurred during proof verification.';
        return NextResponse.json({ success: false, detail }, { status: 500 });
    }
}
