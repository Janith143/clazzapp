
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Teacher, TeachingItem, TeachingLocation, InstituteType } from '../../types';
import Modal from '../Modal';
import FormInput from '../FormInput';
import FormSelect from '../FormSelect';
import TagInput from '../TagInput';
import ImageUploadInput from '../ImageUploadInput';
import ProgressBar from '../ProgressBar';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { calculateTeacherProfileCompletion } from '../../utils';
import { ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon, PlusIcon, TrashIcon, XIcon, MapPinIcon } from '../Icons';
import MarkdownEditor from '../MarkdownEditor';
import { targetAudienceOptions, sriLankanDistricts, sriLankanTownsByDistrict, instituteTypes } from '../../data/mockData';
import { useNavigation } from '../../contexts/NavigationContext';
import { v4 as uuidv4 } from 'uuid';
import SearchableSelect from '../SearchableSelect';

interface TeacherProfileCompletionModalProps {
    isOpen: boolean;
    onClose: () => void;
    teacher: Teacher;
    missingItems: string[];
}

const TeacherProfileCompletionModal: React.FC<TeacherProfileCompletionModalProps> = ({ isOpen, onClose, teacher, missingItems }) => {
    // FIX: Import knownInstitutes from context
    const { handleUpdateTeacher, handleImageSave, tuitionInstitutes, knownInstitutes } = useData();
    const { addToast } = useUI();
    const { subjects: subjectsByAudience } = useNavigation();
    
    const [formData, setFormData] = useState<Partial<Teacher>>(teacher);
    const [step, setStep] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    
    // State for new Teaching Item Builder
    const [newItemAudience, setNewItemAudience] = useState('');
    const [newItemSubject, setNewItemSubject] = useState('');
    const [newItemMediums, setNewItemMediums] = useState<string[]>([]);
    const [newItemGrades, setNewItemGrades] = useState<string[]>([]);

    // State for new Teaching Location Builder
    const [locDistrict, setLocDistrict] = useState('');
    const [locTown, setLocTown] = useState('');
    const [locInstitute, setLocInstitute] = useState('');
    const [locType, setLocType] = useState<InstituteType | ''>('');

    const [profileImage, setProfileImage] = useState<string | null>(teacher.profileImage || null);
    const [coverImage, setCoverImage] = useState<string | null>(teacher.coverImages?.[0] || null);
    const [idImage, setIdImage] = useState<string | null>(teacher.verification.id.frontImageUrl || null);
    const [bankImage, setBankImage] = useState<string | null>(teacher.verification.bank.imageUrl || null);

    useEffect(() => {
        if (isOpen) {
            setFormData(teacher);
            setProfileImage(teacher.profileImage || null);
            setCoverImage(teacher.coverImages?.[0] || null);
            setIdImage(teacher.verification.id.frontImageUrl || null);
            setBankImage(teacher.verification.bank.imageUrl || null);
            setStep(0);
            // Reset item builder
            setNewItemAudience(targetAudienceOptions[0].value);
            setNewItemSubject('');
            setNewItemMediums([]);
            setNewItemGrades([]);
            // Reset location builder
            setLocDistrict('');
            setLocTown('');
            setLocInstitute('');
            setLocType('');
        }
    }, [isOpen, teacher]);
    
    const { percentage: progress } = calculateTeacherProfileCompletion({ ...teacher, ...formData });

    const steps = [
        { name: "Teaching Areas", fields: ['teachingItems', 'qualifications', 'experienceYears'] },
        { name: "Contact & Bio", fields: ['contact.phone', 'contact.location', 'profileImage', 'bio'] },
        { name: "Optional Details", fields: ['tagline', 'coverImages', 'exams', 'teachingLocations'] },
        { name: "Verification", fields: ['verification.id', 'verification.bank'] },
    ];
    
    const availableSubjects = useMemo(() => {
        if (!newItemAudience) return [];
        return subjectsByAudience[newItemAudience] || [];
    }, [newItemAudience, subjectsByAudience]);

    // Determine available grades based on audience
    const availableGrades = useMemo(() => {
        if (newItemAudience.includes('Primary')) {
            return ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'];
        } else if (newItemAudience.includes('Secondary') || newItemAudience.includes('Ordinary Level')) {
            return ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'];
        } else if (newItemAudience.includes('Advanced Level')) {
            return ['Grade 12', 'Grade 13', 'Revision'];
        }
        return [];
    }, [newItemAudience]);

    const townOptions = useMemo(() => {
        if (!locDistrict) return [];
        const towns = sriLankanTownsByDistrict[locDistrict] || [];
        return [{ value: '', label: 'Select a town' }, ...towns.map(t => ({ value: t, label: t }))];
    }, [locDistrict]);

    // Suggest institutes based on Known Institutes and Registered Institutes for the selected District/Town
    const instituteSuggestions = useMemo(() => {
        if (!locDistrict || !locTown) return [];

        const registered = tuitionInstitutes.map(ti => ({ name: ti.name, type: 'Tuition Institute' as InstituteType }));
        const known = knownInstitutes
            .filter(ki => ki.district === locDistrict && ki.town === locTown)
            .map(ki => ({ name: ki.name, type: ki.type }));
        
        // Combine and unique by name
        const combined = new Map<string, { name: string, type: InstituteType }>();
        registered.forEach(i => combined.set(i.name, i));
        known.forEach(i => combined.set(i.name, i));

        return Array.from(combined.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [tuitionInstitutes, knownInstitutes, locDistrict, locTown]);

    const handleInstituteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLocInstitute(val);

        // Auto-fill type if matching an existing known institute
        const match = instituteSuggestions.find(i => i.name.toLowerCase() === val.toLowerCase());
        if (match) {
            setLocType(match.type);
        }
    };


    const handleAddTeachingItem = () => {
        if (!newItemAudience || !newItemSubject) {
            addToast("Please select an audience and a subject.", "error");
            return;
        }
        if (newItemMediums.length === 0) {
            addToast("Please select at least one medium.", "error");
            return;
        }
        if (availableGrades.length > 0 && newItemGrades.length === 0) {
            addToast("Please select at least one grade.", "error");
            return;
        }

        const newItem: TeachingItem = {
            id: uuidv4(),
            audience: newItemAudience,
            subject: newItemSubject,
            mediums: newItemMediums,
            grades: newItemGrades
        };

        setFormData(prev => {
            const currentItems = prev.teachingItems || [];
            const currentSubjects = prev.subjects || [];
            
            // Auto-add subject to the simple searchable string list if not present
            const newSubjects = currentSubjects.includes(newItemSubject) 
                ? currentSubjects 
                : [...currentSubjects, newItemSubject];

            return {
                ...prev,
                teachingItems: [...currentItems, newItem],
                subjects: newSubjects
            };
        });

        setNewItemMediums([]);
        setNewItemGrades([]);
    };

    const handleRemoveTeachingItem = (id: string) => {
        setFormData(prev => ({
            ...prev,
            teachingItems: (prev.teachingItems || []).filter(item => item.id !== id)
        }));
    };

    const handleAddLocation = () => {
        if (!locDistrict || !locTown || !locInstitute || !locType) {
            addToast("Please fill in all location fields.", "error");
            return;
        }
        const newLocation: TeachingLocation = {
            id: uuidv4(),
            district: locDistrict,
            town: locTown,
            instituteName: locInstitute,
            instituteType: locType
        };
        
        setFormData(prev => ({
            ...prev,
            teachingLocations: [...(prev.teachingLocations || []), newLocation]
        }));

        // Reset partial fields for ease of next entry
        setLocInstitute('');
        setLocType('');
        // Keep District/Town as user likely adds multiple institutes in same area
    };

    const handleRemoveLocation = (id: string) => {
        setFormData(prev => ({
            ...prev,
            teachingLocations: (prev.teachingLocations || []).filter(loc => loc.id !== id)
        }));
    };

    const toggleMedium = (medium: string) => {
        setNewItemMediums(prev => prev.includes(medium) ? prev.filter(m => m !== medium) : [...prev, medium]);
    };

    const toggleGrade = (grade: string) => {
        setNewItemGrades(prev => prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name.startsWith('contact.')) {
            const contactField = name.split('.')[1];
            setFormData(prev => ({ ...prev, contact: { ...prev.contact!, [contactField]: value } }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleTagsChange = (name: keyof Teacher, tags: string[]) => {
        setFormData(prev => ({ ...prev, [name]: tags }));
    };

    const handleNextStep = () => {
        if (step < steps.length - 1) {
            setStep(prev => prev + 1);
        }
    };

    const handleFinish = async () => {
        setIsSaving(true);
        try {
            const finalData: Partial<Teacher> = { ...formData };
            
            if (profileImage && profileImage !== teacher.profileImage) {
                const url = await handleImageSave(profileImage, 'profile', { teacherId: teacher.id });
                if (url) {
                    finalData.profileImage = url;
                    finalData.avatar = url;
                }
            }
            if (coverImage && (!teacher.coverImages || !teacher.coverImages.includes(coverImage))) {
                 const url = await handleImageSave(coverImage, 'cover_add', { teacherId: teacher.id });
                 if (url) finalData.coverImages = [url, ...(teacher.coverImages || []).filter(img => img !== coverImage)];
            }
            if (idImage && idImage !== teacher.verification.id.frontImageUrl) {
                const url = await handleImageSave(idImage, 'id_verification_front', { teacherId: teacher.id });
                if(url) finalData.verification = { ...finalData.verification!, id: { ...finalData.verification!.id, frontImageUrl: url, status: 'pending' } };
            }
            if (bankImage && bankImage !== teacher.verification.bank.imageUrl) {
                const url = await handleImageSave(bankImage, 'bank_verification', { teacherId: teacher.id });
                 if(url) finalData.verification = { ...finalData.verification!, bank: { ...finalData.verification!.bank, imageUrl: url, status: 'pending' } };
            }
            
            await handleUpdateTeacher(teacher.id, finalData);

            addToast("Profile updated successfully!", "success");
            onClose();
        } catch (e) {
            addToast("Failed to save profile. Please try again.", "error");
        } finally {
            setIsSaving(false);
        }
    };
    
    const renderStepContent = () => {
        switch(step) {
            case 0: return (
                <div className="space-y-6">
                    {/* Teaching Areas Builder */}
                    <div className="p-4 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg">
                        <h4 className="font-semibold text-lg mb-4 text-light-text dark:text-dark-text">Add Your Teaching Subject</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                             <FormSelect 
                                label="1. Target Audience" 
                                name="audience" 
                                value={newItemAudience} 
                                onChange={(e) => { setNewItemAudience(e.target.value); setNewItemSubject(''); }} 
                                options={targetAudienceOptions} 
                            />
                            <FormSelect 
                                label="2. Subject" 
                                name="subject" 
                                value={newItemSubject} 
                                onChange={(e) => setNewItemSubject(e.target.value)} 
                                options={availableSubjects} 
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">3. Medium</label>
                            <div className="flex flex-wrap gap-3">
                                {['Sinhala', 'Tamil', 'English'].map(medium => (
                                    <label key={medium} className={`flex items-center px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${newItemMediums.includes(medium) ? 'bg-primary/10 border-primary text-primary font-medium' : 'bg-light-background dark:bg-dark-background border-light-border dark:border-dark-border text-light-text dark:text-dark-text'}`}>
                                        <input type="checkbox" className="hidden" checked={newItemMediums.includes(medium)} onChange={() => toggleMedium(medium)} />
                                        {newItemMediums.includes(medium) && <CheckCircleIcon className="w-4 h-4 mr-1.5" />}
                                        {medium}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {availableGrades.length > 0 && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">4. Grade(s)</label>
                                <div className="flex flex-wrap gap-2">
                                    {availableGrades.map(grade => (
                                        <label key={grade} className={`flex items-center px-3 py-1 rounded-md border cursor-pointer text-xs sm:text-sm transition-colors ${newItemGrades.includes(grade) ? 'bg-primary text-white border-primary' : 'bg-light-background dark:bg-dark-background border-light-border dark:border-dark-border text-light-text dark:text-dark-text'}`}>
                                            <input type="checkbox" className="hidden" checked={newItemGrades.includes(grade)} onChange={() => toggleGrade(grade)} />
                                            {grade}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button onClick={handleAddTeachingItem} className="mt-2 flex items-center justify-center w-full py-2 px-4 border border-dashed border-primary text-primary rounded-md hover:bg-primary/10 transition-colors font-medium">
                            <PlusIcon className="w-4 h-4 mr-2" /> Add This Subject
                        </button>
                    </div>

                    {/* Display Added Items */}
                    {formData.teachingItems && formData.teachingItems.length > 0 && (
                        <div className="space-y-2">
                            <h5 className="text-sm font-semibold text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Your Teaching Areas</h5>
                            {formData.teachingItems.map((item) => (
                                <div key={item.id} className="flex items-start justify-between p-3 bg-light-background dark:bg-dark-background rounded-md border border-light-border dark:border-dark-border">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-primary">{item.subject}</span>
                                            <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-700 dark:text-gray-300">{item.mediums.join(', ')}</span>
                                        </div>
                                        <p className="text-xs text-light-subtle dark:text-dark-subtle mt-1">{item.audience}</p>
                                        {item.grades.length > 0 && <p className="text-xs text-light-text dark:text-dark-text mt-1 font-medium">{item.grades.join(', ')}</p>}
                                    </div>
                                    <button onClick={() => handleRemoveTeachingItem(item.id)} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 p-1.5 rounded-full transition-colors">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <hr className="border-light-border dark:border-dark-border" />

                    <FormInput label="Years of Experience" name="experienceYears" type="number" value={formData.experienceYears?.toString() || ''} onChange={handleChange} />
                    <TagInput label="Qualifications" tags={formData.qualifications || []} onTagsChange={(tags) => handleTagsChange('qualifications', tags)} />
                </div>
            );
            case 1: return (
                 <div className="space-y-4">
                    <FormInput label="Contact Number" name="contact.phone" type="tel" value={formData.contact?.phone || ''} onChange={handleChange} />
                    <FormInput label="Email Address" name="contact.email" type="email" value={formData.contact?.email || ''} onChange={handleChange} />
                    <FormInput label="Your Location (City)" name="contact.location" value={formData.contact?.location || ''} onChange={handleChange} />
                    <ImageUploadInput label="Profile Picture" currentImage={profileImage} onImageChange={setProfileImage} aspectRatio="aspect-square" />
                    <MarkdownEditor
                        label="Bio (Tell students about yourself)"
                        id="bio-completion"
                        name="bio"
                        value={formData.bio || ''}
                        onChange={handleChange}
                        rows={5}
                        placeholder="Minimum 50 characters..."
                    />
                </div>
            );
            case 2: return (
                <div className="space-y-6">
                    <div className="space-y-4">
                        <FormInput label="Profile Tagline" name="tagline" value={formData.tagline || ''} onChange={handleChange} placeholder="e.g., Passionate Physics Educator" />
                        <ImageUploadInput label="Cover Image" currentImage={coverImage} onImageChange={setCoverImage} aspectRatio="aspect-video" />
                        <TagInput label="Other Exams You Prepare For" tags={formData.exams || []} onTagsChange={(tags) => handleTagsChange('exams', tags)} />
                    </div>

                    <div className="p-4 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg">
                        <h4 className="font-semibold text-lg mb-4 flex items-center text-light-text dark:text-dark-text">
                            <MapPinIcon className="w-5 h-5 mr-2 text-primary"/>
                            Teaching Locations (Optional)
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                             <SearchableSelect
                                label="District"
                                options={sriLankanDistricts.map(d => ({ value: d, label: d }))}
                                value={locDistrict}
                                onChange={(val) => { setLocDistrict(val); setLocTown(''); }}
                                placeholder="Select District"
                            />
                             <SearchableSelect
                                label="Town"
                                options={townOptions}
                                value={locTown}
                                onChange={setLocTown}
                                placeholder="Select Town"
                                disabled={!locDistrict}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Institute Name</label>
                                <input 
                                    type="text" 
                                    list="institute-suggestions" 
                                    value={locInstitute} 
                                    onChange={handleInstituteChange} 
                                    placeholder="Type or select..."
                                    className="w-full px-3 py-2 border border-light-border dark:border-dark-border bg-light-background dark:bg-dark-background rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-light-text dark:text-dark-text"
                                    disabled={!locDistrict || !locTown}
                                />
                                <datalist id="institute-suggestions">
                                    {instituteSuggestions.map((item, i) => <option key={i} value={item.name} />)}
                                </datalist>
                                {(!locDistrict || !locTown) && <p className="text-xs text-light-subtle dark:text-dark-subtle mt-1">Select District and Town first.</p>}
                            </div>
                             <FormSelect 
                                label="Type" 
                                name="locType" 
                                value={locType} 
                                onChange={(e) => setLocType(e.target.value as InstituteType)} 
                                options={instituteTypes.map(t => ({ value: t, label: t }))} 
                            />
                        </div>
                        
                        <button onClick={handleAddLocation} className="mt-2 flex items-center justify-center w-full py-2 px-4 border border-dashed border-primary text-primary rounded-md hover:bg-primary/10 transition-colors font-medium">
                            <PlusIcon className="w-4 h-4 mr-2" /> Add Location
                        </button>

                        {formData.teachingLocations && formData.teachingLocations.length > 0 && (
                             <div className="mt-4 space-y-2">
                                {formData.teachingLocations.map(loc => (
                                    <div key={loc.id} className="flex justify-between items-center p-3 bg-light-background dark:bg-dark-background rounded-md border border-light-border dark:border-dark-border">
                                        <div>
                                            <p className="font-semibold text-sm text-light-text dark:text-dark-text">{loc.instituteName}</p>
                                            <p className="text-xs text-light-subtle dark:text-dark-subtle">{loc.instituteType} • {loc.town}, {loc.district}</p>
                                        </div>
                                        <button onClick={() => handleRemoveLocation(loc.id)} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 p-1.5 rounded-full">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            );
            case 3: return (
                 <div className="space-y-6">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 rounded-r-md">
                        <p className="font-bold text-blue-800 dark:text-blue-200">Why Verification?</p>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            Verifying your ID and Bank details builds trust with students and is required to enable withdrawals of your earnings. This information is kept confidential.
                        </p>
                    </div>
                    <ImageUploadInput label="ID Document (NIC/Passport/License)" currentImage={idImage} onImageChange={setIdImage} />
                    <ImageUploadInput label="Bank Document (Passbook/Statement)" currentImage={bankImage} onImageChange={setBankImage} />
                </div>
            );
            default: return null;
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Complete Your Teacher Profile" size="2xl">
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <ProgressBar value={progress} max={100} />
                    <span className="font-bold text-lg text-light-text dark:text-dark-text">{progress}%</span>
                </div>
                 <div className="relative p-4 bg-light-background dark:bg-dark-background rounded-lg border border-light-border dark:border-dark-border min-h-[300px]">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-light-text dark:text-dark-text">{steps[step].name}</h3>
                        <span className="text-xs font-medium text-light-subtle dark:text-dark-subtle">Step {step + 1} of {steps.length}</span>
                    </div>
                    {renderStepContent()}
                </div>
                <div className="flex justify-between items-center pt-4">
                    <button onClick={() => setStep(prev => prev - 1)} disabled={step === 0 || isSaving} className="flex items-center space-x-2 px-4 py-2 text-sm font-medium border border-primary text-primary rounded-md hover:bg-primary/10 transition-colors disabled:opacity-50">
                        <ChevronLeftIcon className="w-4 h-4" />
                        <span>Previous</span>
                    </button>
                    <button onClick={step < steps.length - 1 ? handleNextStep : handleFinish} disabled={isSaving} className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50">
                        <span>{isSaving ? 'Saving...' : (step === steps.length - 1 ? 'Finish' : 'Continue')}</span>
                        {step < steps.length - 1 ? <ChevronRightIcon className="w-4 h-4" /> : <CheckCircleIcon className="w-4 h-4"/>}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default TeacherProfileCompletionModal;
