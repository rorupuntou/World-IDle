// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {GameManagerV2} from "../src/GameManagerV2.sol";
import {wIDle} from "../src/wIDle.sol";

contract DeployEverything is Script {
    function run() external returns (wIDle, GameManagerV2) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address signerAddress = vm.envAddress("NEW_SIGNER_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy a new wIDle token
        wIDle newWIdleToken = new wIDle(); // Corrected: No constructor arguments
        console.log("New wIDle token deployed to:", address(newWIdleToken));

        // 2. Deploy a new GameManagerV2, linking it to the new wIDle token
        GameManagerV2 newManager = new GameManagerV2(address(newWIdleToken), signerAddress);
        console.log("New GameManagerV2 deployed to:", address(newManager));

        // 3. Set the new GameManagerV2 as the manager on the new wIDle token
        newWIdleToken.setGameManager(address(newManager));
        console.log("New GameManagerV2 set as game manager on the new wIDle token");

        vm.stopBroadcast();

        return (newWIdleToken, newManager);
    }
}