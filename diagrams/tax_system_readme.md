# Tax Compliance System Architecture

## Overview

This document describes the architecture of a blockchain-based tax compliance system that enables secure, transparent, and verifiable tax payments using zero-knowledge proofs and smart contracts.

## System Components

### Frontend Layer

The system provides two distinct user interfaces:

#### 1. Tax Payer Portal (User Portal)
- **Upload & Encryption for Invoices**: Secure document submission with end-to-end encryption
- **Wallet Connect**: Integration with cryptocurrency wallets for payment processing
- Users interact with the system through a web application to submit tax documentation and make payments

#### 2. Government Dashboard
- **Compliance Views**: Real-time monitoring of tax compliance status
- **Status Queries**: Search and filter capabilities for taxpayer records
- Provides government officials with oversight and audit capabilities

### API Gateway

Central routing and security layer that handles:
- **Routing**: Directs requests to appropriate backend services
- **Authentication (auth)**: Validates user identity and permissions
- **CORS**: Manages cross-origin resource sharing policies
- Coordinates communication between frontend applications and backend microservices

### Backend Microservices

#### 1. ZK Proof Service
Handles zero-knowledge proof operations for privacy-preserving compliance:
- **Circom/SnarkJS**: Circuit design and proof generation frameworks
- **Proof Generation**: Creates cryptographic proofs without revealing sensitive data
- **Proof Validation**: Verifies submitted proofs for authenticity
- Coordinates with the Blockchain Integration Service for on-chain verification

#### 2. Government Dashboard Service
Backend logic for administrative functions:
- **Compliance Records**: Maintains historical compliance data
- **Permissions**: Role-based access control for government users
- **Audit Trail**: Immutable log of all system activities
- Verifies transaction status through smart contract interaction

#### 3. User Management Service
Handles user authentication and profiles:
- **Hybrid Auth**: Combines traditional OAuth with Web3 wallet authentication (Google OAuth + Wallet)
- **Wallet Assignment**: Links user accounts to blockchain wallet addresses (Google v2)
- **Profiles**: User data storage in PostgreSQL database
- Manages user identity across both Web2 and Web3 paradigms

#### 4. Invoice Management Service
Manages tax invoice storage and processing:
- **Encrypted Uploads**: Secure file upload with encryption at rest
- **IPFS Store**: Decentralized storage for encrypted invoice PDFs
- **MongoDB Metadata**: Stores invoice metadata and references to IPFS files
- Maintains references between database records and distributed file storage

### Blockchain Layer

#### Smart Contracts (MultiversX)
Deployed on the MultiversX blockchain with the following functions:

**TaxComplianceContract**:
- `submit_zk_proof()`: Records zero-knowledge proofs on-chain for verification
- `verify_compliance()`: Checks taxpayer compliance status without exposing private data
- `calculate_tax_owed()`: Computes tax obligations based on submitted proofs
- `pay_taxes()`: Processes tax payments and updates compliance status

#### Blockchain Integration Service
Bridges backend services with the blockchain:
- **MultiversX SDK**: Native integration with MultiversX blockchain
- **Tax Monitoring**: Real-time tracking of on-chain tax transactions
- Executes contract calls and monitors blockchain events

### Data & Storage Layer

#### PostgreSQL Database
Relational database storing:
- **User Profiles**: Account information and authentication data
- **Compliance Records**: Historical compliance status and audit logs

#### IPFS (Encrypted PDFs)
Distributed file system storing:
- Encrypted invoice documents
- Content-addressed storage ensuring data integrity

#### MongoDB
NoSQL database storing:
- **Invoice Metadata**: Structured data about invoices
- **IPFS References**: Links to documents stored on IPFS

## Data Flow

### Tax Payment Flow

1. **Taxpayer Submission**:
   - Tax payer uploads invoice through User Portal
   - Invoice is encrypted and stored in IPFS
   - Metadata is saved to MongoDB

2. **ZK Proof Generation**:
   - System generates zero-knowledge proof of tax liability
   - Proof is validated locally before blockchain submission

3. **Blockchain Recording**:
   - ZK proof is submitted to smart contract via `submit_zk_proof()`
   - Tax payment is processed through `pay_taxes()`
   - Compliance status is updated on-chain

4. **Verification**:
   - Government can verify compliance through dashboard
   - Smart contract's `verify_compliance()` provides status without exposing sensitive data

## Security Features

- **End-to-End Encryption**: All invoice documents are encrypted before storage
- **Zero-Knowledge Proofs**: Privacy-preserving verification of tax compliance
- **Blockchain Immutability**: Tamper-proof record of all transactions
- **Decentralized Storage**: IPFS ensures data availability and integrity
- **Multi-layer Authentication**: Combines OAuth and wallet-based authentication

## Technology Stack

- **Frontend**: Web application with wallet integration
- **Backend**: Microservices architecture
- **Blockchain**: MultiversX with custom smart contracts
- **Cryptography**: Circom/SnarkJS for ZK proofs
- **Storage**: PostgreSQL, MongoDB, IPFS
- **Authentication**: Google OAuth + Web3 Wallet

## Benefits

1. **Privacy**: Zero-knowledge proofs enable compliance verification without exposing sensitive financial data
2. **Transparency**: Blockchain provides an immutable audit trail
3. **Efficiency**: Automated compliance checking reduces manual processing
4. **Security**: Multi-layer encryption and decentralized storage protect taxpayer data
5. **Trust**: Cryptographic verification eliminates need for trusted intermediaries