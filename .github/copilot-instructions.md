# World IDle Development Guide for AI Agents

This guide provides instructions for developing and deploying the World IDle game, a Web3 application that uses World ID for authentication.

## Project Overview

The project is a monorepo-like structure with two main parts:
1.  **Frontend:** A Next.js application in the `src` directory. It handles the game's UI and client-side logic.
2.  **Smart Contracts:** Solidity contracts in the `contracts` directory, managed with Foundry.

## Frontend (`src` directory)

The frontend is built with Next.js, React, and TypeScript.

### Key Technologies & Patterns

-   **Framework:** Next.js with Turbopack (`npm run dev`).
-   **State Management:** Primarily uses React hooks (`useState`, `useEffect`, `useCallback`, `useMemo`) within the main `src/components/Game.tsx` component. There is no external state management library like Redux or Zustand.
-   **Game Logic:** The core game logic is centralized in `src/components/Game.tsx`. This component manages game state, calculations (like CPS), and user interactions.
-   **Data Persistence:** Game state is saved to local storage via the `useGameSave.ts` custom hook. This hook encapsulates the logic for loading and saving progress.
-   **Styling:** Tailwind CSS is used for styling. Utility classes are applied directly in the JSX.
-   **Web3 Integration:**
    -   **World ID:** `@worldcoin/idkit` and `@worldcoin/minikit-js` are used for user verification. The verification status unlocks game boosts.
    -   **Smart Contracts:** `ethers` is used to interact with the deployed contracts. Configuration, including contract addresses and ABIs, is located in `src/app/contracts/`. The ABIs are stored as JSON files (`GameManager.json`, `PrestigeToken.json`).

### Developer Workflow

1.  **Installation:**
    ```bash
    npm install
    ```
2.  **Running the dev server:**
    ```bash
    npm run dev
    ```
    The app will be available at `http://localhost:3000`.

### Important Files

-   `src/app/page.tsx`: Main entry point of the application.
-   `src/components/Game.tsx`: The "god component" containing most of the game's state and logic.
-   `src/components/useGameSave.ts`: Custom hook for saving and loading game data from local storage.
-   `src/app/contracts/config.ts`: Exports contract ABIs and addresses for use in the frontend.
-   `src/app/data.ts`: Contains initial game data like upgrades, achievements, and news ticker items.

## Smart Contracts (`contracts` directory)

The smart contracts are written in Solidity and managed using the Foundry framework.

### Key Contracts

-   `contracts/src/GameManager.sol`: Manages core game logic, such as minting prestige tokens.
-   `contracts/src/PrestigeToken.sol`: An ERC20 token for in-game prestige rewards.

### Developer Workflow

1.  **Installation:** Navigate to the contracts directory and install dependencies.
    ```bash
    cd contracts && forge install
    ```
2.  **Compiling:**
    ```bash
    forge build
    ```
3.  **Testing:**
    ```bash
    forge test
    ```
4.  **Deployment:** The `script/Deploy.s.sol` script handles deployment. It requires environment variables for the private key and RPC URL.

## Cross-Component Communication

-   The frontend interacts with the smart contracts after deployment.
-   When contracts are deployed, their addresses must be updated in `src/app/contracts/config.ts`.
-   The contract ABIs (`*.json` files) in `src/app/contracts/` must be updated if the contract interface changes. This is a manual process.
-   The `GameManager` contract is responsible for minting `PrestigeToken`s to the player's wallet address. The frontend calls the `prestige` function on `GameManager` to initiate this.
