import * as React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css'; // Import Tailwind CSS
import App from './renderer/App';

declare global {
    interface Window {
        electronAPI: {
            uploadVideos: () => Promise<any>;
            getAllVideos: () => Promise<any>;
            pairVideos: (video1Id: string, video2Id: string) => Promise<any>;
            unpairVideos: (pairId: string) => Promise<any>;
            generateThumbnails: (videoIds: string[]) => Promise<any>;
            extractAudio: (videoIds: string[]) => Promise<any>;
            onVideosUpdated: (callback: FunctionConstructor) => void;
            onThumbnailsGenerated: (callback: FunctionConstructor) => void;
            onAudioExtracted: (callback: FunctionConstructor) => void;
            removeAllListeners: (channel: string) => void;
            processComplete: (callback: FunctionConstructor) => void;
            onProcessCompleted: (callback: FunctionConstructor) => void;
            onMediaProcessed: (callback: FunctionConstructor) => void;
        };
    }
}


const root = createRoot(document.getElementById('app'));
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);