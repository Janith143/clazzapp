import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useUI } from '../contexts/UIContext.tsx';
import { useNavigation } from '../contexts/NavigationContext.tsx';
import { useData } from '../contexts/DataContext.tsx';
import { User, BillingDetails } from '../types.ts';
import {
    ChevronLeftIcon,
    BanknotesIcon,
    UserGroupIcon,
    SearchIcon,
    ClipboardListIcon,
    UserCircleIcon,
    LockClosedIcon,
    MapPinIcon,
    PencilIcon,
    CheckCircleIcon
} from '../components/Icons.tsx';
import Modal from '../components/Modal.tsx';
import FormInput from '../components/FormInput.tsx';

interface TeacherReferralLandingPageProps {
    refCode: string;
    level?: string;
}

const BenefitItem: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
    <div
        className="flex flex-col md:flex-row items-start space-x-0 md:space-x-4 space-y-3 md:space-y-0 p-6 rounded-xl shadow-md hover:shadow-xl bg-white dark:bg-dark-surface transition-all duration-300 border border-transparent hover:border-primary/30"
    >
        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-tr from-primary to-indigo-500 text-white rounded-xl flex items-center justify-center shadow-md">
            {icon}
        </div>
        <div>
            <h3 className="text-lg font-bold">{title}</h3>
            <p className="mt-1 text-light-subtle dark:text-dark-subtle leading-relaxed">{description}</p>
        </div>
    </div>
);

