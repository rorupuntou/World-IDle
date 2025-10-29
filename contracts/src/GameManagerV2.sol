// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../src/wIDle.sol"; // Assuming wIDle.sol is in the same directory

/**
 * @title GameManagerV2
 * @dev Manages the core game logic for prestiging and minting rewards securely.
 * Features:
 * - Secure prestige mechanism using backend signatures to prevent client-side manipulation.
 * - A cooldown period to prevent abuse and balance the game economy.
 * - Pausable functionality for emergency stops.
 */
contract GameManagerV2 is Ownable, Pausable {
    wIDle public wIDleToken;
    address public signerAddress;
    uint256 public cooldownPeriod;

    mapping(address => uint256) public lastClaimTimestamp;
    mapping(uint256 => bool) public usedNonces;

    event WIdleClaimed(address indexed player, uint256 amount);

    /**
     * @dev Sets up the GameManager with necessary addresses and initial values.
     * @param _wIDleTokenAddress The address of the wIDle token contract.
     * @param _initialSignerAddress The public address of the backend key used for signing.
     */
    constructor(address _wIDleTokenAddress, address _initialSignerAddress) Ownable(msg.sender) {
        wIDleToken = wIDle(_wIDleTokenAddress);
        signerAddress = _initialSignerAddress;
        cooldownPeriod = 8 hours; // Default cooldown set to 8 hours
    }

    /**
     * @dev Allows a player to claim their wIDle rewards after a successful game reset.
     * The call must be accompanied by a valid signature from the backend.
     * @param amount The amount of wIDle tokens to be minted, validated by the backend.
     * @param nonce A unique number to prevent replay attacks.
     * @param signature The cryptographic signature from the backend.
     */
    function claimWIdle(uint256 amount, uint256 nonce, bytes memory signature) public whenNotPaused {
        // 1. Cooldown Check
        if (lastClaimTimestamp[msg.sender] != 0) {
            require(block.timestamp >= lastClaimTimestamp[msg.sender] + cooldownPeriod, "GameManagerV2: Cooldown active");
        }

        // 2. Nonce Check
        require(!usedNonces[nonce], "GameManagerV2: Nonce already used");

        // 3. Signature Verification
        address recoveredSigner = _verifySignature(amount, nonce, signature);
        require(recoveredSigner == signerAddress, "GameManagerV2: Invalid signature");

        // 4. Mark nonce as used
        usedNonces[nonce] = true;

        // 5. Update cooldown timestamp
        lastClaimTimestamp[msg.sender] = block.timestamp;

        // 6. Mint new tokens
        wIDleToken.mint(msg.sender, amount);

        emit WIdleClaimed(msg.sender, amount);
    }

    /**
     * @dev Internal function to verify the signature provided by the user.
     * @return The address of the signer.
     */
    function _verifySignature(uint256 amount, uint256 nonce, bytes memory signature) private view returns (address) {
        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, amount, nonce));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (bytes32 r, bytes32 s, uint8 v) = abi.decode(signature, (bytes32, bytes32, uint8));
        return ecrecover(ethSignedMessageHash, v, r, s);
    }

    // --- Admin Functions ---

    /**
     * @dev Updates the signer address.
     * Can only be called by the owner.
     */
    function setSignerAddress(address _newSigner) public onlyOwner {
        signerAddress = _newSigner;
    }

    /**
     * @dev Updates the cooldown period.
     * @param _newCooldown The new cooldown duration in seconds.
     */
    function setCooldownPeriod(uint256 _newCooldown) public onlyOwner {
        cooldownPeriod = _newCooldown;
    }

    /**
     * @dev Pauses the prestige functionality.
     */
    function pause() public onlyOwner {
        _pause();
    }

    /**
     * @dev Resumes the prestige functionality.
     */
    function unpause() public onlyOwner {
        _unpause();
    }
}
