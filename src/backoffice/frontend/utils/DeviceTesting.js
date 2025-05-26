/* Mobile device testing utilities */

// Device sizes for testing
const deviceSizes = {
  // Mobile phones
  iphoneSE: {
    width: 375,
    height: 667,
    name: 'iPhone SE'
  },
  iphone12: {
    width: 390,
    height: 844,
    name: 'iPhone 12/13'
  },
  pixel5: {
    width: 393,
    height: 851,
    name: 'Google Pixel 5'
  },
  samsungS20: {
    width: 360,
    height: 800,
    name: 'Samsung Galaxy S20'
  },
  
  // Tablets
  ipadMini: {
    width: 768,
    height: 1024,
    name: 'iPad Mini'
  },
  ipadPro: {
    width: 1024,
    height: 1366,
    name: 'iPad Pro'
  },
  
  // Desktops
  laptop: {
    width: 1366,
    height: 768,
    name: 'Laptop'
  },
  desktop: {
    width: 1920,
    height: 1080,
    name: 'Desktop'
  }
};

// Function to simulate device viewport
const simulateDevice = (device) => {
  const viewport = document.getElementById('viewport-meta');
  if (!viewport) {
    console.error('Viewport meta tag not found');
    return;
  }
  
  // Set viewport to device size
  viewport.setAttribute('content', `width=${device.width}, initial-scale=1.0`);
  
  // Log device simulation
  console.log(`Simulating ${device.name} (${device.width}x${device.height})`);
  
  // Return cleanup function
  return () => {
    viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    console.log('Restored default viewport');
  };
};

// Function to run tests on all devices
const testAllDevices = (testFn) => {
  Object.values(deviceSizes).forEach(device => {
    const cleanup = simulateDevice(device);
    try {
      testFn(device);
    } catch (error) {
      console.error(`Test failed on ${device.name}:`, error);
    } finally {
      cleanup();
    }
  });
};

export { deviceSizes, simulateDevice, testAllDevices };
