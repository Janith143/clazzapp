
import React, { useRef, useState, useEffect } from 'react';
import { ChevronRightIcon, HomeIcon, BookOpenIcon, VideoCameraIcon, ClipboardListIcon, EventIcon, ShoppingCartIcon, BanknotesIcon, UserCircleIcon, ChartBarIcon, CalendarIcon, ClockIcon, TicketIcon } from '../Icons';
import { DashboardTab } from '../../types';

interface StudentDashboardTabsProps {
    activeTab: DashboardTab;
    setActiveTab: (tab: DashboardTab) => void;
    counts: {
        courses: number;
        classes: number;
        quizzes: number;
        events: number;
        orders: number;
        history: number;
    };
}

const StudentDashboardTabs: React.FC<StudentDashboardTabsProps> = ({ activeTab, setActiveTab, counts }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const tabs: { id: DashboardTab; label: string; icon: React.FC<any> }[] = [
        { id: 'overview', label: 'Overview', icon: HomeIcon },
        { id: 'my_vouchers', label: 'My Vouchers', icon: TicketIcon },
        { id: 'timetable', label: 'My Timetable', icon: CalendarIcon },
        { id: 'courses', label: 'My Courses', icon: BookOpenIcon },
        { id: 'classes', label: 'My Classes', icon: VideoCameraIcon },
        { id: 'past_classes', label: 'Past Classes', icon: ClockIcon },
        { id: 'quizzes', label: 'My Quizzes', icon: ClipboardListIcon },
        { id: 'score_card', label: 'Score Card', icon: ChartBarIcon },
        { id: 'my_events', label: 'My Events', icon: EventIcon },
        { id: 'my_orders', label: 'My Orders', icon: ShoppingCartIcon },
        { id: 'attendance', label: 'My Attendance', icon: ClipboardListIcon },
        { id: 'history', label: 'Transaction History', icon: BanknotesIcon },
        { id: 'profile', label: 'My Profile', icon: UserCircleIcon },
    ];

    const getCount = (id: DashboardTab) => {
        switch (id) {
            case 'courses': return counts.courses;
            case 'classes': return counts.classes;
            case 'quizzes': return counts.quizzes;
            case 'my_events': return counts.events;
            case 'my_orders': return counts.orders;
            case 'history': return counts.history;
            default: return 0;
        }
    };

    const handleTabClick = (e: React.MouseEvent, id: DashboardTab) => {
        e.stopPropagation();
        
        // Mobile Logic:
        // 1. If collapsed, expand to show labels. Don't switch tab yet.
        // 2. If expanded, switch tab and collapse.
        const isMobile = window.innerWidth < 768;

        if (isMobile && !isExpanded) {
            setIsExpanded(true);
        } else {
            setActiveTab(id);
            setIsExpanded(false);
        }
    };

    return (
        <>
            {/* Mobile Backdrop */}
            {isExpanded && (
                <div 
                    className="fixed inset-0 bg-black/50 z-[990] md:hidden"
                    onClick={() => setIsExpanded(false)}
                />
            )}

            {/* Sidebar Container */}
            <div 
                className={`
                    fixed md:relative top-16 md:top-0 left-0 bottom-0 md:bottom-auto
                    z-[1000] md:z-auto
                    bg-light-surface dark:bg-dark-surface
                    border-r md:border-r-0 md:border md:border-light-border md:dark:border-dark-border
                    md:rounded-lg md:shadow-sm
                    transition-all duration-300 ease-in-out
                    flex flex-col
                    ${isExpanded ? 'w-64 shadow-2xl' : 'w-16 md:w-full'}
                `}
                onClick={() => !isExpanded && setIsExpanded(true)}
            >
                <nav className="flex flex-col flex-1 overflow-y-auto py-2 md:py-0">
                    {tabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        const count = getCount(tab.id);
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
                                <div className="flex items-center justify-center flex-shrink-0">
                                    <tab.icon className={`w-6 h-6 md:w-5 md:h-5 ${isActive ? 'text-primary' : 'text-light-subtle dark:text-dark-subtle group-hover:text-light-text dark:group-hover:text-dark-text'}`} />
                                </div>
                                
                                {/* Label - Hidden when collapsed on mobile, visible on desktop */}
                                <span className={`
                                    ml-3 font-medium text-sm whitespace-nowrap
                                    ${isExpanded ? 'block opacity-100' : 'hidden md:block'}
                                `}>
                                    {tab.label}
                                </span>

                                {/* Badge */}
                                {count > 0 && (
                                    <span className={`
                                        ml-auto text-xs font-semibold px-2 py-0.5 rounded-full
                                        ${isActive ? 'bg-primary/20 text-primary' : 'bg-light-border dark:bg-dark-border text-light-subtle dark:text-dark-subtle'}
                                        ${isExpanded ? 'block' : 'hidden md:block'}
                                    `}>
                                        {count}
                                    </span>
                                )}
                                
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
            </div>
        </>
    );
};

export default StudentDashboardTabs;
