import React, { useRef, useEffect, useState } from 'react';
import { ChevronRightIcon } from '../Icons';
import { allTabs } from '../ProfileTabs';

interface TeacherDashboardTabsProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    badges?: { [key: string]: boolean };
    isOwnProfile: boolean;
}

const TeacherDashboardTabs: React.FC<TeacherDashboardTabsProps> = ({ activeTab, setActiveTab, badges = {}, isOwnProfile }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Filter tabs just like ProfileTabs does
    const visibleTabs = allTabs.filter(tab => {
        // @ts-ignore
        return !tab.ownerOnly || isOwnProfile;
    });

    const collapseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Clear timeout on unmount
    useEffect(() => {
        return () => {
            if (collapseTimeoutRef.current) clearTimeout(collapseTimeoutRef.current);
        };
    }, []);

    const handleTabClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();

        const isMobile = window.innerWidth < 768;

        setActiveTab(id);

        if (isMobile) {
            if (collapseTimeoutRef.current) {
                clearTimeout(collapseTimeoutRef.current);
                collapseTimeoutRef.current = null;
            }

            if (!isExpanded) {
                setIsExpanded(true);
                collapseTimeoutRef.current = setTimeout(() => {
                    setIsExpanded(false);
                }, 1000);
            } else {
                setIsExpanded(false);
            }
        }
    };

    return (
        <>
            {/* Mobile Backdrop - Optional, StudentDashboardTabs has it */}
            {isExpanded && (
                <div
                    className="fixed inset-0 bg-black/50 z-[990] md:hidden"
                    onClick={() => setIsExpanded(false)}
                />
            )}

            <div
                className={`
                    fixed md:relative top-16 md:top-0 left-0 bottom-0 md:bottom-auto
                    z-[1000] md:z-auto
                    bg-light-surface dark:bg-dark-surface
                    border-r md:border-r-0 md:border md:border-light-border md:dark:border-dark-border
                    md:rounded-lg md:shadow-sm
                    transition-all duration-300 ease-in-out
                    flex flex-col
                    ${isExpanded ? 'w-64 shadow-2xl' : 'w-12 md:w-64'} 
                `}
                onClick={() => !isExpanded && setIsExpanded(true)}
            >
                <nav className="flex flex-col flex-1 overflow-y-auto py-2 md:py-0">
                    {visibleTabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        const showBadge = !!badges[tab.id];
                        const Icon = tab.icon;

                        return (
                            <button
                                key={tab.id}
                                onClick={(e) => handleTabClick(e, tab.id)}
                                className={`
                                    relative flex items-center
                                    py-3 md:py-3 transition-all duration-200
                                    md:border-l-4 md:border-r-0 md:px-4
                                    ${isActive
                                        ? 'text-primary bg-primary/5 md:bg-primary/10 md:border-primary'
                                        : 'text-light-subtle dark:text-dark-subtle hover:text-light-text dark:hover:text-dark-text hover:bg-gray-50 dark:hover:bg-white/5 md:border-transparent'
                                    }
                                    ${isExpanded ? 'px-4 justify-start' : 'px-0 justify-center md:justify-start'}
                                `}
                                title={tab.label}
                            >
                                <div className="flex items-center justify-center flex-shrink-0 relative">
                                    <Icon className={`w-6 h-6 md:w-5 md:h-5 ${isActive ? 'text-primary' : 'text-light-subtle dark:text-dark-subtle group-hover:text-light-text dark:group-hover:text-dark-text'} `} />
                                    {showBadge && (
                                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                        </span>
                                    )}
                                </div>

                                {/* Label - Hidden when collapsed on mobile, visible on desktop */}
                                <span className={`
                                    ml-3 font-medium text-sm whitespace-nowrap
                                    ${isExpanded ? 'block opacity-100' : 'hidden md:block'}
                                `}>
                                    {tab.label}
                                </span>

                                {/* Desktop Active Chevron */}
                                {isActive && (
                                    <span className="hidden md:block text-primary ml-auto">
                                        <ChevronRightIcon className="w-4 h-4" />
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>
            </div >
        </>
    );
};

export default TeacherDashboardTabs;
