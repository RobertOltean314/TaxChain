export const INVOICE_REGISTRY_ADDRESS = (
  import.meta.env.VITE_INVOICE_REGISTRY_ADDRESS ??
  "0x5689C9BF6A5d5d4B64628816b0d58d16BC9AF8B4"
) as `0x${string}`;

export const INVOICE_REGISTRY_ABI = [
  {
    name: "anchorProof",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "proofHash", type: "bytes32" },
      { name: "periodHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "anchorInvoice",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "invoiceHash", type: "bytes32" }],
    outputs: [],
  },
] as const;
