import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { ClerkProvider, useAuth } from '@clerk/clerk-react';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import App from './App.tsx';
import { AuthedApp } from './AuthedApp.tsx';
import { ConnectedApp } from './ConnectedApp.tsx';
import './index.css';

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const convexUrl = import.meta.env.VITE_CONVEX_URL;
const normalizedConvexUrl = convexUrl?.replace(/\/+$/, "");
const convexClient = normalizedConvexUrl ? new ConvexReactClient(normalizedConvexUrl) : null;

const app = !clerkPublishableKey ? (
  <App />
) : (
  <ClerkProvider publishableKey={clerkPublishableKey} afterSignOutUrl="/">
    {convexClient ? (
      <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
        <ConnectedApp />
      </ConvexProviderWithClerk>
    ) : (
      <AuthedApp />
    )}
  </ClerkProvider>
);

createRoot(document.getElementById('root')!).render(<StrictMode>{app}</StrictMode>);
