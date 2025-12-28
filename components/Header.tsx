import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useUI } from '../contexts/UIContext.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useNavigation } from '../contexts/NavigationContext.tsx';
import { useData } from '../contexts/DataContext.tsx';
import ThemeToggle from './ThemeToggle.tsx';
import { LogoIcon, MenuIcon, XIcon, FacebookIcon, TwitterIcon, LinkedInIcon, InstagramIcon, YouTubeIcon, WhatsAppIcon, ShoppingCartIcon, SearchIcon, UserIcon } from './Icons.tsx';
import { UserNotification, Notification, PageState, StaticPageKey, User } from '../types.ts';
import { db } from '../firebase.ts';
// FIX: Correcting Firebase import path for v9 modular SDK.
import { collection, query, where, getDocs, doc, onSnapshot } from 'firebase/firestore';
import { getOptimizedImageUrl } from '../utils.ts';
import { slugify } from '../utils/slug.ts';

const BellIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
);


const NotificationsPanel: React.FC<{ userNotifications: UserNotification[], onClose: () => void, onMarkAllRead: () => void }> = ({ userNotifications, onClose, onMarkAllRead }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const { handleNavigate } = useNavigation();
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchNotifications = async () => {
            if (userNotifications.length === 0) {
                setNotifications([]);
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                // Reverse to get newest notifications first
                const recentNotifications = [...userNotifications].reverse().slice(0, 10);
                const notifIds = recentNotifications.map(n => n.notificationId);

                const q = query(collection(db, 'notifications'), where('id', 'in', notifIds));
                const querySnapshot = await getDocs(q);

                const notifs = querySnapshot.docs.map(doc => doc.data() as Notification);

                // Sort by createdAt descending
                notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                setNotifications(notifs);
            } catch (error) {
                console.error("Error fetching notifications headers:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchNotifications();
    }, [userNotifications]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const handleNotificationClick = (notification: Notification) => {
        handleNavigate({ name: 'teacher_profile', teacherId: notification.teacherId });
        onClose();
    };

    return (
        <div ref={panelRef} className="absolute top-16 right-0 w-80 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg shadow-lg z-50">
            <div className="p-3 flex justify-between items-center border-b border-light-border dark:border-dark-border">
                <h3 className="font-semibold text-light-text dark:text-dark-text">Notifications</h3>
                {userNotifications.length > 0 && <button onClick={onMarkAllRead} className="text-xs text-primary hover:underline">Mark all as read</button>}
            </div>
            <div className="max-h-96 overflow-y-auto">
                {loading ? <div className="p-4 text-center text-light-subtle dark:text-dark-subtle">Loading...</div> :
                    notifications.length === 0 ? <div className="p-4 text-center text-light-subtle dark:text-dark-subtle">No new notifications.</div> :
                        notifications.map(notif => {
                            const userNotif = userNotifications.find(un => un.notificationId === notif.id);
                            const isRead = userNotif?.isRead || false;
                            return (
                                <button key={notif.id} onClick={() => handleNotificationClick(notif)} className={`w-full text-left p-3 flex items-start space-x-3 hover:bg-light-border dark:hover:bg-dark-border ${!isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                    <img src={getOptimizedImageUrl(notif.teacherAvatar, 32, 32)} alt={notif.teacherName} className="w-8 h-8 rounded-full" />
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold">{notif.teacherName}</p>
                                        <p className="text-xs text-light-subtle dark:text-dark-subtle">{notif.content}</p>
                                        <p className="text-xs text-light-subtle dark:text-dark-subtle mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
                                    </div>
                                    {!isRead && <div className="w-2.5 h-2.5 bg-primary rounded-full mt-1 flex-shrink-0"></div>}
                                </button>
                            )
                        })
                }
            </div>
        </div>
    );
};

const MobileMenu: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (page: PageState) => void;
    currentUser: User | null;
}> = ({ isOpen, onClose, onNavigate, currentUser }) => {
    const { handleLogout } = useAuth();
    const { setModalState } = useUI();
    const { socialMediaLinks } = useNavigation();
    const { teachers } = useData();

    const handleLinkClick = (page: PageState) => {
        onNavigate(page);
        onClose();
    };

    const handleAuthClick = (modalState: any) => {
        setModalState(modalState);
        onClose();
    }

    const handleLogoutClick = () => {
        handleLogout();
        onClose();
    }

    const handleDashboardClick = () => {
        if (!currentUser) return;
        let page: PageState;
        if (currentUser.role === 'admin') {
            page = { name: 'admin_dashboard' };
        } else if (currentUser.role === 'teacher') {
            const teacher = teachers.find(t => t.userId === currentUser.id);
            page = teacher ? { name: 'teacher_profile', teacherId: teacher.id } : { name: 'home' };
        } else if (currentUser.role === 'tuition_institute') {
            page = { name: 'ti_dashboard' };
        } else {
            page = { name: 'student_dashboard' };
        }
        handleLinkClick(page);
    };

    const companyLinks = [
        { key: 'about_us', label: "About Us", type: 'static' },
        { key: 'contact_support', label: "Contact Support", type: 'static' },
        { key: 'faq', label: "FAQ", type: 'static' },
        { key: 'gift_voucher', label: "Gift Vouchers", type: 'page' },
        { key: 'referral_dashboard', label: "Referral Program", type: 'page' },
    ];

    const communityLinks = [
        { key: 'community_guidelines', label: "Community Guidelines", type: 'static' },
        { key: 'code_of_conduct', label: "Code of Conduct", type: 'static' },
        { key: 'copyright_policy', label: "Copyright & IP Policy", type: 'static' }
    ];

    const legalLinks = [
        { key: 'teacher_terms', label: "Teacher Terms" },
        { key: 'student_terms', label: "Student Terms" },
        { key: 'privacy_policy', label: "Privacy Policy" },
        { key: 'refund_policy', label: "Refund Policy" },
        { key: 'disclaimer', label: "Disclaimer" },
        { key: 'cookie_policy', label: "Cookie Policy" }
    ];


    const iconMap: { [key: string]: React.FC<any> } = {
        FacebookIcon, TwitterIcon, LinkedInIcon, InstagramIcon, YouTubeIcon, WhatsAppIcon,
    };

    return (
        <div className={`fixed inset-0 z-50 md:hidden ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/60 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            ></div>
            {/* Content */}
            <div className={`relative h-full w-full max-w-xs ml-auto bg-light-surface dark:bg-dark-surface shadow-xl flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex items-center justify-between p-4 border-b border-light-border dark:border-dark-border">
                    <div className="flex items-center space-x-2">
                        <LogoIcon className="h-8 w-8" />
                        <span className="text-xl font-bold">clazz.<span className="text-primary">lk</span></span>
                    </div>
                    <button onClick={onClose} className="p-2 text-light-subtle dark:text-dark-subtle">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto p-6">
                    {currentUser ? (
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                                {currentUser.avatar ? (
                                    <img src={getOptimizedImageUrl(currentUser.avatar, 48, 48)} alt="avatar" className="w-12 h-12 rounded-full object-cover" />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xl">
                                        <span>{currentUser.firstName?.charAt(0)}{currentUser.lastName?.charAt(0)}</span>
                                    </div>
                                )}
                                <div>
                                    <p className="font-bold text-lg">{currentUser.firstName} {currentUser.lastName}</p>
                                    <p className="text-sm text-light-subtle dark:text-dark-subtle truncate">{currentUser.email}</p>
                                </div>
                            </div>
                            <button onClick={handleDashboardClick} className="w-full text-left font-semibold py-3 text-lg hover:text-primary transition-colors">Dashboard</button>
                            <button onClick={handleLogoutClick} className="w-full text-left font-semibold py-3 text-lg hover:text-primary transition-colors">Sign Out</button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-light-text dark:text-dark-text">For Students & General Users</h3>
                            <div className="space-y-3">
                                <button onClick={() => handleAuthClick({ name: 'login', userType: 'user' })} className="w-full text-left font-semibold py-2 text-lg hover:text-primary transition-colors">Log In</button>
                                <button onClick={() => handleAuthClick({ name: 'register', userType: 'user' })} className="w-full text-center px-4 py-3 text-lg font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors">Sign Up</button>
                            </div>

                            <h3 className="font-semibold text-light-text dark:text-dark-text pt-4">For Partners</h3>
                            <ul className="space-y-2 text-light-subtle dark:text-dark-subtle">
                                <li><button onClick={() => handleAuthClick({ name: 'login', userType: 'user' })} className="hover:text-primary">Teacher Login</button></li>
                                <li><button onClick={() => handleAuthClick({ name: 'register', userType: 'user', initialRole: 'teacher' })} className="hover:text-primary">Teacher Signup</button></li>
                                <li className="pt-2"><button onClick={() => handleAuthClick({ name: 'login', userType: 'tuition_institute' })} className="font-semibold hover:text-primary">Institute Login</button></li>
                                <li><button onClick={() => handleAuthClick({ name: 'register', userType: 'tuition_institute' })} className="font-semibold hover:text-primary">Institute Signup</button></li>
                            </ul>
                        </div>
                    )}

                    <div className="border-t border-light-border dark:border-dark-border my-6"></div>

                    <div className="space-y-4">
                        <h3 className="font-semibold text-light-text dark:text-dark-text">Company</h3>
                        <ul className="space-y-2">
                            {companyLinks.map(link => (
                                <li key={link.key}>
                                    <button
                                        onClick={() => handleLinkClick(link.type === 'static'
                                            ? { name: 'static', pageKey: link.key as StaticPageKey }
                                            : { name: link.key as 'gift_voucher' | 'referral_dashboard' })}
                                        className="text-light-subtle dark:text-dark-subtle hover:text-primary"
                                    >
                                        {link.label}
                                    </button>
                                </li>
                            ))}
                        </ul>

                        <h3 className="font-semibold text-light-text dark:text-dark-text pt-4">Community</h3>
                        <ul className="space-y-2">
                            {communityLinks.map(link => (
                                <li key={link.key}>
                                    <button onClick={() => handleLinkClick({ name: 'static', pageKey: link.key as StaticPageKey })} className="text-light-subtle dark:text-dark-subtle hover:text-primary">
                                        {link.label}
                                    </button>
                                </li>
                            ))}
                        </ul>

                        <h3 className="font-semibold text-light-text dark:text-dark-text pt-4">Legal</h3>
                        <ul className="space-y-2">
                            {legalLinks.map(link => (
                                <li key={link.key}>
                                    <button onClick={() => handleLinkClick({ name: 'static', pageKey: link.key as StaticPageKey })} className="text-light-subtle dark:text-dark-subtle hover:text-primary">
                                        {link.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="p-6 border-t border-light-border dark:border-dark-border">
                    <div className="flex justify-center space-x-6">
                        {socialMediaLinks.map(link => {
                            const IconComponent = iconMap[link.icon];
                            if (!IconComponent) return null;
                            return (
                                <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="text-light-subtle dark:text-dark-subtle hover:text-primary">
                                    <IconComponent className="h-6 w-6" />
                                </a>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};


const Header: React.FC = () => {
    const { theme, toggleTheme, setModalState, cart } = useUI();
    const { currentUser, handleLogout } = useAuth();
    const { pageState, handleNavigate, homePageCardCounts, searchQuery, setSearchQuery } = useNavigation();
    const { teachers, handleMarkAllAsRead } = useData();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [refCode, setRefCode] = useState<string | undefined>(undefined);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('ref');
        if (code) {
            setRefCode(code);
        }
    }, []);

    useEffect(() => {
        if (isSearchOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchOpen]);

    const unreadCount = useMemo(() => {
        return currentUser?.notifications?.filter(n => !n.isRead).length || 0;
    }, [currentUser]);

    const onViewDashboard = () => {
        if (currentUser?.role === 'admin') {
            handleNavigate({ name: 'admin_dashboard' });
        } else if (currentUser?.role === 'teacher') {
            const teacher = teachers.find(t => t.userId === currentUser.id);
            if (teacher) {
                handleNavigate({ name: 'teacher_profile', teacherId: teacher.id });
            } else {
                handleNavigate({ name: 'home' });
            }
        } else if (currentUser?.role === 'tuition_institute') {
            handleNavigate({ name: 'ti_dashboard' });
        } else {
            handleNavigate({ name: 'student_dashboard' });
        }
    };

    const onLogoClick = () => handleNavigate({ name: 'home' });
    const onLoginClick = () => setModalState({ name: 'login' });
    const onRegisterClick = () => setModalState({ name: 'register', refCode });

    const navItems = [
        { name: 'all_teachers', label: 'Teachers', show: true },
        { name: 'all_courses', label: 'Courses', show: true },
        { name: 'all_classes', label: 'Classes', show: true },
        { name: 'all_quizzes', label: 'Quizzes', show: homePageCardCounts.quizzes > 0 },
        { name: 'all_products', label: 'Store', show: true },
        { name: 'all_events', label: 'Events', show: homePageCardCounts.events > 0 },
    ].filter(item => item.show);

    return (
        <>
            <header className="sticky top-0 z-40 w-full bg-light-surface/80 dark:bg-dark-surface/80 backdrop-blur-sm border-b border-light-border dark:border-dark-border">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <button onClick={onLogoClick} className="flex items-center space-x-2">
                                <LogoIcon className="h-8 w-8" />
                                <span className="text-xl font-bold hidden sm:inline">clazz.<span className="text-primary">lk</span></span>
                            </button>
                            <nav className="hidden md:flex items-center space-x-6 ml-10">
                                {navItems.map(item => {
                                    // SEO: Mapping internal names to mapped paths
                                    const pathToPath: Record<string, string> = {
                                        all_teachers: '/teachers',
                                        all_courses: '/courses',
                                        all_classes: '/classes',
                                        all_quizzes: '/quizzes',
                                        all_products: '/store',
                                        all_events: '/events'
                                    };
                                    const href = pathToPath[item.name] || '/';

                                    return (
                                        <a
                                            key={item.name}
                                            href={href}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleNavigate({ name: item.name });
                                            }}
                                            className={`font-medium text-sm transition-colors ${pageState.name === item.name
                                                ? 'text-primary'
                                                : 'text-light-subtle dark:text-dark-subtle hover:text-primary dark:hover:text-primary-light'
                                                }`}
                                        >
                                            {item.label}
                                        </a>
                                    );
                                })}
                            </nav>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-4">
                            {/* Expandable Search Bar */}
                            <div className={`relative flex items-center transition-all duration-300 ${isSearchOpen ? 'w-48 sm:w-64' : 'w-10'}`}>
                                {isSearchOpen && (
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onBlur={() => !searchQuery && setIsSearchOpen(false)}
                                        placeholder="Search..."
                                        className="w-full pl-3 pr-10 py-1.5 text-sm bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded-full focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                )}
                                <button
                                    onClick={() => {
                                        setIsSearchOpen(!isSearchOpen);
                                        if (!isSearchOpen && searchInputRef.current) setTimeout(() => searchInputRef.current?.focus(), 100);
                                    }}
                                    className={`absolute right-0 p-2 rounded-full text-light-subtle dark:text-dark-subtle hover:bg-light-border dark:hover:bg-dark-border ${isSearchOpen ? 'text-primary' : ''}`}
                                >
                                    <SearchIcon className="h-5 w-5" />
                                </button>
                            </div>

                            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />

                            {/* Desktop Auth & Notifications */}
                            <div className="hidden md:flex items-center space-x-4">
                                {currentUser && (
                                    <div className="relative">
                                        <button onClick={() => setIsNotificationsOpen(prev => !prev)} className="p-2 rounded-full text-light-subtle dark:text-dark-subtle hover:bg-light-border dark:hover:bg-dark-border">
                                            <BellIcon className="h-6 w-6" />
                                            {unreadCount > 0 && <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-dark-surface"></span>}
                                        </button>
                                        {isNotificationsOpen && <NotificationsPanel userNotifications={currentUser.notifications || []} onClose={() => setIsNotificationsOpen(false)} onMarkAllRead={handleMarkAllAsRead} />}
                                    </div>
                                )}

                                {cart.length > 0 && (
                                    <div className="relative">
                                        <button onClick={() => setModalState({ name: 'cart' })} className="p-2 rounded-full text-light-subtle dark:text-dark-subtle hover:bg-light-border dark:hover:bg-dark-border">
                                            <ShoppingCartIcon className="h-6 w-6" />
                                            <span className="absolute top-0 right-0 flex h-5 w-5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-5 w-5 bg-primary text-white text-xs items-center justify-center">{cart.length}</span>
                                            </span>
                                        </button>
                                    </div>
                                )}


                                {currentUser ? (
                                    <div className="flex items-center space-x-4">
                                        <button
                                            onClick={onViewDashboard}
                                            className="flex items-center space-x-2 p-1 rounded-full hover:bg-light-border dark:hover:bg-dark-border transition-colors"
                                        >
                                            {currentUser.avatar ? (
                                                <img src={getOptimizedImageUrl(currentUser.avatar, 32, 32)} alt={`${currentUser.firstName} ${currentUser.lastName}`} className="w-8 h-8 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                                                    <span>
                                                        {currentUser.firstName?.charAt(0) || ''}
                                                        {currentUser.lastName?.charAt(0) || ''}
                                                    </span>
                                                </div>
                                            )}
                                            <span className="font-medium text-sm">{`${currentUser.firstName} ${currentUser.lastName}`}</span>
                                        </button>
                                        <button
                                            onClick={handleLogout}
                                            className="px-3 py-1.5 text-xs font-medium text-light-subtle dark:text-dark-subtle border border-light-border dark:border-dark-border rounded-md hover:bg-light-border dark:hover:bg-dark-border hover:text-light-text dark:hover:text-dark-text"
                                        >
                                            Sign Out
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={onLoginClick}
                                            className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-md transition-colors"
                                        >
                                            Log In
                                        </button>
                                        <button
                                            onClick={onRegisterClick}
                                            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
                                        >
                                            Sign Up
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Mobile Menu Button - CHANGED to Profile Icon */}
                            <div className="md:hidden">
                                <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 rounded-full text-light-subtle dark:text-dark-subtle hover:bg-light-border dark:hover:bg-dark-border">
                                    <UserIcon className="h-6 w-6" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <MobileMenu
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                onNavigate={handleNavigate}
                currentUser={currentUser}
            />
        </>
    );
};

export default Header;