# Test Data for Tax Calculator Service

## Sample Invoice Data (JSON Format)

This is the simplified format we'll start with before moving to PDF processing.

### Example 1: Simple Business

```json
{
  "invoices": [
    {
      "amount": 50000.0,
      "invoice_type": "Income",
      "description": "Service revenue Q3"
    },
    {
      "amount": 30000.0,
      "invoice_type": "Expense",
      "description": "Office rent and utilities"
    },
    {
      "amount": 15000.0,
      "invoice_type": "Income",
      "description": "Consulting revenue"
    },
    {
      "amount": 8000.0,
      "invoice_type": "Expense",
      "description": "Software licenses"
    }
  ]
}
```

**Expected Result:**

- Total Income: 65,000 RON
- Total Expenses: 38,000 RON
- Profit: 27,000 RON
- Tax Owed (10%): 2,700 RON

### Example 2: Larger Business

```json
{
  "invoices": [
    {
      "amount": 200000.0,
      "invoice_type": "Income",
      "description": "Product sales Q3"
    },
    {
      "amount": 120000.0,
      "invoice_type": "Expense",
      "description": "Raw materials"
    },
    {
      "amount": 50000.0,
      "invoice_type": "Expense",
      "description": "Employee salaries"
    },
    {
      "amount": 25000.0,
      "invoice_type": "Income",
      "description": "Service contracts"
    }
  ]
}
```

**Expected Result:**

- Total Income: 225,000 RON
- Total Expenses: 170,000 RON
- Profit: 55,000 RON
- Tax Owed (10%): 5,500 RON

## Testing Commands

### Start the service:

```bash
cd app/backend/tax-calculator
cargo run
```

### Test with curl:

```bash
# Test health endpoint
curl http://localhost:8081/health

# Test tax calculation
curl -X POST http://localhost:8081/calculate-tax \
  -H "Content-Type: application/json" \
  -d '{
    "invoices": [
      {"amount": 50000.0, "invoice_type": "Income", "description": "Revenue"},
      {"amount": 30000.0, "invoice_type": "Expense", "description": "Costs"}
    ]
  }'
```

## Next Steps

1. **Test the basic service** - Verify tax calculations work correctly
2. **Add ZK proof generation** - Integrate with Circom circuit
3. **Add blockchain integration** - Connect to MultiversX smart contract
4. **Create frontend interface** - Angular app to upload invoices
5. **Add PDF processing** - Parse real invoice documents

## Sample eFactura Data

Once we implement PDF processing, we'll need sample Romanian eFactura XML files. For now, we can simulate with JSON data above.
