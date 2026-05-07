// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract InvoiceRegistry {
    event InvoiceAnchored(
        address indexed issuer,
        bytes32 indexed invoiceHash,
        uint256 timestamp,
        string memo
    );
    event ProofAnchored(
        address indexed issuer,
        bytes32 indexed proofHash,
        bytes32 indexed periodHash,
        uint256 timestamp,
        string memo
    );

    mapping(address => mapping(bytes32 => uint256)) public invoiceAnchoredAt;
    mapping(address => mapping(bytes32 => uint256)) public proofAnchoredAt;

    function anchorInvoice(bytes32 invoiceHash, string calldata memo) external {
        require(
            invoiceAnchoredAt[msg.sender][invoiceHash] == 0,
            "InvoiceRegistry: already anchored"
        );
        invoiceAnchoredAt[msg.sender][invoiceHash] = block.timestamp;
        emit InvoiceAnchored(msg.sender, invoiceHash, block.timestamp, memo);
    }

    function isInvoiceAnchored(
        address issuer,
        bytes32 invoiceHash
    ) external view returns (bool anchored, uint256 timestamp) {
        timestamp = invoiceAnchoredAt[issuer][invoiceHash];
        anchored = timestamp != 0;
    }

    function anchorProof(bytes32 proofHash, bytes32 periodHash, string calldata memo) external {
        require(
            proofAnchoredAt[msg.sender][proofHash] == 0,
            "InvoiceRegistry: proof already anchored"
        );
        proofAnchoredAt[msg.sender][proofHash] = block.timestamp;
        emit ProofAnchored(msg.sender, proofHash, periodHash, block.timestamp, memo);
    }

    function isProofAnchored(
        address issuer,
        bytes32 proofHash
    ) external view returns (bool anchored, uint256 timestamp) {
        timestamp = proofAnchoredAt[issuer][proofHash];
        anchored = timestamp != 0;
    }
}
