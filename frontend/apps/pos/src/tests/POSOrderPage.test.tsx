// Simple test that doesn't render the complex component
describe('POSOrderPage', () => {
  it('should be importable', () => {
    // Just test that the module can be imported
    const POSOrderPage = require('../ui/POSOrderPage').default;
    expect(POSOrderPage).toBeDefined();
    expect(typeof POSOrderPage).toBe('function');
  });
});

