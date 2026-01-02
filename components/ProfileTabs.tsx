
import React, { useState } from 'react';
import {
  ChevronRightIcon,
  HomeIcon,
  VideoCameraIcon,
  BookOpenIcon,
  ClipboardListIcon,
  ShoppingBagIcon,
  EventIcon,
  ClockIcon,
  BanknotesIcon,
  UserGroupIcon,
  CalendarIcon,
  PhoneIcon,
  BellIcon
} from './Icons';

interface ProfileTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOwnProfile: boolean;
  hasEvents: boolean;
}

const allTabs = [
  { id: 'overview', label: 'Overview', icon: HomeIcon },
  { id: 'classes', label: 'Classes', icon: VideoCameraIcon },
  { id: 'courses', label: 'Courses', icon: BookOpenIcon },
  { id: 'quizzes', label: 'Quizzes', icon: ClipboardListIcon },
  { id: 'products', label: 'Store', icon: ShoppingBagIcon },
  { id: 'my_events', label: 'Events', icon: EventIcon },
  { id: 'past_classes', label: 'Past Classes', icon: ClockIcon, ownerOnly: true },
  { id: 'earnings', label: 'Earnings', icon: BanknotesIcon, ownerOnly: true },
  { id: 'attendance', label: 'Attendance', icon: UserGroupIcon, ownerOnly: true },
  { id: 'groups', label: 'Broadcast Groups', icon: UserGroupIcon, ownerOnly: true },
  { id: 'notifications', label: 'Notifications', icon: BellIcon, ownerOnly: true },
  { id: 'timetable', label: 'Time Table', icon: CalendarIcon },
  { id: 'contact', label: 'Contact & Location', icon: PhoneIcon },
];

const ProfileTabs: React.FC<ProfileTabsProps> = ({ activeTab, setActiveTab, isOwnProfile, hasEvents }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const visibleTabs = allTabs.filter(tab => {
    // @ts-ignore
    return !tab.ownerOnly || isOwnProfile;
  });

  const handleTabClick = (e: React.MouseEvent, id: string) => {
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
          {visibleTabs.map(tab => {
            const isActive = activeTab === tab.id;
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
                    ? 'border-primary text-primary bg-primary/5 md:bg-primary/10'
                    : 'border-transparent text-light-subtle dark:text-dark-subtle hover:text-light-text dark:hover:text-dark-text hover:bg-gray-50 dark:hover:bg-white/5'
                  }
                      ${isExpanded ? 'px-4 justify-start' : 'px-0 justify-center md:justify-start'}
                  `}
                aria-current={isActive ? 'page' : undefined}
                title={tab.label}
              >
                <div className="flex items-center justify-center flex-shrink-0">
                  <Icon className={`w-6 h-6 md:w-5 md:h-5 ${isActive ? 'text-primary' : 'currentColor'}`} />
                </div>

                <span className={`
                      ml-3 font-medium text-sm whitespace-nowrap
                      ${isExpanded ? 'block opacity-100' : 'hidden md:block'}
                  `}>
                  {tab.label}
                </span>

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

export default ProfileTabs;
