// src/components/dashboard/sidebar/Navigation.jsx
import { motion } from 'framer-motion';

export default function Navigation({ stats, activeView, onViewChange }) {
    const tabs = [
        {
            id: 'all',
            label: 'All Links',
            count: stats.all,
            icon: '🔗',
            color: 'text-blue-400',
            description: 'All your saved links'
        },
        {
            id: 'recent',
            label: 'Recent',
            count: stats.recent,
            icon: '⏱️',
            color: 'text-green-400',
            description: 'Recently added links'
        },
        {
            id: 'starred',
            label: 'Starred',
            count: stats.starred,
            icon: '⭐',
            color: 'text-yellow-400',
            description: 'Your favorite links'
        },
        {
            id: 'archive',
            label: 'Archive',
            count: stats.archive,
            icon: '📦',
            color: 'text-gray-400',
            description: 'Archived links'
        },
    ];

    const getCountDisplay = (count) => {
        if (count > 9999) return '9999+';
        if (count > 999) return '999+';
        return count.toString();
    };

    return (
        <nav className="px-3 pb-3">
            <div className="space-y-1">
                {tabs.map((tab, index) => {
                    const isActive = activeView === tab.id;
                    const hasItems = tab.count > 0;

                    return (
                        <motion.button
                            key={tab.id}
                            onClick={() => onViewChange(tab.id)}
                            whileHover={{ scale: isActive ? 1 : 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-xs lg:text-sm font-medium transition-all group ${isActive
                                    ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                                    : 'text-gray-400 hover:bg-gray-900 hover:text-white'
                                }`}
                            title={tab.description}
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className="flex items-center gap-2.5">
                                <span className={`text-sm lg:text-base transition-transform group-hover:scale-110 ${isActive ? tab.color : ''
                                    }`}>
                                    {tab.icon}
                                </span>
                                <span className="font-medium">
                                    {tab.label}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Count Display */}
                                {isActive ? (
                                    <span className="text-[10px] lg:text-xs px-2 py-0.5 rounded-full font-mono bg-primary/20 text-primary">
                                        {getCountDisplay(tab.count)}
                                    </span>
                                ) : (
                                    <span className="text-[10px] lg:text-xs font-mono text-gray-600">
                                        {getCountDisplay(tab.count)}
                                    </span>
                                )}
                            </div>
                        </motion.button>
                    );
                })}
            </div>
        </nav>
    );
}