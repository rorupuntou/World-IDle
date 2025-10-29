// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {GameManagerV2} from "../src/GameManagerV2.sol";

contract SetSigner is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address gameManagerAddress = vm.envAddress("GAME_MANAGER_V2_ADDRESS");
        address newSignerAddress = vm.envAddress("NEW_SIGNER_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        GameManagerV2 manager = GameManagerV2(gameManagerAddress);
        manager.setSignerAddress(newSignerAddress);

        console.log("Signer address set to:", newSignerAddress);

        vm.stopBroadcast();
    }
}
