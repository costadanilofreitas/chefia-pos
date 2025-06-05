// Simple test that doesn't render the complex component
describe('CashWithdrawalPage', () => {
  it('should be importable', () => {
    // Just test that the module can be imported
    const CashWithdrawalPage = require('../ui/CashWithdrawalPage').default;
    expect(CashWithdrawalPage).toBeDefined();
    expect(typeof CashWithdrawalPage).toBe('function');
  });
});

