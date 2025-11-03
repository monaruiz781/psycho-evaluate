// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title PsychoEvaluate - On-chain Psychological Assessment DApp
/// @notice A privacy-preserving psychological assessment contract using FHEVM
/// @dev All questionnaire answers are encrypted and computed on-chain without revealing user data
contract PsychoEvaluate is ZamaEthereumConfig {
    // Structure to store encrypted assessment results
    struct AssessmentResult {
        euint32 stressScore;      // Encrypted stress score
        euint32 eScore;           // Encrypted extroversion score (E dimension)
        euint32 nScore;           // Encrypted intuition score (N dimension)
        uint256 timestamp;        // Assessment timestamp
        bool exists;              // Whether assessment exists
    }

    // Mapping from user address to their assessment result
    mapping(address => AssessmentResult) private _assessments;

    // Event emitted when a new assessment is submitted
    event AssessmentSubmitted(address indexed user, uint256 timestamp);

    // Additional event for debugging
    event AssessmentComputed(address indexed user);

    /// @notice Submit encrypted questionnaire answers and compute assessment
    /// @param encryptedAnswers Array of encrypted answers (each answer is 1-5 scale)
    /// @param inputProof The input proof for all encrypted answers (same proof for all)
    /// @dev The questionnaire structure:
    ///      - Answers 0-4: Stress assessment questions (weighted)
    ///      - Answers 5-9: Extroversion questions (E dimension)
    ///      - Answers 10-14: Intuition questions (N dimension)
    function submitAssessment(
        externalEuint32[] calldata encryptedAnswers,
        bytes calldata inputProof
    ) external {
        require(encryptedAnswers.length == 15, "Invalid number of answers");

        // Convert external encrypted values to internal euint32
        euint32[15] memory answers;
        for (uint256 i = 0; i < 15; i++) {
            answers[i] = FHE.fromExternal(encryptedAnswers[i], inputProof);
        }

        // Compute stress score: weighted sum of first 5 answers
        // Weights: [3, 2, 3, 2, 1] for questions 0-4
        euint32 stressScore = FHE.add(
            FHE.mul(answers[0], FHE.asEuint32(3)),
            FHE.mul(answers[1], FHE.asEuint32(2))
        );
        stressScore = FHE.add(stressScore, FHE.mul(answers[2], FHE.asEuint32(3)));
        stressScore = FHE.add(stressScore, FHE.mul(answers[3], FHE.asEuint32(2)));
        stressScore = FHE.add(stressScore, answers[4]);

        // Compute extroversion score (E dimension): sum of answers 5-9
        euint32 eScore = answers[5];
        for (uint256 i = 6; i < 10; i++) {
            eScore = FHE.add(eScore, answers[i]);
        }

        // Compute intuition score (N dimension): sum of answers 10-14
        euint32 nScore = answers[10];
        for (uint256 i = 11; i < 15; i++) {
            nScore = FHE.add(nScore, answers[i]);
        }

        // Store assessment result
        _assessments[msg.sender] = AssessmentResult({
            stressScore: stressScore,
            eScore: eScore,
            nScore: nScore,
            timestamp: block.timestamp,
            exists: true
        });

        // Grant ACL permissions for decryption
        FHE.allowThis(stressScore);
        FHE.allow(stressScore, msg.sender);
        FHE.allowThis(eScore);
        FHE.allow(eScore, msg.sender);
        FHE.allowThis(nScore);
        FHE.allow(nScore, msg.sender);

        emit AssessmentSubmitted(msg.sender, block.timestamp);
    }

    /// @notice Get encrypted stress score for the caller
    /// @return The encrypted stress score
    function getStressScore() external view returns (euint32) {
        require(_assessments[msg.sender].exists, "No assessment found");
        return _assessments[msg.sender].stressScore;
    }

    /// @notice Get encrypted extroversion score for the caller
    /// @return The encrypted extroversion score
    function getEScore() external view returns (euint32) {
        require(_assessments[msg.sender].exists, "No assessment found");
        return _assessments[msg.sender].eScore;
    }

    /// @notice Get encrypted intuition score for the caller
    /// @return The encrypted intuition score
    function getNScore() external view returns (euint32) {
        require(_assessments[msg.sender].exists, "No assessment found");
        return _assessments[msg.sender].nScore;
    }

    /// @notice Get all encrypted assessment results for the caller
    /// @return stressScore The encrypted stress score
    /// @return eScore The encrypted extroversion score
    /// @return nScore The encrypted intuition score
    /// @return timestamp The assessment timestamp
    function getAssessment() external view returns (
        euint32 stressScore,
        euint32 eScore,
        euint32 nScore,
        uint256 timestamp
    ) {
        require(_assessments[msg.sender].exists, "No assessment found");
        AssessmentResult memory result = _assessments[msg.sender];
        return (result.stressScore, result.eScore, result.nScore, result.timestamp);
    }

    /// @notice Check if user has submitted an assessment
    /// @param user The user address to check
    /// @return Whether the user has an assessment
    function hasAssessment(address user) external view returns (bool) {
        return _assessments[user].exists;
    }
}

