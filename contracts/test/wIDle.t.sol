// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/wIDle.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";

contract wIDleTest is Test {
    wIDle public token;
    address public owner;
    address public gameManager;
    address public user;

    function setUp() public {
        owner = address(this);
        gameManager = address(0x1);
        user = address(0x2);

        token = new wIDle();
        token.setGameManager(gameManager);
    }

    function test_InitialState() public {
        assertEq(token.name(), "wIDle");
        assertEq(token.symbol(), "WIDLE");
        assertEq(token.decimals(), 18);
        assertEq(token.cap(), 1_000_000_000 * 10**18);
        assertEq(token.owner(), owner);
    }

    function test_SetGameManager() public {
        address newGameManager = address(0x3);
        token.setGameManager(newGameManager);
        assertEq(token.gameManager(), newGameManager);
    }

    function test_Fail_SetGameManager_NotOwner() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user));
        token.setGameManager(address(0x4));
    }

    function test_Mint_AsGameManager() public {
        vm.prank(gameManager);
        token.mint(user, 100 ether);
        assertEq(token.balanceOf(user), 100 ether);
    }

    function test_Fail_Mint_NotGameManager() public {
        vm.prank(user);
        vm.expectRevert("wIDle: caller is not the game manager");
        token.mint(user, 100 ether);

        vm.prank(owner);
        vm.expectRevert("wIDle: caller is not the game manager");
        token.mint(user, 100 ether);
    }

    function test_Pausable() public {
        vm.prank(gameManager);
        token.mint(owner, 100 ether);

        // Transfers should work when not paused
        token.transfer(user, 50 ether);
        assertEq(token.balanceOf(user), 50 ether);

        // Pause the contract
        token.pause();
        assertTrue(token.paused());

        // Transfers should fail when paused
        vm.expectRevert(Pausable.EnforcedPause.selector);
        token.transfer(user, 10 ether);

        // Unpause the contract
        token.unpause();
        assertFalse(token.paused());

        // Transfers should work again
        token.transfer(user, 10 ether);
        assertEq(token.balanceOf(user), 60 ether);
    }

    function test_Fail_ExceedCap() public {
        uint256 cap = token.cap();
        uint256 amount = 100 ether;

        vm.prank(gameManager);
        token.mint(user, cap - amount);

        vm.prank(gameManager);
        vm.expectRevert(abi.encodeWithSelector(ERC20Capped.ERC20ExceededCap.selector, cap + 1, cap));
        token.mint(user, amount + 1);
    }
}
