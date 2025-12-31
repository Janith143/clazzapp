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
        </footer>
    );
};

export default Footer;