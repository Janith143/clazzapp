import React from 'react';
import { useNavigation } from '../contexts/NavigationContext.tsx';
import { HomeIcon, AcademicCapIcon, BookOpenIcon, VideoCameraIcon, ClipboardListIcon } from './Icons.tsx';
import { PageState } from '../types.ts';

const ShoppingBagIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.658-.463 1.243-1.119 1.243H4.51c-.656 0-1.19-.585-1.119-1.243L4.644 8.507A3.75 3.75 0 018.25 4.5h7.5a3.75 3.75 0 013.606 3.993z" />
    </svg>
);


const BottomNavBar: React.FC = () => {
    const { pageState, handleNavigate } = useNavigation();

    const navItems = [
        { name: 'home', label: 'Home', icon: HomeIcon, page: { name: 'home' } },
        { name: 'all_teachers', label: 'Teachers', icon: AcademicCapIcon, page: { name: 'all_teachers' } },
        { name: 'all_courses', label: 'Courses', icon: BookOpenIcon, page: { name: 'all_courses' } },
        { name: 'all_classes', label: 'Classes', icon: VideoCameraIcon, page: { name: 'all_classes' } },
        { name: 'all_products', label: 'Store', icon: ShoppingBagIcon, page: { name: 'all_products' } },
    ] as const;

    const isActive = (name: typeof navItems[number]['name']) => {
        return pageState.name === name;
    };

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 pb-safe box-content bg-light-surface/80 dark:bg-dark-surface/80 backdrop-blur-md border-t border-light-border dark:border-dark-border shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-40">
            <div className="flex justify-around items-center h-full">
                {navItems.map((item) => (
                    <button
                        key={item.name}
                        onClick={() => handleNavigate(item.page as PageState)}
                        className={`flex flex-col items-center justify-center w-full h-full transition-colors duration-200 ${isActive(item.name)
                            ? 'text-primary'
                            : 'text-light-subtle dark:text-dark-subtle hover:text-primary'
                            }`}
                        aria-current={isActive(item.name) ? 'page' : undefined}
                    >
                        <item.icon className="w-6 h-6" />
                        <span className="text-[10px] font-medium mt-1">{item.label}</span>
                    </button>
                ))}
            </div>
        </nav>
    );
};

export default BottomNavBar;
