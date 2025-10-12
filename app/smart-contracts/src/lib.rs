multiversx_sc::imports!();

/// Tax compliance smart contract for TaxChain system
/// Handles tax debt registration, payment processing, and compliance checking
#[multiversx_sc::contract]
pub trait TaxComplianceContract {
    #[init]
    fn init(&self) {}

    // Storage

    /// Maps taxpayer address to their registered tax debts
    #[storage_mapper("tax_debts")]
    fn tax_debts(&self) -> SingleValueMapper<ManagedAddress>;

    /// Maps taxpayer address to their payment history
    #[storage_mapper("payment_history")]
    fn payment_history(&self) -> UnorderedSetMapper<ManagedAddress>;

    /// Government/tax authority address (only they can register debts)
    #[storage_mapper("tax_authority")]
    fn tax_authority(&self) -> SingleValueMapper<ManagedAddress>;

    // Data structures

    /// Represents different types of taxes that can be paid
    #[type_abi]
    #[derive(TopEncode, TopDecode, PartialEq, Eq, Clone)]
    pub enum TaxType {
        ProfitTax,          // 10% profit tax for our MVP
        VAT,                // Future extensibility
        IncomeTax,          // Future extensibility
        Other(ManagedBuffer), // Custom tax types
    }

    /// Represents a payment (debt or completed payment)
    #[type_abi]
    #[derive(TopEncode, TopDecode, PartialEq, Eq, Clone)]
    pub struct TaxPayment<M: ManagedTypeApi> {
        pub taxpayer: ManagedAddress<M>,
        pub tax_type: TaxType,
        pub amount: BigUint<M>,
        pub status: PaymentStatus,
        pub deadline: u64,           // Timestamp
        pub zk_proof_hash: Option<ManagedBuffer<M>>, // Hash of the ZK proof
        pub payment_hash: Option<ManagedBuffer<M>>,  // Transaction hash when paid
    }

    /// Payment status enumeration
    #[type_abi]
    #[derive(TopEncode, TopDecode, PartialEq, Eq, Clone)]
    pub enum PaymentStatus {
        Pending,    // Debt registered but not paid
        Paid,       // Payment completed
        Overdue,    // Past deadline
        Cancelled,  // Debt cancelled by authority
    }

    // Phase 1: Tax Debt Registration

    /// Register a tax debt for a taxpayer (only tax authority can call)
    /// This is called after ZK proof verification in the backend
    #[endpoint(registerTaxDebt)]
    fn register_tax_debt(
        &self,
        taxpayer: &ManagedAddress,
        tax_type: TaxType,
        amount: &BigUint,
        deadline: u64,
        zk_proof_hash: ManagedBuffer,
    ) {
        // Only tax authority can register debts
        let caller = self.blockchain().get_caller();
        require!(
            caller == self.tax_authority().get(),
            "Only tax authority can register debts"
        );

        // Create new tax payment record
        let payment = TaxPayment {
            taxpayer: taxpayer.clone(),
            tax_type,
            amount: amount.clone(),
            status: PaymentStatus::Pending,
            deadline,
            zk_proof_hash: Some(zk_proof_hash),
            payment_hash: None,
        };

        // Store the debt
        // TODO: Implement proper storage mapping for multiple debts per user
        self.tax_debts().set(taxpayer);
        
        // Emit event
        self.tax_debt_registered_event(taxpayer, &amount, &payment.tax_type);
    }

    /// Set the tax authority address (only owner can call during setup)
    #[only_owner]
    #[endpoint(setTaxAuthority)]
    fn set_tax_authority(&self, authority: &ManagedAddress) {
        self.tax_authority().set(authority);
    }

    // Phase 2: Payment Processing (TO BE IMPLEMENTED)

    /// Pay registered tax debt
    #[payable("EGLD")]
    #[endpoint(payTaxDebt)]
    fn pay_tax_debt(&self, tax_type: TaxType) {
        // TODO: Implement payment processing
        // 1. Verify caller has registered debt
        // 2. Check payment amount matches debt
        // 3. Update payment status
        // 4. Store transaction hash
        // 5. Emit payment event
    }

    // Phase 3: Compliance Checking (TO BE IMPLEMENTED)

    /// Check if taxpayer is compliant (all debts paid)
    #[view(isCompliant)]
    fn is_compliant(&self, taxpayer: &ManagedAddress) -> bool {
        // TODO: Implement compliance check
        // Check if all registered debts are paid and not overdue
        true // Placeholder
    }

    /// Get taxpayer's payment history
    #[view(getPaymentHistory)]
    fn get_payment_history(&self, taxpayer: &ManagedAddress) -> MultiValueEncoded<TaxPayment<Self::Api>> {
        // TODO: Implement payment history retrieval
        MultiValueEncoded::new()
    }

    // Events

    #[event("taxDebtRegistered")]
    fn tax_debt_registered_event(
        &self,
        #[indexed] taxpayer: &ManagedAddress,
        #[indexed] amount: &BigUint,
        tax_type: &TaxType,
    );

    #[event("taxPaymentCompleted")]
    fn tax_payment_completed_event(
        &self,
        #[indexed] taxpayer: &ManagedAddress,
        #[indexed] amount: &BigUint,
        tax_type: &TaxType,
        transaction_hash: &ManagedBuffer,
    );
}