import React from 'react';
import {
  HomeIcon,
  VideoCameraIcon,
  BookOpenIcon,
  ClipboardListIcon,
  ShoppingBagIcon,
  EventIcon,
  ClockIcon,
  BanknotesIcon,
  UserGroupIcon,
  BellIcon,
  SettingsIcon,
  CalendarIcon,
  PhoneIcon,
  ChevronRightIcon,
  InboxIcon
} from './Icons';

export interface TabItem {
  id: string;
  label: string;
  icon: any;
  ownerOnly?: boolean;
}

// Exporting allTabs so parent can filter it
export const allTabs = [
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
  { id: 'custom_requests', label: 'Requests', icon: InboxIcon, ownerOnly: true },
  { id: 'settings', label: 'Settings', icon: SettingsIcon, ownerOnly: true },
  { id: 'timetable', label: 'Time Table', icon: CalendarIcon },
  { id: 'contact', label: 'Contact & Location', icon: PhoneIcon },
];

interface ProfileTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOwnProfile: boolean;
  hasEvents: boolean;
  tabs?: TabItem[];
  badges?: { [key: string]: boolean };
}

const ProfileTabs: React.FC<ProfileTabsProps> = ({ activeTab, setActiveTab, isOwnProfile, hasEvents, tabs, badges = {} }) => {
  const sourceTabs = tabs || allTabs;

  const visibleTabs = sourceTabs.filter(tab => {
    // @ts-ignore
    return !tab.ownerOnly || isOwnProfile;
  });

  return (
    <>
      {/* Mobile View: Wrapping Chips */}
      <div className="md:hidden w-full overflow-x-hidden">
        <div className="flex flex-wrap gap-2 mb-4">
          {visibleTabs.map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border
                  ${isActive
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-white dark:bg-dark-card text-light-subtle dark:text-dark-subtle border-light-border dark:border-dark-border hover:border-primary/50'
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'currentColor'}`} />
                {tab.label}
                {!!badges[tab.id] && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop View: Vertical Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg shadow-sm">
        <nav className="flex flex-col py-2">
          {visibleTabs.map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative flex items-center
                  py-3 transition-all duration-200
                  border-l-4 px-4
                  ${isActive
                    ? 'border-primary text-primary bg-primary/10'
                    : 'border-transparent text-light-subtle dark:text-dark-subtle hover:text-light-text dark:hover:text-dark-text hover:bg-gray-50 dark:hover:bg-white/5'
                  }
                  justify-start
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="flex items-center justify-center flex-shrink-0 relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'currentColor'}`} />
                  {!!badges[tab.id] && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                  )}
                </div>

                <span className="ml-3 font-medium text-sm whitespace-nowrap">
                  {tab.label}
                </span>

                {isActive && (
                  <span className="text-primary ml-auto">
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
