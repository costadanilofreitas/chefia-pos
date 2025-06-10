import { render } from '@testing-library/react';

// Simple test that doesn't render the complex component
describe('BusinessDayPage', () => {
  it('should be importable', () => {
    // Just test that the module can be imported
    const BusinessDayPage = require('../ui/BusinessDayPage').default;
    expect(BusinessDayPage).toBeDefined();
    expect(typeof BusinessDayPage).toBe('function');
  });
});

