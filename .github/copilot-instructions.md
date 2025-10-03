# World IDle Development Guide

This guide provides instructions for developing and deploying the World IDle game, a Web3 application that uses World ID for authentication.

## Project Overview

The project consists of two main parts:
1.  **Frontend:** A Next.js application located in the `src` directory.
2.  **Smart Contracts:** Solidity contracts located in the `contracts` directory.

## Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/)
-   [Foundry](https://getfoundry.sh/)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/rorupontou/world-idle.git
    ```
2.  Install the dependencies for the frontend:
    ```bash
    npm install
    ```
3.  Install the dependencies for the smart contracts:
    ```bash
    cd contracts && forge install
    ```

### Running the Development Server

To run the frontend development server, use the following command:
```bash
npm run dev
```

## Smart Contracts

The smart contracts are managed using Foundry. Key contracts include:
-   `GameManager.sol`: Manages the core game logic.
-   `PrestigeToken.sol`: An ERC20 token used for in-game rewards.

### Compiling and Testing

-   **Compile:** `forge build`
-   **Test:** `forge test`

### Deployment

The contracts can be deployed using the `Deploy.s.sol` script. Make sure to set the required environment variables before running the deployment command.

## Frontend

The frontend is built with Next.js and uses the following technologies:
-   **Framework:** React
-   **Styling:** Tailwind CSS
-   **Web3 Integration:** `@worldcoin/idkit`

### Key Components

-   `src/app/page.tsx`: The main entry point of the application.
-   `src/components/Game.tsx`: Contains the core game interface and logic.
-   `src/app/contracts/config.ts`: Configuration for the smart contracts, including addresses and ABIs.
