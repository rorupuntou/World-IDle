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
  gameManagerV2Address: "0x09da5250415c08F2eC8191C5b8f05Cf8c25C138d" as `0x${string}`,
  wIdleTokenAddress: "0x2B258e86Baa288e872414dEe4fe65629526f3cEC" as `0x${string}`,
  gameManagerV2Abi: GameManagerV2ABI.abi,
  wIdleTokenAbi: wIDleABI.abi,

  // Old Contracts for reference
  gameManagerAddress: "0xd9c2284f69B7A49d69F7de0226E6BB1EDb469b68" as `0x${string}`,
  prestigeTokenAddress: "0x6671c7c52B5Ee08174d432408086E1357ED07246" as `0x${string}`,

  // Uniswap Contracts on World Chain
  universalRouterAddress: "0x8ac7bee993bb44dab564ea4bc9ea67bf9eb5e743" as `0x${string}`,
  permit2Address: "0x000000000022D473030F116dDEE9F6B43aC78BA3" as `0x${string}`,
  universalRouterAbi: universalRouterAbi,

  // Network
  worldChainId: 480,
};