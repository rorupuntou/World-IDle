// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {GameManagerV2} from "../src/GameManagerV2.sol";
import {wIDle} from "../src/wIDle.sol";

contract DeployV2 is Script {
    function run() external returns (GameManagerV2) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address wIDleTokenAddress = 0x82446D9E037639a95d61aAd2e716e95BbD0C903e;
        address signerAddress = vm.envAddress("NEW_SIGNER_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy GameManagerV2
        GameManagerV2 manager = new GameManagerV2(wIDleTokenAddress, signerAddress);
        console.log("GameManagerV2 deployed to:", address(manager));

        // Set the new GameManagerV2 as the manager on the wIDle token contract
        wIDle(wIDleTokenAddress).setGameManager(address(manager));
        console.log("GameManagerV2 set as game manager on wIDle token");

        vm.stopBroadcast();

        return manager;
    }
}