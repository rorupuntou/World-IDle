import { type NextRequest, NextResponse } from "next/server";
// import { start } from 'workflow/api';
// import { saveGameWorkflow } from '@/app/workflows/save-game';
import { FullGameState } from "@/components/types";

export async function POST(req: NextRequest) {
  const { walletAddress } = await req.json() as { walletAddress?: string, gameData?: FullGameState, lastWidleClaimAt?: string };

  if (!walletAddress) {
    return NextResponse.json({ error: "walletAddress is required." }, { status: 400 });
  }

  // The workflow itself will validate if at least one of gameData or lastWidleClaimAt is present.
  
  // Start the workflow. It will run in the background.
  // await start(saveGameWorkflow, [walletAddress, gameData ?? null, lastWidleClaimAt ?? null]);

  // Return a 202 Accepted response to indicate that the request has been accepted for processing.
  return NextResponse.json({ message: "Save request accepted (workflow disabled)." }, { status: 200 });
}
