// app/contracts/config.ts
import PrestigeTokenABI from './PrestigeToken.json';
import GameManagerABI from './GameManager.json';

export const prestigeTokenContract = {
  address: '0xC208Fd791086A303e37e9A5d7E2dC6B24E681a68', // <-- TU DIRECCIÓN DE PRESTIGETOKEN
  abi: PrestigeTokenABI.abi,
} as const;

export const gameManagerContract = {
  address: '0x6671c7c52B5Ee08174d432408086E1357ED07246', // <-- TU DIRECCIÓN DE GAMEMANAGER
  abi: GameManagerABI.abi,
} as const;