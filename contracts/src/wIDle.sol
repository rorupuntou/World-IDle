// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title wIDle Token
 * @dev The official ERC20 token for the World Idle game.
 * Features:
 * - A fixed maximum supply (capped at 1 billion tokens).
 * - Pausable transfers in case of emergencies.
 * - Minting is restricted to a designated GameManager contract.
 */
contract wIDle is ERC20, ERC20Capped, ERC20Pausable, Ownable {
    address public gameManager;

    /**
     * @dev Sets up the token with its name, symbol, and max supply.
     * The initial owner is the deployer of the contract.
     */
    constructor()
        ERC20("wIDle", "WIDLE")
        ERC20Capped(1_000_000_000 * 10**decimals())
        Ownable(msg.sender)
    {}

    /**
     * @dev Modifier to ensure that only the designated GameManager can call a function.
     */
    modifier onlyGameManager() {
        require(msg.sender == gameManager, "wIDle: caller is not the game manager");
        _;
    }

    /**
     * @dev Sets or updates the address of the GameManager contract.
     * Can only be called by the owner.
     * @param _gameManager The address of the new GameManager contract.
     */
    function setGameManager(address _gameManager) public onlyOwner {
        gameManager = _gameManager;
    }

    /**
     * @dev Pauses all token transfers.
     * Can only be called by the owner.
     */
    function pause() public onlyOwner {
        _pause();
    }

    /**
     * @dev Resumes token transfers.
     * Can only be called by the owner.
     */
    function unpause() public onlyOwner {
        _unpause();
    }

    /**
     * @dev Creates `amount` tokens and assigns them to `to`.
     * This function is protected and can only be called by the GameManager.
     * It enforces the cap, ensuring the total supply does not exceed the maximum.
     * @param to The address that will receive the minted tokens.
     * @param amount The amount of tokens to mint.
     */
    function mint(address to, uint256 amount) public onlyGameManager {
        _mint(to, amount);
    }

    /**
     * @dev Overrides the internal `_update` function from ERC20 to integrate Pausable functionality.
     * This ensures that token transfers (including minting and burning) are blocked when the contract is paused.
     */
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable, ERC20Capped)
    {
        super._update(from, to, value);
    }
}
