import GameManagerABI from './GameManager.json';
import PrestigeTokenABI from './PrestigeToken.json';
import TransactionForwarderABI from './TransactionForwarder.json';

export const contractConfig = {
  gameManagerAddress: "0xd9c2284f69B7A49d69F7de0226E6BB1EDb469b68" as `0x${string}`,
  prestigeTokenAddress: "0x6671c7c52B5Ee08174d432408086E1357ED07246" as `0x${string}`,
  transactionForwarderAddress: "0x5f85154e3eB863586CD37cB3Ac959fb58F4E2244" as `0x${string}`,
  gameManagerAbi: GameManagerABI.abi,
  prestigeTokenAbi: PrestigeTokenABI.abi,
  transactionForwarderAbi: TransactionForwarderABI.abi,
  worldChainId: 480,
};