import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/common/ErrorBoundary';
import { installGlobalErrorHandlers } from './utils/globalErrorHandlers';
import './styles/index.css';

installGlobalErrorHandlers();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Outermost boundary: catches failures in the providers themselves */}
    <ErrorBoundary scope="app">
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
