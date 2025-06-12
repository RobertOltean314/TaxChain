# licenta

Blockchain layer: 
* ETH:
    - avantaje: ecosistem mai mare, mai multa documentatie si tutoriale
    - dezavantaje: high fees, have to learn Solidity
* MultiversX:
    - avantaje: fees foarte mici, foloseste Rust, documentatie multa
    - dezavantaje: nu la fel de mare precum ETH, nu sunt atat de multe tutoriale video
 
  
Core Concept
A blockchain system that automates profit tax collection using quarterly business reports (the same data companies already provide to investors).

Key Components
1. Government Registry
- Multiple governments can register on the blockchain
- Each sets their own profit tax brackets and rates
- Example: 10% for profits ≤$50K, 15% for $50K-$200K, 20% for >$200K

2. Business Registration
Companies register with their jurisdiction/government
Link to their government's tax bracket system
Store business metadata and tax obligations

3. Quarterly Reporting System
Businesses submit profit data from their quarterly investor reports
Same numbers they're already legally required to provide investors
Reduces tax evasion since lying to investors has severe consequences

4. Automated Tax Calculation
Smart contracts apply progressive tax brackets to reported profits
Automatic calculation and collection each quarter
Transparent, immutable tax records

5. Tax Distribution
Collected taxes automatically go to appropriate government wallets
Clear audit trail of all payments
