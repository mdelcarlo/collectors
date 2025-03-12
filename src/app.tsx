import * as React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css'; // Import Tailwind CSS
import App from './renderer/App';
import ErrorBoundary from './renderer/components/ErrorBoundary';
import { AuthData, AuthProvider } from './renderer/hooks/useAuth';

declare global {
    interface Window {
        electronAPI: {
            uploadVideos: () => Promise<any>;
            getAllVideos: () => Promise<any>;
            pairVideos: (video1Id: string, video2Id: string) => Promise<any>;
            unpairVideos: (pairId: string) => Promise<any>;
            processMedia: (videoIds: string[]) => Promise<any>;
            onVideosUpdated: (callback: (data: any) => void) => void;
            removeAllListeners: (channel: string) => void;
            onMediaProcessed: (callback: (data: any) => void) => void;
            onAuthChanged: (callback: (data: {auth: AuthData}) => void) => void;
            logout: () => Promise<any>;
            getAuth: () => Promise<AuthData | null>;
            getEnvironmentVariables: () => Promise<any>;
        };
    }
}

const CustomFallback = () => (
    <div style={{ textAlign: "center", marginTop: "2rem" }}>
        <h1>Oops, an error occurred!</h1>
        <p>Please restart the app or contact support.</p>
    </div>
);

const rootElement = document.getElementById('app');
if (!rootElement) {
    console.error("Error: Could not find element with id 'app'");
} else {
    const root = createRoot(rootElement); root.render(
        <React.StrictMode>
            <ErrorBoundary fallbackComponent={<CustomFallback />}>
                <AuthProvider>
                    <App />
                </AuthProvider>
            </ErrorBoundary>
        </React.StrictMode>
    );
}