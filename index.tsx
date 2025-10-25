import React from 'react';
// FIX: Import ReactDOM from 'react-dom/client' to fix reference to UMD global.
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// The global `ReactDOM` object is provided by the script tag in index.html.
// We use it to create the root of our React application.
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find the 'root' element to mount the application to.");
}

const root = ReactDOM.createRoot(rootElement);

// Render the main App component.
// Babel will transpile the JSX and use the global React object.
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);