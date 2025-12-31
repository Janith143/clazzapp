
import React, { useRef, useState, useEffect } from 'react';
import { Teacher } from '../../types.ts';
import { PhoneIcon, MailIcon, MapPinIcon, OnlineIcon, DownloadIcon } from '../Icons.tsx';
import BusinessCard from '../BusinessCard.tsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import QRCodeWithLogo from '../QRCodeWithLogo.tsx';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';

interface ContactSectionProps {
    teacher: Teacher;
}

const ContactItem: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
    <div className="flex items-center space-x-4">
        <div className="flex-shrink-0 w-8 h-8 text-primary">{icon}</div>
        <div>
            <p className="text-sm text-light-subtle dark:text-dark-subtle">{label}</p>
            <a href={label === 'Email' ? `mailto:${value}` : (label === 'Phone' ? `tel:${value}` : '#')} className="text-md font-medium text-light-text dark:text-dark-text hover:text-primary dark:hover:text-primary-light">
                {value}
            </a>
        </div>
    </div>
);

const ContactSection: React.FC<ContactSectionProps> = ({ teacher }) => {
    const { contact } = teacher;
    const cardRef = useRef<HTMLDivElement>(null);
    const cardContainerRef = useRef<HTMLDivElement>(null);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
    const profileUrl = teacher.username ? `${window.location.origin}/teacher/${teacher.username}` : `${window.location.origin}/?teacherId=${teacher.id}`;
    const { currentUser } = useAuth();
    const { handleNavigate } = useNavigation();

    useEffect(() => {
        const container = cardContainerRef.current;
        const card = cardRef.current;
        if (!container || !card) return;

        const resizeObserver = new ResizeObserver(() => {
            const containerWidth = container.offsetWidth;
            const cardNaturalWidth = 504; // The card's designed width
            const cardNaturalHeight = 288;

            if (containerWidth < cardNaturalWidth) {
                const scale = containerWidth / cardNaturalWidth;
                card.style.transform = `scale(${scale})`;
                card.style.transformOrigin = 'top left';
                // Adjust the container height to match the scaled card height
                container.style.height = `${cardNaturalHeight * scale}px`;
            } else {
                card.style.transform = 'scale(1)';
                card.style.transformOrigin = 'top left';
                container.style.height = `${cardNaturalHeight}px`;
            }
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, []);

    const handleDownloadCard = () => {
        const element = cardRef.current;
        if (!element) return;

        html2canvas(element, {
            useCORS: true,
            backgroundColor: null,
            scale: 4 // Higher scale for better image quality
        }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');

            const canvasAspectRatio = canvas.width / canvas.height;
            const pdfWidth = 88.9; // Standard business card width in mm
            const pdfHeight = pdfWidth / canvasAspectRatio;

            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: [pdfWidth, pdfHeight]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${teacher.username}-business-card.pdf`);
        });
    };

    const handleDownloadQrCode = async () => {
        if (!qrCodeDataUrl) {
            alert('QR Code is not ready yet. Please wait a moment.');
            return;
        }
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = qrCodeDataUrl;
        a.download = `${teacher.username || teacher.id}_qrcode.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(a.href);
        document.body.removeChild(a);
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md space-y-6">
                    <h2 className="text-xl font-bold mb-2">Contact Details</h2>
                    <ContactItem icon={<PhoneIcon />} label="Phone" value={contact.phone} />
                    <ContactItem icon={<MailIcon />} label="Email" value={contact.email} />
                    <ContactItem icon={<MapPinIcon />} label="Location" value={contact.location} />

                    {/* Display Teaching Locations */}
                    {teacher.teachingLocations && teacher.teachingLocations.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-light-border dark:border-dark-border">
                            <h3 className="text-md font-semibold mb-3 text-light-text dark:text-dark-text flex items-center">
                                <MapPinIcon className="w-5 h-5 mr-2 text-primary" />
                                Teaching Locations
                            </h3>
                            <div className="space-y-3">
                                {teacher.teachingLocations.map(loc => (
                                    <div key={loc.id} className="flex items-start gap-3 p-2 rounded-md bg-light-background dark:bg-dark-background">
                                        <div className="flex-shrink-0 mt-1">
                                            <div className="w-2 h-2 rounded-full bg-primary"></div>
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-light-text dark:text-dark-text">{loc.instituteName}</p>
                                            <p className="text-xs text-light-subtle dark:text-dark-subtle">
                                                <span className="inline-block px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium mr-1">{loc.instituteType}</span>
                                                {loc.town}, {loc.district}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center space-x-4 pt-4 border-t border-light-border dark:border-dark-border">
                        <div className={`flex-shrink-0 w-8 h-8 ${contact.onlineAvailable ? 'text-green-500' : 'text-red-500'}`}>
                            <OnlineIcon />
                        </div>
                        <div>
                            <p className="text-sm text-light-subtle dark:text-dark-subtle">Availability</p>
                            <p className={`text-md font-medium ${contact.onlineAvailable ? 'text-green-500' : 'text-red-500'}`}>
                                {contact.onlineAvailable ? "Available for Online Classes" : "Not Available for Online Classes"}
                            </p>
                        </div>
                    </div>

                    {currentUser && (
                        <div className="mt-4 pt-4 border-t border-light-border dark:border-dark-border flex flex-col space-y-2">
                            <button
                                onClick={() => handleNavigate({ name: 'report_content' })}
                                className="text-xs text-red-500 hover:text-red-700 text-left font-medium w-fit"
                            >
                                Report Content
                            </button>
                            <button
                                onClick={() => handleNavigate({ name: 'request_deletion' })}
                                className="text-xs text-red-500 hover:text-red-700 text-left font-medium w-fit"
                            >
                                Request Account Deletion
                            </button>
                        </div>
                    )}
                </div>

                <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md overflow-hidden">
                    <h2 className="text-xl font-bold mb-4">Business Card</h2>
                    <p className="text-sm text-light-subtle dark:text-dark-subtle mb-4">
                        Download a shareable business card with your profile details.
                    </p>
                    <div ref={cardContainerRef} className="mx-auto" style={{ maxWidth: '504px' }}>
                        <BusinessCard ref={cardRef} teacher={teacher} />
                    </div>
                    <button
                        onClick={handleDownloadCard}
                        className="mt-4 w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
                    >
                        <DownloadIcon className="w-5 h-5" />
                        <span>Download Card (PDF)</span>
                    </button>
                </div>
            </div>
            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Profile QR Code</h2>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="p-2 bg-white rounded-lg shadow">
                        <QRCodeWithLogo
                            data={profileUrl}
                            logoSrc="/Logo3.png"
                            size={144}
                            onDataUrlReady={setQrCodeDataUrl}
                            className="w-36 h-36"
                        />
                    </div>
                    <div className="text-center sm:text-left">
                        <p className="text-light-subtle dark:text-dark-subtle">
                            Download a high-resolution QR code that links directly to your public profile.
                            Perfect for printing on flyers, posters, or sharing online.
                        </p>
                        <button
                            onClick={handleDownloadQrCode}
                            className="mt-4 inline-flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
                        >
                            <DownloadIcon className="w-5 h-5" />
                            <span>Download QR Code (PNG)</span>
                        </button>
                        <div className="mt-6">
                            <p className="text-xs text-light-subtle dark:text-dark-subtle font-medium mb-1">Profile URL</p>
                            <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary break-all hover:underline font-mono bg-light-background dark:bg-dark-background px-2 py-1 rounded border border-light-border dark:border-dark-border inline-block">
                                {profileUrl}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default ContactSection;
