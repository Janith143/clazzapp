import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { useUI } from '../../contexts/UIContext.tsx';
import { useData } from '../../contexts/DataContext.tsx';
import { useNavigation } from '../../contexts/NavigationContext.tsx';
import { PencilIcon, CameraIcon, DownloadIcon, PlusIcon } from '../Icons.tsx';
import StudentIdCard from './StudentIdCard.tsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import StudentCV from './StudentCV.tsx';
import { User } from '../../types';
import MarkdownDisplay from '../MarkdownDisplay.tsx';

interface MyProfileProps {
    user: User;
    isAdminView?: boolean;
}

const ProfileDetail: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
    <div>
        <p className="text-sm text-light-subtle dark:text-dark-subtle">{label}</p>
        <p className="text-md font-medium text-light-text dark:text-dark-text">{value || '-'}</p>
    </div>
);

const MyProfile: React.FC<MyProfileProps> = ({ user, isAdminView = false }) => {
    const { setModalState, openImageUploadModal } = useUI();
    const { handleUpdateUser } = useData();
    const { studentCardTaglines } = useNavigation();

    const [currentTagline, setCurrentTagline] = useState<string>("Your journey to academic excellence starts here.");
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!user || !studentCardTaglines || studentCardTaglines.length === 0) return;

        const twoDaysInMillis = 2 * 24 * 60 * 60 * 1000;
        const now = new Date();
        const lastUpdated = user.studentCardState?.lastUpdated ? new Date(user.studentCardState.lastUpdated) : null;

        if (!lastUpdated || (now.getTime() - lastUpdated.getTime()) > twoDaysInMillis) {
            // Time to update
            const newTagline = studentCardTaglines[Math.floor(Math.random() * studentCardTaglines.length)];
            setCurrentTagline(newTagline);

            const newCardState = {
                tagline: newTagline,
                lastUpdated: now.toISOString(),
            };
            // Update firestore, but don't wait for it
            handleUpdateUser({ id: user.id, studentCardState: newCardState });
        } else {
            // Use existing tagline
            setCurrentTagline(user.studentCardState!.tagline);
        }

    }, [user, studentCardTaglines, handleUpdateUser]);
    
    const handleDownloadCard = () => {
        const element = cardRef.current;
        if (!element || !user) return;

        html2canvas(element, {
            useCORS: true,
            backgroundColor: null,
            scale: 3 // Increase scale for better quality
        }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            
            const canvasAspectRatio = canvas.width / canvas.height;
            // Standard ID card size (CR80) is 85.6mm wide. We calculate height to preserve aspect ratio.
            const pdfWidth = 85.6;
            const pdfHeight = pdfWidth / canvasAspectRatio;
            
            const pdf = new jsPDF({
                orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
                unit: 'mm',
                format: [pdfWidth, pdfHeight]
            });
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`clazz_lk_student_card_${user.id}.pdf`);
        });
    };
    
    const onEditProfile = () => {
        if (!isAdminView) {
            setModalState({ name: 'edit_student_profile' });
        }
    };

    if (!user) return null;

    const fullAddress = user.address ? [user.address.line1, user.address.line2, user.address.city, user.address.state, user.address.postalCode, user.address.country].filter(Boolean).join(', ') : null;
    
    return (
        <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
                <h2 className="text-2xl font-bold mb-4 sm:mb-0">Profile Information</h2>
                {!isAdminView && (
                    <button onClick={onEditProfile} className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors self-start sm:self-center">
                        <PencilIcon className="w-4 h-4"/>
                        <span>Edit Details</span>
                    </button>
                )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-1 flex flex-col items-center">
                    <div className="relative w-32 h-32 group">
                        {user.avatar ? (
                            <img src={user.avatar} alt={`${user.firstName} ${user.lastName}`} className="w-full h-full rounded-full object-cover shadow-lg" crossOrigin="anonymous" />
                        ) : (
                            <div className="w-full h-full rounded-full bg-primary flex items-center justify-center text-white font-bold text-5xl shadow-lg">
                                <span>
                                    {user.firstName?.charAt(0) || ''}
                                    {user.lastName?.charAt(0) || ''}
                                </span>
                            </div>
                        )}
                        {!isAdminView && (
                            <button 
                                onClick={() => openImageUploadModal('student_profile')}
                                className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Change profile picture"
                            >
                                <CameraIcon className="w-8 h-8" />
                            </button>
                        )}
                    </div>
                </div>
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                    <ProfileDetail label="First Name" value={user.firstName} />
                    <ProfileDetail label="Last Name" value={user.lastName} />
                    <ProfileDetail label="Gender" value={user.gender} />
                    <ProfileDetail label="Date of Birth" value={user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString('en-CA') : null} />
                    <ProfileDetail label="Preferred Language" value={user.preferredLanguage} />
                    <ProfileDetail label="Student ID" value={user.id} />
                    <div className="md:col-span-2">
                        <ProfileDetail label="Student Category" value={user.targetAudience} />
                    </div>
                    <ProfileDetail label="Email Address" value={user.email} />
                    <ProfileDetail label="Contact Number" value={user.contactNumber} />
                    
                    <div className="md:col-span-2">
                        <ProfileDetail label="Address" value={fullAddress} />
                    </div>
                    <div className="md:col-span-2">
                        <ProfileDetail label="Schools" value={user.schools?.join(', ')} />
                    </div>
                    <div className="md:col-span-2">
                        <ProfileDetail label="Learning Institutes" value={user.learningInstitutes?.join(', ')} />
                    </div>
                     <div className="md:col-span-2">
                        <ProfileDetail label="Achievements" value={user.achievements?.join(', ')} />
                    </div>
                    <div className="md:col-span-2">
                        <p className="text-sm text-light-subtle dark:text-dark-subtle">Career Aspirations</p>
                        <div className="text-md font-medium text-light-text dark:text-dark-text">
                            <MarkdownDisplay content={user.careerAspirations || '-'} className="prose-sm prose-p:my-0" />
                        </div>
                    </div>
                     <div className="md:col-span-2">
                        <h3 className="text-md font-medium text-light-text dark:text-dark-text border-b border-light-border dark:border-dark-border pb-2 mb-3">My Personal Exams</h3>
                        {(user.customExams && user.customExams.length > 0) ? (
                            <ul className="space-y-2 list-disc list-inside text-sm">
                                {user.customExams.map(exam => (
                                    <li key={exam.id} className="text-light-text dark:text-dark-text">
                                        <strong>{exam.name}</strong> on {new Date(exam.date).toLocaleDateString()}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            !isAdminView ? (
                                <button 
                                    onClick={() => setModalState({ name: 'edit_student_profile', initialStep: 3 })}
                                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    <span>Add Exam Countdown</span>
                                </button>
                            ) : <p className="text-sm text-light-subtle dark:text-dark-subtle italic">No personal exams added.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-light-border dark:border-dark-border">
                <h3 className="text-xl font-bold mb-4 text-center">Student ID Card</h3>
                <StudentIdCard ref={cardRef} user={user} tagline={currentTagline} />
                <div className="mt-4 flex justify-center">
                    <button 
                        onClick={handleDownloadCard} 
                        className="flex items-center space-x-2 px-6 py-2 border border-primary text-primary rounded-md font-semibold hover:bg-primary/10 transition-colors"
                    >
                        <DownloadIcon className="w-5 h-5"/>
                        <span>Download Card (PDF)</span>
                    </button>
                </div>
            </div>

            <div className="mt-12 pt-6 border-t border-light-border dark:border-dark-border">
                <h3 className="text-2xl font-bold mb-4 text-center">Curriculum Vitae (CV)</h3>
                <StudentCV />
            </div>
        </div>
    );
};

export default MyProfile;