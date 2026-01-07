import React, { useState } from 'react';
import Modal from './Modal';
import { FacebookIcon, TwitterXIcon, LinkedInIcon, WhatsAppIcon, CopyIcon, CheckIcon } from './Icons';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    url: string;
    title: string;
    description?: string;
    quote?: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, url, title, description, quote }) => {
    const [copied, setCopied] = useState(false);

    const shareMessage = description ? `${title} - ${description}` : title;
    const whatsAppText = `Join classes by ${title} on Clazz.lk ${url}`; // Customized for teachers mostly, but generic enough? User said "Join classes by Shifa Khan on Clazz.lk". Shifa Khan is the title for teacher.
    // Wait, 'title' prop is passed as teacher name in TeacherCard/ProfileHeader.
    // For CourseCard, title is course name. "Join classes by Course Name on Clazz.lk" doesn't make sense.
    // I should probably make the message customizable via props or context-aware.
    // But keeping it simple as requested for now.
    // Let's refine: The user specific request was for TEACHER profile.
    // For generic items, "Check out this link: url" is better.
    // I don't know the context (Teacher vs Course) inside ShareModal easily without another prop.
    // I'll assume 'title' is the main subject. Be careful.
    // Let's us a generic message if not customized.
    // Actually, user provided valid request: "Join classes by [Name] on Clazz.lk".
    // I will try to detect context or just stick to a safe default that incorporates the request.

    // Better idea: Pass `quote` or `shareText` prop. But I need to update all callsites.
    // Minimal change: Construct a smart default.
    // If I use the requested format:
    // WA: `Join classes by ${title} on Clazz.lk ${url}` -> "Join classes by Combined Maths on Clazz.lk" (Course) -> Odd.
    // "Join classes by Shifa Khan on Clazz.lk" (Teacher) -> Good.

    // Let's add an optional `quote` prop to ShareModal, and update callsites in TeacherCard/ProfileHeader.
    // Callsites in CourseCard/EventCard can use default or pass their own.

    const shareLinks = [
        {
            name: 'Facebook',
            icon: FacebookIcon,
            color: 'text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/40',
            href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(quote || description || title)}`
        },
        {
            name: 'X',
            icon: TwitterXIcon,
            color: 'text-black bg-gray-50 hover:bg-gray-100 dark:text-white dark:bg-gray-800 dark:hover:bg-gray-700',
            href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(quote || title)}&url=${encodeURIComponent(url)}`
        },
        {
            name: 'WhatsApp',
            icon: WhatsAppIcon,
            color: 'text-green-600 bg-green-50 hover:bg-green-100 dark:text-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/40',
            href: `https://wa.me/?text=${encodeURIComponent((quote ? quote + ' ' : '') + url)}`
        },
        {
            name: 'LinkedIn',
            icon: LinkedInIcon,
            color: 'text-blue-700 bg-blue-50 hover:bg-blue-100 dark:text-blue-300 dark:bg-blue-900/20 dark:hover:bg-blue-900/40',
            href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
        }
    ];

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Share" size="md">
            <div className="space-y-6">
                <div className="grid grid-cols-4 gap-4">
                    {shareLinks.map((platform) => (
                        <a
                            key={platform.name}
                            href={platform.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-200 transform hover:scale-105 ${platform.color}`}
                        >
                            <platform.icon className="w-8 h-8 mb-2" />
                            <span className="text-xs font-semibold">{platform.name}</span>
                        </a>
                    ))}
                </div>

                <div className="relative">
                    <label className="block text-sm font-medium text-light-subtle dark:text-dark-subtle mb-2">
                        Copy Link
                    </label>
                    <div className="flex items-center">
                        <input
                            type="text"
                            readOnly
                            value={url}
                            className="flex-1 block w-full rounded-l-md border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text sm:text-sm p-2.5 outline-none focus:ring-2 focus:ring-primary"
                            onClick={(e) => e.currentTarget.select()}
                        />
                        <button
                            onClick={handleCopy}
                            className={`inline-flex items-center px-4 py-2.5 border border-l-0 border-light-border dark:border-dark-border rounded-r-md text-sm font-medium text-white transition-colors ${copied ? 'bg-green-600 hover:bg-green-700' : 'bg-primary hover:bg-primary-dark'
                                }`}
                        >
                            {copied ? (
                                <>
                                    <CheckIcon className="h-4 w-4 mr-2" />
                                    Copied
                                </>
                            ) : (
                                <>
                                    <CopyIcon className="h-4 w-4 mr-2" />
                                    Copy
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default ShareModal;
