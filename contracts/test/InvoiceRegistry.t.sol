// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {InvoiceRegistry} from "../src/InvoiceRegistry.sol";

contract InvoiceRegistryTest is Test {
    InvoiceRegistry public registry;

    address internal alice = makeAddr("alice");
    address internal bob   = makeAddr("bob");

    bytes32 internal constant INVOICE_HASH =
        keccak256(abi.encodePacked("invoice-001-canonical-json"));
    bytes32 internal constant INVOICE_HASH_2 =
        keccak256(abi.encodePacked("invoice-002-canonical-json"));
    bytes32 internal constant PROOF_HASH =
        keccak256(abi.encodePacked("groth16-proof-bytes"));
    bytes32 internal constant PERIOD_HASH =
        keccak256(abi.encodePacked("2026-Q1"));

    string internal constant MEMO_SENT = "TaxChain | FC-2025-001 | Trimisa | 2026-05-07";
    string internal constant MEMO_PAID = "TaxChain | FC-2025-001 | Platita | 2026-05-07";
    string internal constant MEMO_PROOF = "TaxChain | ZK Proof | entity-uuid | 2026-01-01 - 2026-03-31";

    function setUp() public {
        registry = new InvoiceRegistry();
    }

    // ── anchorInvoice ─────────────────────────────────────────────────────────

    function test_anchorInvoice_emitsEvent() public {
        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit InvoiceRegistry.InvoiceAnchored(alice, INVOICE_HASH, block.timestamp, MEMO_SENT);
        registry.anchorInvoice(INVOICE_HASH, MEMO_SENT);
    }

    function test_anchorInvoice_storesTimestamp() public {
        uint256 t = 1_700_000_000;
        vm.warp(t);
        vm.prank(alice);
        registry.anchorInvoice(INVOICE_HASH, MEMO_SENT);

        (bool anchored, uint256 ts) = registry.isInvoiceAnchored(alice, INVOICE_HASH);
        assertTrue(anchored);
        assertEq(ts, t);
    }

    function test_anchorInvoice_revertsOnDuplicate() public {
        vm.startPrank(alice);
        registry.anchorInvoice(INVOICE_HASH, MEMO_SENT);
        vm.expectRevert("InvoiceRegistry: already anchored");
        registry.anchorInvoice(INVOICE_HASH, MEMO_SENT);
        vm.stopPrank();
    }

    function test_anchorInvoice_differentIssuers_sameHash() public {
        // Same invoice hash anchored by different addresses — both succeed
        vm.prank(alice);
        registry.anchorInvoice(INVOICE_HASH, MEMO_SENT);

        vm.prank(bob);
        registry.anchorInvoice(INVOICE_HASH, MEMO_SENT);

        (bool aliceAnchored,) = registry.isInvoiceAnchored(alice, INVOICE_HASH);
        (bool bobAnchored,)   = registry.isInvoiceAnchored(bob, INVOICE_HASH);
        assertTrue(aliceAnchored);
        assertTrue(bobAnchored);
    }

    function test_anchorInvoice_notAnchoredForOtherIssuer() public {
        vm.prank(alice);
        registry.anchorInvoice(INVOICE_HASH, MEMO_SENT);

        (bool anchored,) = registry.isInvoiceAnchored(bob, INVOICE_HASH);
        assertFalse(anchored);
    }

    function test_anchorInvoice_multipleInvoices() public {
        vm.startPrank(alice);
        registry.anchorInvoice(INVOICE_HASH, MEMO_SENT);
        registry.anchorInvoice(INVOICE_HASH_2, MEMO_PAID);
        vm.stopPrank();

        (bool a1,) = registry.isInvoiceAnchored(alice, INVOICE_HASH);
        (bool a2,) = registry.isInvoiceAnchored(alice, INVOICE_HASH_2);
        assertTrue(a1);
        assertTrue(a2);
    }

    // ── isInvoiceAnchored ─────────────────────────────────────────────────────

    function test_isInvoiceAnchored_returnsFalseWhenNotAnchored() public view {
        (bool anchored, uint256 ts) = registry.isInvoiceAnchored(alice, INVOICE_HASH);
        assertFalse(anchored);
        assertEq(ts, 0);
    }

    // ── anchorProof ───────────────────────────────────────────────────────────

    function test_anchorProof_emitsEvent() public {
        vm.prank(alice);
        vm.expectEmit(true, true, true, true);
        emit InvoiceRegistry.ProofAnchored(alice, PROOF_HASH, PERIOD_HASH, block.timestamp, MEMO_PROOF);
        registry.anchorProof(PROOF_HASH, PERIOD_HASH, MEMO_PROOF);
    }

    function test_anchorProof_storesTimestamp() public {
        uint256 t = 1_700_000_000;
        vm.warp(t);
        vm.prank(alice);
        registry.anchorProof(PROOF_HASH, PERIOD_HASH, MEMO_PROOF);

        (bool anchored, uint256 ts) = registry.isProofAnchored(alice, PROOF_HASH);
        assertTrue(anchored);
        assertEq(ts, t);
    }

    function test_anchorProof_revertsOnDuplicate() public {
        vm.startPrank(alice);
        registry.anchorProof(PROOF_HASH, PERIOD_HASH, MEMO_PROOF);
        vm.expectRevert("InvoiceRegistry: proof already anchored");
        registry.anchorProof(PROOF_HASH, PERIOD_HASH, MEMO_PROOF);
        vm.stopPrank();
    }

    function test_anchorProof_differentIssuers_sameProofHash() public {
        vm.prank(alice);
        registry.anchorProof(PROOF_HASH, PERIOD_HASH, MEMO_PROOF);

        vm.prank(bob);
        registry.anchorProof(PROOF_HASH, PERIOD_HASH, MEMO_PROOF);

        (bool a,) = registry.isProofAnchored(alice, PROOF_HASH);
        (bool b,) = registry.isProofAnchored(bob, PROOF_HASH);
        assertTrue(a);
        assertTrue(b);
    }

    // ── isProofAnchored ───────────────────────────────────────────────────────

    function test_isProofAnchored_returnsFalseWhenNotAnchored() public view {
        (bool anchored, uint256 ts) = registry.isProofAnchored(alice, PROOF_HASH);
        assertFalse(anchored);
        assertEq(ts, 0);
    }

    // ── Fuzz ──────────────────────────────────────────────────────────────────

    function testFuzz_anchorInvoice_anyHash(bytes32 h, string calldata memo) public {
        vm.prank(alice);
        registry.anchorInvoice(h, memo);
        (bool anchored,) = registry.isInvoiceAnchored(alice, h);
        assertTrue(anchored);
    }

    function testFuzz_anchorProof_anyHashes(bytes32 pH, bytes32 perH, string calldata memo) public {
        vm.prank(alice);
        registry.anchorProof(pH, perH, memo);
        (bool anchored,) = registry.isProofAnchored(alice, pH);
        assertTrue(anchored);
    }
}
