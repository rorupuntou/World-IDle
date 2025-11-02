import { supabase } from '@/lib/supabaseClient';
import { FullGameState } from "@/components/types";
import { FatalError } from 'workflow';

async function saveGameStep(walletAddress: string, gameData: FullGameState | null, lastWidleClaimAt: string | null) {
  "use step";

  console.log(`Saving game state for wallet: ${walletAddress}`);

  const lowercasedAddress = walletAddress.toLowerCase();

  const dataToUpsert: {
    wallet_address: string;
    game_data?: FullGameState;
    last_widle_claim_at?: string;
    permanent_referral_boost?: number;
  } = {
    wallet_address: lowercasedAddress,
  };

  if (gameData) {
    // Extract referral boost and save it to the dedicated column
    if (gameData.gameState && typeof gameData.gameState.permanent_referral_boost === 'number') {
      dataToUpsert.permanent_referral_boost = gameData.gameState.permanent_referral_boost;
      // Remove from gameData to avoid duplication
      delete gameData.gameState.permanent_referral_boost;
    }
    dataToUpsert.game_data = gameData;
  }

  if (lastWidleClaimAt) {
    dataToUpsert.last_widle_claim_at = lastWidleClaimAt;
  }

  // If there's nothing to update besides the address, we can stop.
  if (Object.keys(dataToUpsert).length === 1) {
      console.log(`No new data to save for wallet: ${walletAddress}`);
      return;
  }

  const { error } = await supabase
    .from('game_state')
    .upsert(dataToUpsert, { onConflict: 'wallet_address' });

  if (error) {
    console.error("Supabase save error in workflow:", error);
    // For a database error, retrying is a good default behavior.
    throw new Error(`Failed to save game data for ${walletAddress}: ${error.message}`);
  }

  console.log(`Successfully saved game state for wallet: ${walletAddress}`);
}


export async function saveGameWorkflow(walletAddress: string, gameData: FullGameState | null, lastWidleClaimAt: string | null) {
  "use workflow";

  if (!walletAddress) {
    // Use FatalError because if there's no wallet address, retrying won't help.
    throw new FatalError("walletAddress is required to save game data.");
  }

  if (!gameData && !lastWidleClaimAt) {
    // Also a fatal error.
    throw new FatalError("Either gameData or lastWidleClaimAt must be provided to save.");
  }

  await saveGameStep(walletAddress, gameData, lastWidleClaimAt);

  return { success: true, message: "Game state saved." };
}
