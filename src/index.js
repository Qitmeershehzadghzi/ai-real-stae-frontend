// This file was requested as index.js, but Vite typically uses main.jsx.
// If you are using a standard Vite setup, please ensure your index.html points to the correct entry file.

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
