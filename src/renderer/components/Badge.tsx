import React from 'react';

export const Badge: React.FC<React.PropsWithChildren> = ({ children }) => (
    <span className="ml-2 bg-blue-100 text-blue-600 text-xs font-semibold px-2.5 py-0.5 rounded-full">{children}</span>
);