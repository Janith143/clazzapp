
import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import FormInput from '../FormInput';
import FormSelect from '../FormSelect';
import ImageUploadInput from '../ImageUploadInput';
import { SaveIcon, XIcon, UserIcon, AcademicCapIcon, MapIcon, SparklesIcon } from '../Icons'; // Added icons
import { Teacher, TeachingItem, TeachingLocation } from '../../types';
import { useNavigation } from '../../contexts/NavigationContext';
import TeachingItemsEditor from '../teacherProfile/TeachingItemsEditor';
import TeachingLocationsEditor from '../teacherProfile/TeachingLocationsEditor';
import TagInput from '../TagInput';
import MarkdownEditor from '../MarkdownEditor';

interface TIManagedTeacherModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (teacherDetails: Partial<Teacher>) => Promise<void>;
    initialData?: Teacher | null;
    instituteCommissionRate: number;
}

const TIManagedTeacherModal: React.FC<TIManagedTeacherModalProps> = ({ isOpen, onClose, onSave, initialData, instituteCommissionRate }) => {
    // const { subjects } = useNavigation(); // Not using global subjects anymore
    const [formData, setFormData] = useState<Partial<Teacher>>({
        name: '',
        commissionRate: 0,
        bio: '',
        subjects: [],
        teachingItems: [], // Added
        teachingLocations: [], // Added
        exams: [], // Added
        qualifications: [], // Added
        achievements: [], // Added
        youtubeLinks: [], // Added
        googleDriveLink: '', // Added
        tagline: '', // Added
        experienceYears: 0, // Added
        profileImage: '',
        contact: { phone: '', email: '', location: '', onlineAvailable: false }
    });
    // const [selectedSubject, setSelectedSubject] = useState(''); // Removed legacy
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');


    const [activeTab, setActiveTab] = useState<'basic' | 'teaching' | 'qualifications' | 'details'>('basic'); // Added Tabs

    useEffect(() => {
        if (isOpen && initialData) {
            setFormData({
                ...initialData,
                commissionRate: initialData.commissionRate || 0
            });

        } else if (isOpen) {
            setFormData({
                name: '',
                commissionRate: 0,
                bio: '',
                subjects: [],
                teachingItems: [],
                teachingLocations: [],
                exams: [],
                qualifications: [],
                achievements: [],
                youtubeLinks: [],
                googleDriveLink: '',
                tagline: '',
                experienceYears: 0,
                profileImage: '',
                contact: { phone: '', email: '', location: '', onlineAvailable: false }
            });

            setActiveTab('basic'); // Reset tab
        }
    }, [isOpen, initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTagsChange = (name: keyof Teacher, tags: string[]) => {
        setFormData(prev => ({ ...prev, [name]: tags }));
    };

    const handleTeachingItemsChange = (items: TeachingItem[]) => {
        // Automatically sync the legacy 'subjects' array for search compatibility
        const subjects = Array.from(new Set(items.map(i => i.subject)));
        setFormData(prev => ({
            ...prev,
            teachingItems: items,
            subjects: subjects // Update legacy subjects list too
        }));

    };

    const handleTeachingLocationsChange = (locations: TeachingLocation[]) => {
        setFormData(prev => ({ ...prev, teachingLocations: locations }));
    };

    const handleCommissionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setFormData(prev => ({ ...prev, commissionRate: isNaN(val) ? 0 : val }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.name) {
            setError("Teacher name is required.");
            return;
        }

        // Commission validation removed as per requirement.
        // if ((formData.commissionRate || 0) > instituteCommissionRate) ...

        setIsSaving(true);
        try {
            await onSave({
                ...formData,
                subjects: formData.subjects || [],
                contact: {
                    ...formData.contact,
                    phone: formData.contact?.phone || '',
                    email: formData.contact?.email || '',
                    location: '',
                    onlineAvailable: false
                },
                // Ensure arrays are initialized
                teachingItems: formData.teachingItems || [],
                teachingLocations: formData.teachingLocations || [],
                exams: formData.exams || [],
                qualifications: formData.qualifications || [],
                achievements: formData.achievements || [],
                youtubeLinks: formData.youtubeLinks || []
            });
            onClose();
        } catch (err) {
            setError("Failed to save teacher.");
        } finally {
            setIsSaving(false);
        }
    };



    const modalTitle = initialData ? 'Edit Teacher' : 'Add New Teacher';

    const TabButton = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
        <button
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center px-4 py-2 border-b-2 text-sm font-medium transition-colors ${activeTab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-light-subtle dark:text-dark-subtle hover:text-light-text dark:hover:text-dark-text'
                }`}
        >
            <Icon className="w-5 h-5 mr-2" />
            {label}
        </button>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="2xl">
            <div className="flex border-b border-light-border dark:border-dark-border mb-6 overflow-x-auto">
                <TabButton id="basic" label="Basic Info" icon={UserIcon} />
                <TabButton id="teaching" label="Teaching Areas" icon={AcademicCapIcon} />
                <TabButton id="qualifications" label="Qualifications" icon={SparklesIcon} />
                <TabButton id="details" label="More Details" icon={MapIcon} />
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto px-1">

                {/* Basic Info Tab */}
                <div className={activeTab === 'basic' ? 'block space-y-4' : 'hidden'}>
                    <div className="flex justify-center mb-6">
                        <ImageUploadInput
                            currentImage={formData.profileImage || ''}
                            onImageChange={(base64) => setFormData(prev => ({ ...prev, profileImage: base64, avatar: base64 }))}
                            label="Profile Photo"
                        />
                    </div>

                    <FormInput label="Full Name *" name="name" value={formData.name || ''} onChange={handleChange} required placeholder="e.g. John Doe" />

                    <FormInput label="Tagline (Optional)" name="tagline" value={formData.tagline || ''} onChange={handleChange} placeholder="e.g. Passionate Physics Educator" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput
                            label="Mobile Number (Optional)"
                            name="phone"
                            value={formData.contact?.phone || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, contact: { ...prev.contact!, phone: e.target.value } }))}
                            placeholder="07xxxxxxxx"
                        />
                        <FormInput
                            label="Email Address (Optional)"
                            name="email"
                            value={formData.contact?.email || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, contact: { ...prev.contact!, email: e.target.value } }))}
                            placeholder="teacher@example.com"
                        />
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md border border-light-border dark:border-dark-border">
                        <h3 className="font-semibold mb-2">Commission Settings</h3>
                        <div className="flex items-center space-x-2">
                            <div className="flex-1">
                                <FormInput
                                    label="Teacher's Commission %"
                                    name="commissionRate"
                                    type="number"
                                    value={formData.commissionRate?.toString() || ''}
                                    onChange={handleCommissionChange}
                                    min={0}
                                    required
                                />
                            </div>
                        </div>
                        <p className="text-xs text-light-subtle dark:text-dark-subtle mt-1">
                            This is the percentage the teacher receives from the <b>Class Fee</b>.
                        </p>
                    </div>

                    <MarkdownEditor
                        label="Bio / Description (Optional)"
                        id="bio"
                        name="bio"
                        value={formData.bio || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                        rows={3}
                        placeholder="Tell students about yourself..."
                    />
                </div>

                {/* Teaching Areas Tab */}
                <div className={activeTab === 'teaching' ? 'block space-y-6' : 'hidden'}>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md text-sm mb-4">
                        Add the specific subjects, audiences, and mediums this teacher covers. This helps students find them easily.
                    </div>

                    <TeachingItemsEditor
                        items={formData.teachingItems || []}
                        onChange={handleTeachingItemsChange}
                    />


                </div>

                {/* Qualifications Tab */}
                <div className={activeTab === 'qualifications' ? 'block space-y-6' : 'hidden'}>
                    <TagInput
                        label="Exams Prepared For"
                        tags={formData.exams || []}
                        onTagsChange={(tags) => handleTagsChange('exams', tags)}
                        placeholder="e.g. G.C.E. O/L, A/L, Edexcel"
                    />
                    <TagInput
                        label="Qualifications"
                        tags={formData.qualifications || []}
                        onTagsChange={(tags) => handleTagsChange('qualifications', tags)}
                        placeholder="e.g. BSc in Physics, 5 Years Experience"
                    />
                    <FormInput
                        label="Years of Experience"
                        name="experienceYears"
                        type="number"
                        value={formData.experienceYears?.toString() || '0'}
                        onChange={handleChange}
                    />
                    <TagInput
                        label="Key Achievements"
                        tags={formData.achievements || []}
                        onTagsChange={(tags) => handleTagsChange('achievements', tags)}
                        placeholder="e.g. Island Rank 1 Student 2023"
                    />
                </div>

                {/* More Details Tab */}
                <div className={activeTab === 'details' ? 'block space-y-6' : 'hidden'}>
                    <TeachingLocationsEditor
                        locations={formData.teachingLocations || []}
                        onChange={handleTeachingLocationsChange}
                    />

                    <div className="pt-4 border-t border-light-border dark:border-dark-border">
                        <h4 className="font-medium mb-3">Online Presence</h4>
                        <TagInput
                            label="YouTube Video Links"
                            tags={formData.youtubeLinks || []}
                            onTagsChange={(tags) => handleTagsChange('youtubeLinks', tags)}
                            placeholder="Paste YouTube Link"
                        />
                        <div className="mt-4">
                            <FormInput
                                label="Google Drive Photo Gallery Link"
                                name="googleDriveLink"
                                value={formData.googleDriveLink || ''}
                                onChange={handleChange}
                                placeholder="Public Google Drive Folder Link"
                            />
                        </div>
                    </div>
                </div>

                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                <div className="pt-4 flex justify-end space-x-3 border-t border-light-border dark:border-dark-border">
                    <button type="button" onClick={onClose} className="inline-flex items-center justify-center px-4 py-2 border border-light-border dark:border-dark-border text-sm font-medium rounded-md shadow-sm text-light-text dark:text-dark-text bg-light-surface dark:bg-dark-surface hover:bg-light-border dark:hover:bg-dark-border/50">
                        <XIcon className="w-4 h-4 mr-2" />
                        Cancel
                    </button>
                    <button type="submit" disabled={isSaving} className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark disabled:opacity-50">
                        <SaveIcon className="w-4 h-4 mr-2" />
                        {isSaving ? 'Saving...' : 'Save Teacher'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default TIManagedTeacherModal;
