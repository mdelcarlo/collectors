import * as React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css'; // Import Tailwind CSS


const root = createRoot(document.getElementById('app'));
root.render(
  <div className="flex items-center justify-center min-h-screen bg-gray-100">
    <h1 className="text-3xl font-bold text-blue-600">Hello, world</h1>
  </div>
);