// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "openzeppelin-contracts/contracts/access/Ownable.sol";
import "./PrestigeToken.sol";

/**
 * @title GameManager
 * @dev Contrato que gestiona la lógica de prestigio y acuña recompensas.
 */
contract GameManager is Ownable {
    PrestigeToken public prestigeToken;

    event PrestigeClaimed(address indexed player, uint256 amount);

    constructor(address _tokenAddress) Ownable(msg.sender) {
        prestigeToken = PrestigeToken(_tokenAddress);
    }

    /**
     * @dev Permite a un jugador reiniciar su progreso (prestigio) y acuñar tokens de recompensa.
     * La cantidad de tokens es el 0.001% de los puntos totales ganados.
     */
    function prestige(uint256 totalPointsEarned) public {
        // Calcular la recompensa (0.001% = dividir por 100,000)
        uint256 rewardAmount = totalPointsEarned / 100000;
        require(rewardAmount > 0, "No hay suficiente ganancia para prestigio");

        // Acuñar los nuevos tokens de prestigio al jugador
        prestigeToken.mint(msg.sender, rewardAmount);

        emit PrestigeClaimed(msg.sender, rewardAmount);
    }
}