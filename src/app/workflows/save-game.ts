import { supabase } from '@/lib/supabaseClient';
import { FullGameState } from "@/components/types";
import { FatalError } from 'workflow';

async function saveGameStep(walletAddress: string, gameData: FullGameState | null, lastWidleClaimAt: string | null) {
  "use step";

  console.log(`Partially updating game state for wallet: ${walletAddress}`);

  const lowercasedAddress = walletAddress.toLowerCase();

  // Extract the referral boost from the gameData object if it exists.
  const permanentReferralBoost = gameData?.gameState?.permanent_referral_boost;

  // The RPC function will handle the logic of merging the JSONB data
  // and conditionally updating the other columns.
  const { error } = await supabase.rpc('update_game_state_partial', {
    p_wallet_address: lowercasedAddress,
    p_game_data_partial: gameData, // Pass the gameData object; SQL function will merge it.
    p_last_widle_claim_at: lastWidleClaimAt,
    p_permanent_referral_boost: permanentReferralBoost
  });

  if (error) {
    console.error("Supabase RPC error in workflow:", error);
    // For a database error, retrying is a good default behavior.
    throw new Error(`Failed to save game data for ${walletAddress} via RPC: ${error.message}`);
  }

  console.log(`Successfully triggered partial update for wallet: ${walletAddress}`);
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
