// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TransactionForwarder
 * @author Gemini
 * @notice This contract acts as a simple forwarder to execute arbitrary calls.
 * It allows wrapping a raw transaction (to, value, data) into a typed contract call
 * that can be processed by systems that require an ABI and function name, like Worldcoin's MiniKit.
 */
contract TransactionForwarder {
    /**
     * @notice Executes a low-level call with the provided parameters.
     * @param to The target address to call.
     * @param value The amount of ETH to send with the call.
     * @param data The calldata to execute.
     * @dev This function is payable to allow forwarding calls that include ETH value.
     * The call is executed in the context of this contract, but the ultimate `msg.sender`
     * for the state changes on the target contract will be this Forwarder contract address.
     * However, since this is called by the user's Smart Wallet, access control on the target
     * contract should check for the Smart Wallet's address if needed.
     */
    function execute(address to, uint256 value, bytes calldata data) external payable {
        (bool success, bytes memory result) = to.call{value: value}(data);
        if (!success) {
            // Forward the revert reason, if any
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }
}
