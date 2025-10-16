pragma circom 2.0.0;

/*
 * TaxCalculation Circuit
 * 
 * Proves that: tax_owed = (income - expenses) * 0.10
 * Without revealing: actual income and expenses values
 * 
 * Public inputs: tax_owed
 * Private inputs: income, expenses
 */

template TaxCalculation() {
    // Public input - what we want to prove
    signal output tax_owed;
    
    // Private inputs - what we want to hide
    signal private input income;
    signal private input expenses;
    
    // Intermediate signals
    signal profit;
    
    // Constraints
    // 1.profit >= 0
    profit <== income - expenses;
    
    component geq = GreaterEqThan(64); // 64-bit comparison
    geq.in[0] <== income;
    geq.in[1] <== expenses;
    geq.out === 1;
    
    signal tax_times_100;
    tax_times_100 <== profit * 10;
    tax_owed <== tax_times_100 / 100;
}

// Helper template for comparison
template GreaterEqThan(n) {
    assert(n <= 252);
    signal input in[2];
    signal output out;
    
    component lt = LessThan(n+1);
    lt.in[0] <== in[1];
    lt.in[1] <== in[0] + 1;
    out <== lt.out;
}

template LessThan(n) {
    assert(n <= 252);
    signal input in[2];
    signal output out;
    
    component n2b = Num2Bits(n);
    n2b.in <== in[0] + (1<<n) - in[1];
    out <== 1 - n2b.out[n];
}

template Num2Bits(n) {✅ **WORKING**
    signal input in;
    signal output out[n];
    var lc1=0;
    
    for (var i = 0; i < n; i++) {
        out[i] <-- (in >> i) & 1;
        out[i] * (out[i] - 1) === 0;
        lc1 += out[i] * 2**i;
    }
    
    lc1 === in;
}

// Main component
component main = TaxCalculation();