import React from 'react';
import { LogoIcon, FacebookIcon, TwitterIcon, LinkedInIcon, InstagramIcon, YouTubeIcon, WhatsAppIcon } from './Icons';
import { StaticPageKey } from '../types';
import { useNavigation } from '../contexts/NavigationContext';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';

const Footer: React.FC = () => {
    const { handleNavigate, socialMediaLinks } = useNavigation();
    const { setModalState, addToast } = useUI();
    const { currentUser } = useAuth();

    const companyLinks = [
        { key: 'about_us', label: "About Us" },
        { key: 'contact_support', label: "Contact Support" },
        { key: 'faq', label: "FAQ" }
    ];
    const legalLinks = [
        { key: 'teacher_terms', label: "Teacher Terms & Conditions" },
        { key: 'student_terms', label: "Student Terms & Conditions" },
        { key: 'privacy_policy', label: "Privacy Policy" },
        { key: 'refund_policy', label: "Refund & Cancellation Policy" },
        { key: 'disclaimer', label: "Disclaimer" },
        { key: 'cookie_policy', label: "Cookie Policy" }
    ];
    const communityLinks = [
        { key: 'community_guidelines', label: "Community Guidelines" },
        { key: 'code_of_conduct', label: "Code of Conduct" },
        { key: 'copyright_policy', label: "Copyright & IP Policy" }
    ];

    const iconMap: { [key: string]: React.FC<any> } = {
        FacebookIcon,
        TwitterIcon,
        LinkedInIcon,
        InstagramIcon,
        YouTubeIcon,
        WhatsAppIcon,
    };

    const LinkButton: React.FC<{ link: { key: string, label: string } }> = ({ link }) => (
        <li>
            <button onClick={() => handleNavigate({ name: 'static', pageKey: link.key as StaticPageKey })} className="text-light-subtle dark:text-dark-subtle hover:text-primary text-left">
                {link.label}
            </button>
        </li>
    );

    const handleClearCache = async () => {
        if (window.confirm('Are you sure you want to clear all application cache, storage, and service workers? This will log you out and redirect to the home page.')) {
            try {
                // Clear local and session storage
                localStorage.clear();
                sessionStorage.clear();
                addToast('Local and session storage cleared.', 'info');

                // Unregister all service workers
                if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (const registration of registrations) {
                        await registration.unregister();
                    }
                    addToast('All service workers unregistered.', 'info');
                }

                // Clear Cache Storage
                if (window.caches) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map(key => caches.delete(key)));
                    addToast('Cache storage cleared.', 'info');
                }

                addToast('Full cache clear successful! Redirecting to home...', 'success');

                // Redirect to the root of the site to force a fresh load
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);

            } catch (error) {
                console.error('Error clearing cache:', error);
                addToast('Error clearing cache. See console for details.', 'error');
            }
        }
    };

    return (
        <footer className="hidden md:block bg-light-surface dark:bg-dark-surface border-t border-light-border dark:border-dark-border mt-auto pb-20 md:pb-12">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* NEW: App Download Banner */}
                <div className="bg-[#111827] dark:bg-black rounded-2xl p-6 md:p-10 mb-12 flex flex-col md:flex-row items-center justify-between shadow-xl border border-gray-800">
                    <div className="mb-6 md:mb-0 text-center md:text-left">
                        <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">Take Your Classroom Anywhere</h3>
                        <p className="text-gray-400 text-sm md:text-base max-w-xl">
                            Download the official Clazz.lk app for Android. Manage classes, track students, and teaching on the go.
                        </p>
                    </div>
                    <div className="flex-shrink-0">
                        <a
                            href="https://play.google.com/store/apps/details?id=com.clazz.app&pcampaignid=web_share"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group inline-flex items-center bg-black border border-gray-700 text-white px-5 py-2.5 rounded-lg hover:bg-gray-900 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                        >
                            <svg className="w-8 h-8 mr-3 text-[#3DDC84]" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3.609 1.814L13.792 12 3.61 22.186a2.048 2.048 0 01-1.359-1.921V3.735a2.048 2.048 0 011.358-1.921zM15.485 13.693l5.068 2.852a1.023 1.023 0 001.447-1.119L15.618 12 15.485 13.693zM14.613 11l-9.87-9.871c.216-.142.484-.207.747-.156.495.097 6.942 3.903 14.939 8.403L14.613 11zM14.613 13l5.816 3.624c-7.997 4.5-14.444 8.306-14.939 8.403a1.36 1.36 0 01-.747-.156L14.613 13z" />
                            </svg>
                            <div className="text-left">
                                <div className="text-[10px] uppercase font-semibold tracking-wider text-gray-400">Get it on</div>
                                <div className="text-lg font-bold font-sans -mt-1">Google Play</div>
                            </div>
                        </a>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                    <div className="md:col-span-1 space-y-4">
                        <div className="flex items-center space-x-2">
                            <LogoIcon className="h-8 w-8" />
                            <span className="text-2xl font-bold">clazz.<span className="text-primary">lk</span></span>
                        </div>
                        <p className="text-sm text-light-subtle dark:text-dark-subtle">
                            Connecting students with the best tutors in Sri Lanka. Your journey to academic excellence starts here.
                        </p>
                        <div className="flex space-x-4">
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

                    <div>
                        <h3 className="font-semibold text-light-text dark:text-dark-text">Company</h3>
                        <ul className="mt-4 space-y-2 text-sm">
                            {companyLinks.map(link => <LinkButton key={link.key} link={link} />)}
                            <li>
                                <button onClick={() => handleNavigate({ name: 'gift_voucher' })} className="text-light-subtle dark:text-dark-subtle hover:text-primary text-left">
                                    Gift Vouchers
                                </button>
                            </li>
                            <li>
                                <button onClick={() => handleNavigate({ name: 'referral_dashboard' })} className="text-light-subtle dark:text-dark-subtle hover:text-primary text-left">
                                    Referral Program
                                </button>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold text-light-text dark:text-dark-text">For Partners</h3>
                        <ul className="mt-4 space-y-2 text-sm">
                            <li>
                                <button onClick={() => setModalState({ name: 'login', userType: 'user' })} className="text-light-subtle dark:text-dark-subtle hover:text-primary text-left">
                                    Teacher Login
                                </button>
                            </li>
                            <li>
                                <button onClick={() => setModalState({ name: 'register', userType: 'user' })} className="text-light-subtle dark:text-dark-subtle hover:text-primary text-left">
                                    Teacher Signup
                                </button>
                            </li>
                            <li className="pt-2">
                                <button onClick={() => setModalState({ name: 'login', userType: 'tuition_institute' })} className="text-light-subtle dark:text-dark-subtle hover:text-primary text-left font-semibold">
                                    Institute Login
                                </button>
                            </li>
                            <li>
                                <button onClick={() => setModalState({ name: 'register', userType: 'tuition_institute' })} className="text-light-subtle dark:text-dark-subtle hover:text-primary text-left font-semibold">
                                    Institute Signup
                                </button>
                            </li>
                        </ul>

                    </div>

                    <div>
                        <h3 className="font-semibold text-light-text dark:text-dark-text">Popular Classes</h3>
                        <ul className="mt-4 space-y-2 text-sm">
                            <li><button onClick={() => handleNavigate({ name: 'programmatic_landing', subject: 'combined-mathematics', location: 'colombo' })} className="text-light-subtle dark:text-dark-subtle hover:text-primary text-left">Combined Maths in Colombo</button></li>
                            <li><button onClick={() => handleNavigate({ name: 'programmatic_landing', subject: 'physics', location: 'gampaha' })} className="text-light-subtle dark:text-dark-subtle hover:text-primary text-left">Physics in Gampaha</button></li>
                            <li><button onClick={() => handleNavigate({ name: 'programmatic_landing', subject: 'chemistry', location: 'galle' })} className="text-light-subtle dark:text-dark-subtle hover:text-primary text-left">Chemistry in Galle</button></li>
                            <li><button onClick={() => handleNavigate({ name: 'programmatic_landing', subject: 'biology', location: 'kandy' })} className="text-light-subtle dark:text-dark-subtle hover:text-primary text-left">Biology in Kandy</button></li>
                            <li><button onClick={() => handleNavigate({ name: 'programmatic_landing', subject: 'english', location: 'negombo' })} className="text-light-subtle dark:text-dark-subtle hover:text-primary text-left">English in Negombo</button></li>
                            <li><button onClick={() => handleNavigate({ name: 'programmatic_landing', subject: 'economics', location: 'colombo' })} className="text-light-subtle dark:text-dark-subtle hover:text-primary text-left">Economics in Colombo</button></li>
                            <li><button onClick={() => handleNavigate({ name: 'all_classes' })} className="text-primary font-semibold hover:underline text-left mt-2">Browse All Locations</button></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold text-light-text dark:text-dark-text">Community</h3>
                        <ul className="mt-4 space-y-2 text-sm">
                            {communityLinks.map(link => <LinkButton key={link.key} link={link} />)}
                            <li>
                                <button onClick={() => handleNavigate({ name: 'report_content' })} className="text-light-subtle dark:text-dark-subtle hover:text-primary text-left">
                                    Report Content
                                </button>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold text-light-text dark:text-dark-text">Legal</h3>
                        <ul className="mt-4 space-y-2 text-sm">
                            {legalLinks.map(link => <LinkButton key={link.key} link={link} />)}

                        </ul>
                    </div>
                </div>

                <div className="mt-8 pt-8 border-t border-light-border dark:border-dark-border text-center text-xs text-light-subtle dark:text-dark-subtle">
                    &copy; {new Date().getFullYear()} clazz.lk. All rights reserved.
                    <div className="mt-4">
                        <button
                            onClick={handleClearCache}
                            className="px-3 py-1 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-xs font-semibold rounded-full hover:bg-red-200 dark:hover:bg-red-900"
                        >
                            Clear Full Website Cache
                        </button>
                    </div>
                </div>
            </div>
        </footer >
    );
};

export default Footer;