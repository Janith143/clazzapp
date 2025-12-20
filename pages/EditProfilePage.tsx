
import React, { useState } from 'react';
import { Teacher, TeachingItem, TeachingLocation } from '../types';
import FormInput from '../components/FormInput';
import TagInput from '../components/TagInput';
import { SaveIcon, XIcon } from '../components/Icons';
import MarkdownEditor from '../components/MarkdownEditor';
import TeachingItemsEditor from '../components/teacherProfile/TeachingItemsEditor';
import TeachingLocationsEditor from '../components/teacherProfile/TeachingLocationsEditor';
import { useData } from '../contexts/DataContext';

interface EditProfilePageProps {
    teacher: Teacher;
    onSave: (updatedTeacher: Teacher) => void;
    onCancel: () => void;
}

const EditProfilePage: React.FC<EditProfilePageProps> = ({ teacher, onSave, onCancel }) => {
    // Note: useData hook is needed if we were accessing global state, 
    // but the Editors use it internally for knownInstitutes etc.
    // We import it here to ensure context availability if needed in future.
    // const { } = useData(); 
    
    const [formData, setFormData] = useState<Teacher>(teacher);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTagsChange = (name: keyof Teacher, tags: string[]) => {
        setFormData(prev => ({ ...prev, [name]: tags }));
    };

    const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            contact: {
                ...prev.contact,
                [name]: value,
            }
        }));
    };
    
    const handleTeachingItemsChange = (items: TeachingItem[]) => {
        // Automatically sync the legacy 'subjects' array for search compatibility
        const subjects = Array.from(new Set(items.map(i => i.subject)));
        setFormData(prev => ({ 
            ...prev, 
            teachingItems: items,
            subjects: subjects 
        }));
    };

    const handleTeachingLocationsChange = (locations: TeachingLocation[]) => {
        setFormData(prev => ({ ...prev, teachingLocations: locations }));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="max-w-4xl mx-auto bg-light-surface dark:bg-dark-surface p-8 rounded-lg shadow-md animate-slideInUp">
            <h1 className="text-3xl font-bold mb-6 text-light-text dark:text-dark-text">Edit Your Profile</h1>
            <form onSubmit={handleSubmit} className="space-y-8">
                
                <section className="space-y-6">
                    <h2 className="text-xl font-semibold border-b border-light-border dark:border-dark-border pb-2 text-light-text dark:text-dark-text">Basic Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormInput label="Full Name" name="name" value={formData.name} onChange={handleChange} />
                        <FormInput label="Username" name="username" value={formData.username} onChange={handleChange} />
                    </div>
                    <FormInput label="Tagline" name="tagline" value={formData.tagline} onChange={handleChange} placeholder="e.g., Passionate Physics Educator" />
                    <MarkdownEditor
                        label="Bio"
                        id="bio"
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        rows={4}
                        placeholder="Tell students about yourself..."
                    />
                </section>

                <section className="space-y-6">
                    {/* Replaces old Subjects, Mediums, Grades with structured editor */}
                    <TeachingItemsEditor 
                        items={formData.teachingItems || []} 
                        onChange={handleTeachingItemsChange} 
                    />
                    
                     <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                        <FormInput label="Years of Experience" name="experienceYears" type="number" value={formData.experienceYears.toString()} onChange={handleChange} />
                    </div>
                    <TagInput label="Exams You Prepare Students For" tags={formData.exams} onTagsChange={(tags) => handleTagsChange('exams', tags)} />
                    <TagInput label="Qualifications" tags={formData.qualifications} onTagsChange={(tags) => handleTagsChange('qualifications', tags)} />
                    {/* Languages and Teaching Institutes removed as per request, replaced by structured data editors above/below */}
                </section>
                
                 <section className="space-y-6">
                    <h2 className="text-xl font-semibold border-b border-light-border dark:border-dark-border pb-2 pt-4 text-light-text dark:text-dark-text">Optional Details</h2>
                     <TagInput label="YouTube Video Links" tags={formData.youtubeLinks || []} onTagsChange={(tags) => handleTagsChange('youtubeLinks', tags)} placeholder="Paste a YouTube link and press Enter" />
                    <p className="text-xs text-light-subtle dark:text-dark-subtle -mt-4">Add links to your YouTube videos to showcase your teaching style or student testimonials. These will be displayed on your profile.</p>

                    <div className="pt-4">
                        <FormInput 
                            label="Google Drive Photo Gallery Link" 
                            name="googleDriveLink" 
                            value={formData.googleDriveLink || ''} 
                            onChange={handleChange} 
                            placeholder="Paste a public Google Drive folder link"
                        />
                        <p className="text-xs text-light-subtle dark:text-dark-subtle mt-1">The folder must be public ('Anyone with the link can view') to create an image gallery on your profile.</p>
                    </div>
                </section>


                <section className="space-y-6">
                    {/* Replaces old Location input and Teaching Institutes tag input */}
                    <TeachingLocationsEditor 
                        locations={formData.teachingLocations || []} 
                        onChange={handleTeachingLocationsChange} 
                    />
                    
                    <h2 className="text-xl font-semibold border-b border-light-border dark:border-dark-border pb-2 pt-4 text-light-text dark:text-dark-text">Contact Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormInput label="Phone Number" name="phone" type="tel" value={formData.contact.phone} onChange={handleContactChange} />
                        <FormInput label="Email Address" name="email" type="email" value={formData.contact.email} onChange={handleContactChange} />
                    </div>
                    {/* 'Location' FormInput removed as requested, using TeachingLocations instead */}
                </section>


                <div className="pt-6 flex justify-end space-x-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="inline-flex items-center justify-center px-6 py-2 border border-light-border dark:border-dark-border text-sm font-medium rounded-md shadow-sm text-light-text dark:text-dark-text bg-light-surface dark:bg-dark-surface hover:bg-light-border dark:hover:bg-dark-border/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light transition-colors"
                    >
                        <XIcon className="w-5 h-5 mr-2" />
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="inline-flex items-center justify-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light transition-colors"
                    >
                        <SaveIcon className="w-5 h-5 mr-2" />
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditProfilePage;