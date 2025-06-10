/* Mobile testing script for backoffice */

import { deviceSizes, testAllDevices } from './utils/DeviceTesting';

// Test responsive behavior across all components
const testResponsiveBackoffice = () => {
  // Define test cases
  const testCases = [
    {
      name: 'Layout Responsiveness',
      test: (device) => {
        // Test sidebar behavior
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        
        if (device.width < 768) {
          // Mobile: sidebar should be hidden by default
          console.assert(
            getComputedStyle(sidebar).transform.includes('matrix') && 
            getComputedStyle(sidebar).transform.includes('-100'),
            'Sidebar should be hidden on mobile'
          );
          
          // Main content should take full width
          console.assert(
            getComputedStyle(mainContent).width === '100%',
            'Main content should take full width on mobile'
          );
        } else {
          // Desktop/Tablet: sidebar should be visible
          console.assert(
            !getComputedStyle(sidebar).transform.includes('-100'),
            'Sidebar should be visible on desktop/tablet'
          );
        }
      }
    },
    {
      name: 'Form Elements Touch Targets',
      test: (device) => {
        // Test input fields and buttons for adequate touch targets
        const inputs = document.querySelectorAll('input, button, select, a');
        
        inputs.forEach(input => {
          const style = getComputedStyle(input);
          const height = parseInt(style.height);
          
          if (device.width < 768) {
            // Mobile: touch targets should be at least 44px
            console.assert(
              height >= 44,
              `Touch target ${input.tagName} should be at least 44px on mobile, got ${height}px`
            );
          }
        });
      }
    },
    {
      name: 'Table Responsiveness',
      test: (device) => {
        // Test tables for horizontal scrolling on small screens
        const tables = document.querySelectorAll('.table-container');
        
        tables.forEach(table => {
          if (device.width < 768) {
            // Mobile: tables should have overflow-x: auto
            console.assert(
              getComputedStyle(table).overflowX === 'auto',
              'Tables should have horizontal scrolling on mobile'
            );
          }
        });
      }
    },
    {
      name: 'Dashboard Cards Layout',
      test: (device) => {
        // Test dashboard metric cards layout
        const metricsGrid = document.querySelector('.metrics-grid');
        
        if (metricsGrid) {
          const style = getComputedStyle(metricsGrid);
          
          if (device.width < 768) {
            // Mobile: cards should stack vertically
            console.assert(
              style.gridTemplateColumns.includes('1fr') && 
              !style.gridTemplateColumns.includes(','),
              'Dashboard cards should stack vertically on mobile'
            );
          } else if (device.width < 992) {
            // Tablet: cards should be in 2 columns
            console.assert(
              style.gridTemplateColumns.includes('1fr') && 
              style.gridTemplateColumns.split(',').length === 2,
              'Dashboard cards should be in 2 columns on tablet'
            );
          } else {
            // Desktop: cards should be in 4 columns
            console.assert(
              style.gridTemplateColumns.includes('1fr') && 
              style.gridTemplateColumns.split(',').length === 4,
              'Dashboard cards should be in 4 columns on desktop'
            );
          }
        }
      }
    }
  ];
  
  // Run all test cases on all devices
  testAllDevices((device) => {
    console.log(`Testing on ${device.name}...`);
    testCases.forEach(testCase => {
      console.log(`  Running test: ${testCase.name}`);
      try {
        testCase.test(device);
        console.log(`  ✓ ${testCase.name} passed`);
      } catch (error) {
        console.error(`  ✗ ${testCase.name} failed:`, error);
      }
    });
  });
};

// Export the test function
export { testResponsiveBackoffice };
