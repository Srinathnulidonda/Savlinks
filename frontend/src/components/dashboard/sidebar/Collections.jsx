// src/components/dashboard/sidebar/Collections.jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Collections({ collections, onCreateCollection, activeCollection, onCollectionChange }) {
    const [isCreating, setIsCreating] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [selectedEmoji, setSelectedEmoji] = useState('📁');

    const emojiOptions = ['📁', '⚡', '🎨', '📈', '📚', '🔬', '💡', '🎯', '🚀', '🔧', '💻', '📱', '🌟', '🎵', '🎬', '📰'];

    const handleCreateCollection = async (e) => {
        e.preventDefault();
        if (!newCollectionName.trim()) return;

        try {
            await onCreateCollection({
                name: newCollectionName.trim(),
                emoji: selectedEmoji,
                color: 'from-blue-600 to-blue-500' // Default color
            });

            setNewCollectionName('');
            setSelectedEmoji('📁');
            setIsCreating(false);
        } catch (error) {
            console.error('Failed to create collection:', error);
        }
    };

    const getCountDisplay = (count) => {
        if (count > 9999) return '9999+';
        if (count > 999) return '999+';
        return count.toString();
    };

    return (
        <div className="flex-1 border-t border-gray-900 p-3 lg:p-4 overflow-y-auto min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] lg:text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Collections ({collections.length})
                </h3>
                <button
                    onClick={() => setIsCreating(!isCreating)}
                    className="text-gray-500 hover:text-gray-400 transition-colors p-1 rounded hover:bg-gray-900"
                    title="Create new collection"
                >
                    <svg className="h-3.5 lg:h-4 w-3.5 lg:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        {isCreating ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        )}
                    </svg>
                </button>
            </div>

            {/* Create Collection Form */}
            <AnimatePresence>
                {isCreating && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mb-4 overflow-hidden"
                    >
                        <form onSubmit={handleCreateCollection} className="p-3 bg-gray-900/50 rounded-lg border border-gray-800">
                            {/* Emoji Selector */}
                            <div className="mb-2">
                                <label className="text-[10px] lg:text-xs text-gray-500 block mb-1">Icon</label>
                                <div className="flex flex-wrap gap-1">
                                    {emojiOptions.slice(0, 8).map((emoji) => (
                                        <button
                                            key={emoji}
                                            type="button"
                                            onClick={() => setSelectedEmoji(emoji)}
                                            className={`p-1 rounded text-sm hover:bg-gray-800 transition-colors ${selectedEmoji === emoji ? 'bg-gray-800 ring-1 ring-primary/50' : ''
                                                }`}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Name Input */}
                            <div className="mb-3">
                                <input
                                    type="text"
                                    value={newCollectionName}
                                    onChange={(e) => setNewCollectionName(e.target.value)}
                                    placeholder="Collection name..."
                                    className="w-full px-2 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 text-white"
                                    autoFocus
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={!newCollectionName.trim()}
                                    className="flex-1 px-3 py-1.5 text-xs bg-primary text-white rounded hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    Create
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Collections List */}
            <div className="space-y-1 pb-4">
                <AnimatePresence>
                    {collections.map((collection, index) => {
                        const isActive = activeCollection === collection.id;

                        return (
                            <motion.div
                                key={collection.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <button
                                    onClick={() => onCollectionChange(collection.id)}
                                    className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-xs lg:text-sm font-medium transition-all group ${isActive
                                            ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                                            : 'text-gray-400 hover:bg-gray-900 hover:text-white'
                                        }`}
                                    title={`View ${collection.name} collection`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className={`text-sm lg:text-base transition-transform group-hover:scale-110 ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'
                                            }`}>
                                            {collection.emoji}
                                        </span>
                                        <span className="font-medium">
                                            {collection.name}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* Count Display */}
                                        {isActive ? (
                                            <span className="text-[10px] lg:text-xs px-2 py-0.5 rounded-full font-mono bg-primary/20 text-primary">
                                                {getCountDisplay(collection.count)}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] lg:text-xs font-mono text-gray-600">
                                                {getCountDisplay(collection.count)}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {/* Empty State */}
                {collections.length === 0 && !isCreating && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-6"
                    >
                        <div className="text-gray-600 mb-2">
                            <svg className="h-6 w-6 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <p className="text-xs text-gray-500">No collections yet</p>
                        </div>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="text-xs text-primary hover:text-primary-light transition-colors"
                        >
                            Create your first collection
                        </button>
                    </motion.div>
                )}
            </div>
        </div>
    );
}