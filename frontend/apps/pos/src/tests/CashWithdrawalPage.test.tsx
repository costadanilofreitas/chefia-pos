import CashWithdrawalPage from '../ui/CashWithdrawalPage';

// Simple test that doesn't render the complex component
describe('CashWithdrawalPage', () => {
  it('should be importable', () => {
    // Just test that the module can be imported
    expect(CashWithdrawalPage).toBeDefined();
    expect(typeof CashWithdrawalPage).toBe('function');
  });
});

