import React from 'react';
import '../styles/responsive.css';
import '../styles/App.css';

// This component adds the responsive CSS to the application
const ResponsiveWrapper = ({ children }) => {
  return (
    <div className="responsive-wrapper">
      {/* Meta viewport tag is added in the HTML head */}
      {children}
    </div>
  );
};

export default ResponsiveWrapper;
