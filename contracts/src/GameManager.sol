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
    address public signerAddress; // La dirección autorizada para firmar recompensas

    // Mapeo para evitar que se reclame la misma recompensa dos veces
    mapping(bytes32 => bool) public usedSignatures;

    event PrestigeClaimed(address indexed player, uint256 amount);

    constructor(address _tokenAddress, address _signerAddress) Ownable(msg.sender) {
        prestigeToken = PrestigeToken(_tokenAddress);
        signerAddress = _signerAddress;
    }

    /**
     * @dev Reclama la recompensa de prestigio.
     * Requiere una firma válida del backend para evitar trampas.
     */
    function claimPrestigeReward(uint256 totalTokensEarned, bytes calldata signature) public {
        // 1. Calcular la recompensa (0.01% = dividir por 10,000)
        uint256 rewardAmount = totalTokensEarned / 10000;
        require(rewardAmount > 0, "No hay suficiente ganancia para prestigio");

        // 2. Validar la firma para asegurar que la petición es legítima
        bytes32 messageHash = getMessageHash(msg.sender, totalTokensEarned);
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);

        require(recoverSigner(ethSignedMessageHash, signature) == signerAddress, "Firma invalida");
        require(!usedSignatures[messageHash], "Recompensa ya reclamada");

        // 3. Marcar la firma como usada y acuñar los tokens
        usedSignatures[messageHash] = true;
        prestigeToken.mint(msg.sender, rewardAmount);

        emit PrestigeClaimed(msg.sender, rewardAmount);
    }

    // --- Lógica de Verificación de Firma (EIP-712) ---

    function getMessageHash(address _player, uint256 _totalTokens) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_player, _totalTokens));
    }

    function getEthSignedMessageHash(bytes32 _messageHash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageHash));
    }

    function recoverSigner(bytes32 _ethSignedMessageHash, bytes memory _signature) internal pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);
        return ecrecover(_ethSignedMessageHash, v, r, s);
    }

    function splitSignature(bytes memory sig) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "Firma invalida");
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }

    // --- Funciones de Administrador ---
    function setSignerAddress(address _newSigner) public onlyOwner {
        signerAddress = _newSigner;
    }
}