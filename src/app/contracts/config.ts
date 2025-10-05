import GameManagerABI from './GameManager.json';
import PrestigeTokenABI from './PrestigeToken.json';

export const contractConfig = {
  gameManagerAddress: "0xd9c2284f69B7A49d69F7de0226E6BB1EDb469b68" as `0x${string}`,
  prestigeTokenAddress: "0x6671c7c52B5Ee08174d432408086E1357ED07246" as `0x${string}`,
  gameManagerAbi: GameManagerABI.abi,
  prestigeTokenAbi: PrestigeTokenABI.abi,
  worldChainId: 480,
};