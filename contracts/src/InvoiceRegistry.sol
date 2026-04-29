// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title InvoiceRegistry
/// @notice Immutable audit trail for TaxChain invoices and ZK compliance proofs.
///
/// Invoices are identified by a SHA-256 hash of their canonical JSON.
/// ZK proofs are identified by the Groth16 proof hash + a period identifier.
/// Both record only the hash — no personal data goes on-chain (GDPR compliant).
contract InvoiceRegistry {
    // ── Events ────────────────────────────────────────────────────────────────

    /// @notice Emitted when an invoice hash is anchored.
    /// @param issuer   Ethereum address that anchored (the entity's wallet).
    /// @param invoiceHash SHA-256 hash of the canonical invoice JSON.
    /// @param timestamp   Block timestamp of anchoring.
    event InvoiceAnchored(
        address indexed issuer,
        bytes32 indexed invoiceHash,
        uint256 timestamp
    );

    /// @notice Emitted when a ZK compliance proof is anchored.
    /// @param issuer     Ethereum address of the entity.
    /// @param proofHash  Hash of the Groth16 proof bytes.
    /// @param periodHash keccak256 of the period string e.g. keccak256("2026-Q1").
    /// @param timestamp  Block timestamp.
    event ProofAnchored(
        address indexed issuer,
        bytes32 indexed proofHash,
        bytes32 indexed periodHash,
        uint256 timestamp
    );

    // ── Storage ───────────────────────────────────────────────────────────────

    /// issuer → invoiceHash → block.timestamp (0 = not anchored)
    mapping(address => mapping(bytes32 => uint256)) public invoiceAnchoredAt;

    /// issuer → proofHash → block.timestamp (0 = not anchored)
    mapping(address => mapping(bytes32 => uint256)) public proofAnchoredAt;

    // ── Invoice anchoring ─────────────────────────────────────────────────────

    /// @notice Anchor an invoice hash on-chain. Reverts if already anchored
    ///         by the same issuer (prevents silent double-anchoring).
    function anchorInvoice(bytes32 invoiceHash) external {
        require(
            invoiceAnchoredAt[msg.sender][invoiceHash] == 0,
            "InvoiceRegistry: already anchored"
        );
        invoiceAnchoredAt[msg.sender][invoiceHash] = block.timestamp;
        emit InvoiceAnchored(msg.sender, invoiceHash, block.timestamp);
    }

    /// @notice Check whether an invoice was anchored and when.
    /// @return anchored  true if the hash is on-chain for this issuer.
    /// @return timestamp Block timestamp of anchoring, 0 if not anchored.
    function isInvoiceAnchored(
        address issuer,
        bytes32 invoiceHash
    ) external view returns (bool anchored, uint256 timestamp) {
        timestamp = invoiceAnchoredAt[issuer][invoiceHash];
        anchored = timestamp != 0;
    }

    // ── ZK proof anchoring ────────────────────────────────────────────────────

    /// @notice Anchor a ZK compliance proof hash on-chain.
    /// @param proofHash  Hash of the serialised Groth16 proof.
    /// @param periodHash keccak256 of the period identifier ("2026-Q1", etc.).
    function anchorProof(bytes32 proofHash, bytes32 periodHash) external {
        require(
            proofAnchoredAt[msg.sender][proofHash] == 0,
            "InvoiceRegistry: proof already anchored"
        );
        proofAnchoredAt[msg.sender][proofHash] = block.timestamp;
        emit ProofAnchored(msg.sender, proofHash, periodHash, block.timestamp);
    }

    /// @notice Check whether a ZK proof was anchored and when.
    function isProofAnchored(
        address issuer,
        bytes32 proofHash
    ) external view returns (bool anchored, uint256 timestamp) {
        timestamp = proofAnchoredAt[issuer][proofHash];
        anchored = timestamp != 0;
    }
}
