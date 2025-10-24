// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/wIDle.sol";
import "../src/GameManagerV2.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract GameManagerV2Test is Test {
    wIDle public token;
    GameManagerV2 public gameManager;

    address public owner;
    address public player;
    uint256 public signerPrivateKey;
    address public signerAddress;

    function setUp() public {
        owner = address(this);
        player = vm.addr(0x1337);

        // 1. Create a wallet for the backend signer
        signerPrivateKey = 0xABCD;
        signerAddress = vm.addr(signerPrivateKey);

        // 2. Deploy contracts
        token = new wIDle();
        gameManager = new GameManagerV2(address(token), signerAddress);

        // 3. Grant minting rights to the GameManager
        token.setGameManager(address(gameManager));
    }

    function test_SuccessfulPrestige() public {
        uint256 amount = 100 ether;
        uint256 nonce = 1;

        // Simulate backend signing
        bytes32 messageHash = keccak256(abi.encodePacked(player, amount, nonce));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encode(r, s, v);

        // Player calls prestige with the valid signature
        vm.prank(player);
        gameManager.prestige(amount, nonce, signature);

        assertEq(token.balanceOf(player), amount, "Player should receive tokens");
        assertTrue(gameManager.usedNonces(nonce), "Nonce should be marked as used");
        assertEq(gameManager.lastPrestigeTimestamp(player), block.timestamp, "Cooldown timestamp should be updated");
    }

    function test_Fail_InvalidSignature() public {
        uint256 amount = 100 ether;
        uint256 nonce = 1;

        // Sign with a wrong key
        uint256 wrongPrivateKey = 0xDCBA;
        bytes32 messageHash = keccak256(abi.encodePacked(player, amount, nonce));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encode(r, s, v);

        vm.prank(player);
        vm.expectRevert("GameManagerV2: Invalid signature");
        gameManager.prestige(amount, nonce, signature);
    }

    function test_Fail_ReplayAttack() public {
        uint256 amount = 100 ether;
        uint256 nonce = 1;

        bytes32 messageHash = keccak256(abi.encodePacked(player, amount, nonce));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encode(r, s, v);

        // First call is successful
        vm.prank(player);
        gameManager.prestige(amount, nonce, signature);

        // Advance time past the cooldown to specifically test the nonce failure
        uint256 cooldown = gameManager.cooldownPeriod();
        vm.warp(block.timestamp + cooldown + 1);

        // Second call with the same nonce should fail
        vm.prank(player);
        vm.expectRevert("GameManagerV2: Nonce already used");
        gameManager.prestige(amount, nonce, signature);
    }

    function test_Cooldown() public {
        uint256 amount = 100 ether;
        uint256 nonce1 = 1;
        uint256 nonce2 = 2;

        // --- First prestige call (successful) ---
        bytes32 hash1 = keccak256(abi.encodePacked(player, amount, nonce1));
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(signerPrivateKey, keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash1)));
        bytes memory sig1 = abi.encode(r1, s1, v1);
        vm.prank(player);
        gameManager.prestige(amount, nonce1, sig1);

        // --- Second prestige call (should fail due to cooldown) ---
        bytes32 hash2 = keccak256(abi.encodePacked(player, amount, nonce2));
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(signerPrivateKey, keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash2)));
        bytes memory sig2 = abi.encode(r2, s2, v2);
        vm.prank(player);
        vm.expectRevert("GameManagerV2: Cooldown active");
        gameManager.prestige(amount, nonce2, sig2);

        // --- Advance time past the cooldown ---
        uint256 cooldown = gameManager.cooldownPeriod();
        vm.warp(block.timestamp + cooldown + 1);

        // --- Third prestige call (should now succeed) ---
        vm.prank(player);
        gameManager.prestige(amount, nonce2, sig2);
        assertEq(token.balanceOf(player), 2 * amount);
    }

     function test_AdminFunctions() public {
        // Test setSignerAddress
        address newSigner = vm.addr(0x42);
        gameManager.setSignerAddress(newSigner);
        assertEq(gameManager.signerAddress(), newSigner);

        // Test setCooldownPeriod
        uint256 newCooldown = 12 hours;
        gameManager.setCooldownPeriod(newCooldown);
        assertEq(gameManager.cooldownPeriod(), newCooldown);

        // Test Pausable
        gameManager.pause();
        vm.prank(player);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        gameManager.prestige(1, 1, "");
        gameManager.unpause();
    }
}
