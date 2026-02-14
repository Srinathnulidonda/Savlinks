// src/components/dashboard/sidebar/QuickActions.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function QuickActions({ onOpenCommandPalette }) {
    const [lastUsed, setLastUsed] = useState('search');

    return (
        <div className="p-3 lg:p-4">
            <motion.button
                onClick={() => {
                    setLastUsed('search');
                    onOpenCommandPalette();
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2 text-sm text-gray-400 hover:border-gray-700 hover:bg-gray-900 hover:text-white transition-all ${lastUsed === 'search' ? 'ring-1 ring-primary/30' : ''
                    }`}
            >
                <span className="flex items-center gap-2 text-xs lg:text-sm">
                    <svg className="h-3.5 lg:h-4 w-3.5 lg:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search...
                </span>
                <kbd className="text-[10px] lg:text-xs bg-gray-800 px-1.5 py-0.5 rounded font-mono">
                    ⌘K
                </kbd>
            </motion.button>
        </div>
    );
}