// Kiosk entry point: global styles, one Apollo client, React strict mode.
import '@booking-kiosk/ui/styles.css';
import './app.css';

import { ApolloProvider } from '@apollo/client/react';
import { createBookingKioskClient } from '@booking-kiosk/api';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element in index.html');

createRoot(container).render(
  <StrictMode>
    <ApolloProvider client={createBookingKioskClient()}>
      <App />
    </ApolloProvider>
  </StrictMode>,
);
