// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {PrestigeToken} from "../src/PrestigeToken.sol";
import {GameManager} from "../src/GameManager.sol";

contract Deploy is Script {
    function run() external returns (PrestigeToken, GameManager) {
        // Carga las variables de entorno desde el archivo .env
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address signerAddress = vm.envAddress("SIGNER_ADDRESS");

        // Inicia la transmisión de transacciones
        vm.startBroadcast(deployerPrivateKey);

        // 1. Desplegar el contrato PrestigeToken
        PrestigeToken token = new PrestigeToken();
        console.log("PrestigeToken desplegado en:", address(token));

        // 2. Desplegar el contrato GameManager, pasándole la dirección del token y del firmante
        GameManager manager = new GameManager(address(token), signerAddress);
        console.log("GameManager desplegado en:", address(manager));

        // 3. Configurar el GameManager como la única dirección autorizada para acuñar (mint) nuevos tokens
        token.setGameManager(address(manager));
        console.log("GameManager establecido como minter en PrestigeToken");

        // Detiene la transmisión
        vm.stopBroadcast();

        return (token, manager);
    }
}