import BusinessDayPage from '../../src/ui/BusinessDayPage';

// Simple test that doesn't render the complex component
describe('BusinessDayPage', () => {
  it('should be importable', () => {
    // Just test that the module can be imported
    expect(BusinessDayPage).toBeDefined();
    expect(typeof BusinessDayPage).toBe('function');
  });
});