const TeacherReferralLandingPage: React.FC<TeacherReferralLandingPageProps> = ({ refCode, level }) => {
    const { setModalState } = useUI();
    const { handleNavigate } = useNavigation();
    const { users } = useData();
    const [referrer, setReferrer] = useState<User | null>(null);
    const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
    const [subscriptionForm, setSubscriptionForm] = useState<BillingDetails>({
        billingFirstName: '',
        billingLastName: '',
        billingEmail: '',
        billingContactNumber: '',
        billingAddressLineOne: 'Sri Lanka', // Default
        billingCity: 'Colombo', // Default
        billingState: 'Western', // Default
        billingPostalCode: '00000', // Default
        billingCountry: 'Sri Lanka'
    });

    useEffect(() => {
        const foundReferrer = users.find(u => u.referralCode.toUpperCase() === refCode.toUpperCase());
        setReferrer(foundReferrer || null);
    }, [refCode, users]);

    useEffect(() => {
        // Updated regex to support decimals like 1.2, 2.4, etc.
        if (level && /^[1-3](\.[0-9])?$/.test(level)) {
            setIsSubscriptionModalOpen(true);
        }
    }, [level]);

    const handleSignUp = (initialMethod?: 'email' | 'mobile') => {
        setModalState({ name: 'register', refCode, initialRole: 'teacher', initialMethod });
    };

    const handleSubscriptionFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSubscriptionForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const getPriceForLevel = (lvl: string): number => {
        const l = parseFloat(lvl);
        // Plan B: {1: 100000, 1.2: 180000, 1.4: 340000}
        if (l === 1) return 100000;
        if (l === 1.2) return 180000;
        if (l === 1.4) return 340000;

        // Plan C: {2: 500000, 2.2: 920000, 2.4: 1800000}
        if (l === 2) return 500000;
        if (l === 2.2) return 920000;
        if (l === 2.4) return 1800000;

        // Plan D: {3: 850000, 3.2: 1600000, 3.4: 3000000}
        if (l === 3) return 850000;
        if (l === 3.2) return 1600000;
        if (l === 3.4) return 3000000;

        return 100000; // Default fallback (Plan B base)
    };

    const handleProceedToPayment = (e: React.FormEvent) => {
        e.preventDefault();
        const planLevel = parseFloat(level || '1');
        const amount = getPriceForLevel(level || '1');

        handleNavigate({
            name: 'payment_redirect',
            payload: {
                type: 'teacher_subscription',
                planLevel,
                amount,
                refCode,
                billingDetails: subscriptionForm
            }
        });
    };

    const benefits = [
        { icon: <SearchIcon className="w-6 h-6" />, title: "Free Marketing & Visibility", description: "Advertise your classes at no cost. Our platform is SEO-optimized to bring students to you organically." },
        { icon: <BanknotesIcon className="w-6 h-6" />, title: "Earn from Multiple Sources", description: "Sell recorded classes, live sessions, and materials with automated payments and easy withdrawals." },
        { icon: <ClipboardListIcon className="w-6 h-6" />, title: "Centralized Dashboard", description: "Manage students, schedules, and earnings in one powerful, intuitive interface." },
        { icon: <UserCircleIcon className="w-6 h-6" />, title: "Build Your Personal Brand", description: "Get your own mini website with reviews, profile, and course listings." },
        { icon: <LockClosedIcon className="w-6 h-6" />, title: "Secure Payments", description: "Receive automated payouts on time, directly to your account—no manual handling needed." },
        { icon: <MapPinIcon className="w-6 h-6" />, title: "Teach Beyond Boundaries", description: "Expand from local tuition to students across Sri Lanka and internationally." },
        { icon: <PencilIcon className="w-6 h-6" />, title: "Smart Tools & Automation", description: "Automated reminders, analytics, and notifications let you focus purely on teaching." },
        { icon: <UserGroupIcon className="w-6 h-6" />, title: "Community & Support", description: "Join a network of top educators and get access to exclusive resources and support." },
    ];

    const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 });

    const getPlanDetails = () => {
        const lvl = parseFloat(level || '0');
        const price = getPriceForLevel(level || '1');
        const formattedPrice = currencyFormatter.format(price) + " / year";

        if (lvl >= 1 && lvl < 2) {
            return {
                title: "Plan B - Pro Teacher",
                price: formattedPrice,
                features: ["4% Transaction Fee", "Unlimited Courses", "Priority Support"]
            };
        }
        if (lvl >= 2 && lvl < 3) {
            return {
                title: "Plan C - Premium Teacher",
                price: formattedPrice,
                features: ["4% Transaction Fee", "Featured Listing", "Dedicated Account Manager"]
            };
        }
        if (lvl >= 3 && lvl < 4) {
            return {
                title: "Plan D - Elite Teacher",
                price: formattedPrice,
                features: ["Zero Transaction Fee", "Top-Tier Featured Listing", "Personal Branding Consultation", "VIP Support"]
            };
        }

        return { title: "", price: "", features: [] };
    };

    const plan = getPlanDetails();

    return (
        <div className="bg-gradient-to-b from-indigo-50 via-white to-light-background dark:from-dark-background dark:to-dark-surface min-h-screen animate-fadeIn relative">
            {/* Hero Section */}
            <section className="text-center py-16 px-6 sm:px-8 md:px-12 filter blur-[0px]">
                <button
                    onClick={() => handleNavigate({ name: 'home' })}
                    className="flex items-center text-sm font-medium text-primary hover:text-primary-dark mb-6"
                >
                    <ChevronLeftIcon className="h-5 w-5 mr-2" />
                    Back to Home
                </button>

                {referrer && (
                    <p className="text-primary font-semibold mb-2">
                        {referrer.firstName} {referrer.lastName} has invited you to join Clazz.lk!
                    </p>
                )}

                <h1
                    className="text-4xl md:text-5xl font-extrabold leading-tight"
                >
                    Join Sri Lanka’s Fastest-Growing <span className="text-primary">Teaching Community</span>
                </h1>

                <p className="mt-4 text-lg text-light-subtle dark:text-dark-subtle max-w-2xl mx-auto">
                    Share your knowledge, connect with students across the island, and grow your digital teaching career.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
                    <button
                        onClick={() => handleSignUp('email')}
                        className="bg-gradient-to-tr from-primary to-indigo-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-primary/50 transition-all"
                    >
                        Sign Up with Email
                    </button>
                    <button
                        onClick={() => handleSignUp('mobile')}
                        className="border-2 border-primary text-primary font-bold py-3 px-8 rounded-lg hover:bg-primary/10 transition-all"
                    >
                        Sign Up with Mobile
                    </button>
                </div>
            </section>

            {/* Benefits Grid */}
            <section className="py-12 px-6 sm:px-8 lg:px-16 bg-light-surface dark:bg-dark-surface rounded-t-[3rem] shadow-inner">
                <h2 className="text-3xl font-bold text-center mb-12">Why Teach on Clazz.lk?</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                    {benefits.map(benefit => (
                        <BenefitItem key={benefit.title} {...benefit} />
                    ))}
                </div>
            </section>

            {/* Social Proof */}
            <section className="mt-12 text-center max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold mb-6 text-primary">
                    Trusted by Sri Lanka’s Leading Educators
                </h2>

                <div className="space-y-6">
                    <blockquote className="text-lg italic text-gray-700 dark:text-gray-300">
                        “Clazz.lk helped me grow from a local tutor to a national educator. The exposure is unmatched.”
                    </blockquote>
                    <p className="font-semibold text-primary">— P. Weerasinghe, English Teacher</p>

                    <blockquote className="text-lg italic text-gray-700 dark:text-gray-300 mt-10">
                        “The platform automates everything — I can focus entirely on my students.”
                    </blockquote>
                    <p className="font-semibold text-primary">— K. Jayawardena, ICT Teacher</p>
                </div>
            </section>


            {/* Final CTA */}
            <section className="text-center pb-20">
                <h2 className="text-3xl font-bold mb-4">Start Your Journey Today</h2>
                <p className="text-light-subtle dark:text-dark-subtle mb-8">Join a growing network of passionate teachers empowering students everywhere.</p>
                <button
                    onClick={() => handleSignUp('email')}
                    className="bg-gradient-to-tr from-primary to-indigo-600 text-white font-bold py-4 px-10 rounded-xl shadow-lg hover:shadow-primary/50 transition-all"
                >
                    Get Started for Free
                </button>
            </section>

            {/* Subscription Modal for Levels 1 & 2 */}
            <Modal isOpen={isSubscriptionModalOpen} onClose={() => setIsSubscriptionModalOpen(false)} title="Exclusive Teacher Offer" size="2xl">
                <div className="space-y-6">
                    <div className="text-center p-6 bg-gradient-to-br from-primary/10 to-indigo-100 dark:from-primary/20 dark:to-indigo-900/40 rounded-xl border border-primary/20">
                        <h2 className="text-2xl font-bold text-primary mb-2">Thanks for selecting {plan.title}</h2>
                        <p className="text-lg font-semibold">{plan.price}</p>
                        <ul className="mt-4 space-y-2 text-sm text-left inline-block">
                            {plan.features.map(f => (
                                <li key={f} className="flex items-center"><CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" /> {f}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="text-center text-sm text-light-subtle dark:text-dark-subtle">
                        Please fill in your details below to proceed to the payment gateway.
                    </div>

                    <form onSubmit={handleProceedToPayment} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormInput label="First Name" name="billingFirstName" value={subscriptionForm.billingFirstName} onChange={handleSubscriptionFormChange} required placeholder="e.g. Nimal" />
                            <FormInput label="Last Name" name="billingLastName" value={subscriptionForm.billingLastName} onChange={handleSubscriptionFormChange} required placeholder="e.g. Perera" />
                        </div>
                        <FormInput label="Email Address" name="billingEmail" type="email" value={subscriptionForm.billingEmail} onChange={handleSubscriptionFormChange} required placeholder="nimal@example.com" />
                        <FormInput label="Mobile Number" name="billingContactNumber" type="tel" value={subscriptionForm.billingContactNumber} onChange={handleSubscriptionFormChange} required placeholder="+94771234567" />

                        <div className="pt-4">
                            <button type="submit" className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary-dark transition-colors shadow-lg">
                                Proceed to Pay {plan.price}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>
        </div>
    );
};

export default TeacherReferralLandingPage;