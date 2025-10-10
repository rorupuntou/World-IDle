// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {TransactionForwarder} from "../src/Forwarder.sol";

contract DeployForwarder is Script {
    function run() external returns (TransactionForwarder) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        TransactionForwarder forwarder = new TransactionForwarder();
        vm.stopBroadcast();
        console.log("TransactionForwarder deployed at:", address(forwarder));
        return forwarder;
    }
}
