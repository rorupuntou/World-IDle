// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-contracts/contracts/access/Ownable.sol";

/**
 * @title PrestigeToken
 * @dev Un token ERC20 que representa el prestigio ganado en el juego.
 * Solo el contrato GameManager puede acuñar (mint) nuevos tokens.
 */
contract PrestigeToken is ERC20, Ownable {
    address public gameManager;

    constructor() ERC20("Prestige Token", "PRESTIGE") Ownable(msg.sender) {}

    modifier onlyGameManager() {
        require(msg.sender == gameManager, "Solo el GameManager puede llamar a esta funcion");
        _;
    }

    function setGameManager(address _gameManager) public onlyOwner {
        gameManager = _gameManager;
    }

    function mint(address to, uint256 amount) public onlyGameManager {
        _mint(to, amount);
    }
}