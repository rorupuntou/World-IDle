import GameManagerV2ABI from './GameManagerV2.json';
import wIDleABI from './wIDle.json';

// Minimal ABI for the Uniswap Universal Router
const universalRouterAbi = [
    {
        "name": "execute",
        "type": "function",
        "stateMutability": "payable",
        "inputs": [
            { "name": "commands", "type": "bytes" },
            { "name": "inputs", "type": "bytes[]" },
        ],
        "outputs": []
    }
] as const;

export const contractConfig = {
  // Core Game Contracts
  gameManagerV2Address: "0x8fB10BfA3E9a868A1BdD6Feb54C092A83C236200" as `0x${string}`,
  wIdleTokenAddress: "0x82446D9E037639a95d61aAd2e716e95BbD0C903e" as `0x${string}`,
  gameManagerV2Abi: GameManagerV2ABI.abi,
  wIdleTokenAbi: wIDleABI.abi,


  // Uniswap Contracts on World Chain
  universalRouterAddress: "0x8ac7bee993bb44dab564ea4bc9ea67bf9eb5e743" as `0x${string}`,
  permit2Address: "0x000000000022D473030F116dDEE9F6B43aC78BA3" as `0x${string}`,
  universalRouterAbi: universalRouterAbi,

  // Network
  worldChainId: 480,
};