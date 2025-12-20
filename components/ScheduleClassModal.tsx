
import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import FormInput from './FormInput';
import FormSelect from './FormSelect';
import { SaveIcon, XIcon, SpinnerIcon, PlusIcon, TrashIcon } from './Icons';
import { IndividualClass, Teacher } from '../types';
import { targetAudienceOptions, sriLankanDistricts, sriLankanTownsByDistrict } from '../data/mockData';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import MarkdownEditor from './MarkdownEditor';
import SearchableSelect from './SearchableSelect';

interface ScheduleClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (classDetails: IndividualClass) => void;
  initialData: IndividualClass | null;
  teacherId: string;
}

const initialClassState: Omit<IndividualClass, 'id'> = {
    teacherId: '', // This will be replaced by the prop
    title: '',
    subject: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    fee: 0,
    currency: 'LKR',
    targetAudience: '',
    mode: 'Online',
    recurrence: 'none',
    status: 'scheduled',
    isPublished: false,
    paymentMethod: 'platform',
    documentLink: '',
    medium: '',
    grade: ''
};

const ScheduleClassModal: React.FC<ScheduleClassModalProps> = ({ isOpen, onClose, onSave, initialData, teacherId }) => {
    const { subjects } = useNavigation();
    const { currentUser } = useAuth();
    const { teachers } = useData();
    const [classDetails, setClassDetails] = useState<Partial<IndividualClass>>({});
    const [customTargetAudience, setCustomTargetAudience] = useState('');
    const [customSubject, setCustomSubject] = useState('');
    const [error, setError] = useState('');
    const [isCreatingMeet, setIsCreatingMeet] = useState(false);
    
    // State for flexible dates
    const [flexibleDates, setFlexibleDates] = useState<{ date: string; startTime: string; endTime: string }[]>([]);
    const [newFlexibleDate, setNewFlexibleDate] = useState({ date: '', startTime: '', endTime: '' });

    // Local state to track which ID from the teacher's profile is selected
    const [selectedLocationId, setSelectedLocationId] = useState<string>('');

    const isGoogleMeetMode = useMemo(() => initialData?.meetProvider === 'google' || classDetails.meetProvider === 'google', [initialData, classDetails]);
    
    // Get the teacher object to access teachingItems and teachingLocations
    const teacher = useMemo(() => teachers.find(t => t.id === teacherId), [teachers, teacherId]);
    const teachingItems = teacher?.teachingItems || [];
    const hasTeachingItems = teachingItems.length > 0;
    const teachingLocations = teacher?.teachingLocations || [];

    const audienceOptions = useMemo(() => {
        if (hasTeachingItems) {
            const audiences = Array.from(new Set(teachingItems.map(i => i.audience))).map(a => ({ value: a, label: a }));
            // Ensure current selected audience is in the list to prevent it from disappearing in edit mode
            if (classDetails.targetAudience && !audiences.some(a => a.value === classDetails.targetAudience)) {
                audiences.push({ value: classDetails.targetAudience, label: classDetails.targetAudience });
            }
            return audiences;
        }
        return targetAudienceOptions;
    }, [hasTeachingItems, teachingItems, classDetails.targetAudience]);

    const subjectOptionsForAudience = useMemo(() => {
        if (hasTeachingItems) {
            const availableSubjects = Array.from(new Set(teachingItems
                .filter(i => i.audience === classDetails.targetAudience)
                .map(i => i.subject)));
            
            const options = availableSubjects.map(s => ({ value: s, label: s }));
            
             // Ensure current selected subject is in the list
            if (classDetails.subject && !options.some(s => s.value === classDetails.subject)) {
                options.push({ value: classDetails.subject, label: classDetails.subject });
            }
            return options;
        }

        if (!classDetails.targetAudience || !subjects[classDetails.targetAudience]) {
            return [{ value: 'Other', label: 'Other (please specify)' }];
        }
        return [...subjects[classDetails.targetAudience], { value: 'Other', label: 'Other (please specify)' }];
    }, [classDetails.targetAudience, subjects, hasTeachingItems, teachingItems, classDetails.subject]);

    const mediumOptions = useMemo(() => {
        if (hasTeachingItems) {
            const mediums = new Set<string>();
            teachingItems
                .filter(i => i.audience === classDetails.targetAudience && i.subject === classDetails.subject)
                .forEach(i => i.mediums.forEach(m => mediums.add(m)));
            
            const options = Array.from(mediums).map(m => ({ value: m, label: m }));
             if (classDetails.medium && !options.some(o => o.value === classDetails.medium)) {
                options.push({ value: classDetails.medium, label: classDetails.medium });
            }
            return options;
        }
        return [];
    }, [hasTeachingItems, teachingItems, classDetails.targetAudience, classDetails.subject, classDetails.medium]);

    const gradeOptions = useMemo(() => {
        if (hasTeachingItems) {
            const grades = new Set<string>();
            teachingItems
                .filter(i => i.audience === classDetails.targetAudience && i.subject === classDetails.subject)
                .forEach(i => i.grades.forEach(g => grades.add(g)));
            
            const options = Array.from(grades).map(g => ({ value: g, label: g }));
             if (classDetails.grade && !options.some(o => o.value === classDetails.grade)) {
                options.push({ value: classDetails.grade, label: classDetails.grade });
            }
            return options;
        }
        return [];
    }, [hasTeachingItems, teachingItems, classDetails.targetAudience, classDetails.subject, classDetails.grade]);

    const locationOptions = useMemo(() => {
        const options = teachingLocations.map(loc => ({
            value: loc.id,
            label: `${loc.instituteName} - ${loc.town} (${loc.district})`
        }));

        // Handle legacy/preserved location for existing classes
        if (initialData?.id && (initialData.mode === 'Physical' || initialData.mode === 'Both')) {
             const matched = teachingLocations.some(l => 
                l.instituteName === initialData.institute && 
                l.town === initialData.town && 
                l.district === initialData.district
             );
             
             if (!matched) {
                 const label = [initialData.institute, initialData.town].filter(Boolean).join(' - ') || "Unspecified Location";
                 options.unshift({
                     value: 'legacy_location',
                     label: `${label} (Legacy/Editable)`
                 });
             }
        }
        
        // Admin Override
        if (currentUser?.role === 'admin') {
            options.push({ value: 'custom_location', label: 'Custom / New Location (Admin Only)' });
        }

        return options;
    }, [teachingLocations, initialData, currentUser]);
    
    const townOptions = useMemo(() => {
        if (!classDetails.district) return [];
        const towns = sriLankanTownsByDistrict[classDetails.district] || [];
        return [{ value: '', label: 'Select a town' }, ...towns.map(t => ({ value: t, label: t }))];
    }, [classDetails.district]);


    useEffect(() => {
        if (isOpen) {
            setError('');
            const isNewClass = !initialData || !initialData.id;

            if (isNewClass) {
                const defaultAudience = hasTeachingItems ? teachingItems[0].audience : 'Secondary school students (Grade 6–11 / O/L candidates)';
                const defaultSubject = hasTeachingItems 
                    ? (teachingItems.find(i => i.audience === defaultAudience)?.subject || '') 
                    : (subjects[defaultAudience]?.[0]?.value || '');

                // Handles both completely new classes and pre-filled new classes (like G-Meet)
                setClassDetails({
                    ...initialClassState,
                    teacherId: teacherId,
                    fee: '' as any,
                    targetAudience: defaultAudience,
                    subject: defaultSubject,
                    ...(initialData || {}), // This will merge { meetProvider: 'google' } if it exists
                });
                setCustomTargetAudience('');
                setCustomSubject('');
                setFlexibleDates([]);
                setSelectedLocationId('');
            } else { // This is an existing class being edited
                // Use initialData directly to avoid dependency on global teachers array changing
                const dataToUse = initialData;

                const feeString = dataToUse.fee?.toString() as any || '';
                
                let customAudience = '';
                let customSub = '';

                if (!hasTeachingItems) {
                     const isPredefinedAudience = targetAudienceOptions.some(opt => opt.value === dataToUse.targetAudience);
                     if (!isPredefinedAudience || dataToUse.targetAudience === 'Other') {
                         customAudience = dataToUse.targetAudience || '';
                     }
                     
                     const subjectOptionsForAudience = subjects[dataToUse.targetAudience] || [];
                     const isPredefinedSubject = subjectOptionsForAudience.some(opt => opt.value === dataToUse.subject);
                     if (!isPredefinedSubject) {
                         customSub = dataToUse.subject || '';
                     }
                }

                setClassDetails({
                    ...dataToUse,
                    fee: feeString,
                    medium: dataToUse.medium || '',
                    grade: dataToUse.grade || '',
                });
                setCustomTargetAudience(customAudience);
                setCustomSubject(customSub);
                setFlexibleDates(dataToUse.flexibleDates || []);

                // Try to match existing class details to a saved location ID
                const matchedLocation = teachingLocations.find(
                    loc => loc.instituteName === dataToUse.institute && 
                           loc.town === dataToUse.town && 
                           loc.district === dataToUse.district
                );
                if (matchedLocation) {
                    setSelectedLocationId(matchedLocation.id);
                } else if (dataToUse.id && (dataToUse.mode === 'Physical' || dataToUse.mode === 'Both')) {
                    // Default to legacy if editing an existing physical class that doesn't match
                    setSelectedLocationId('legacy_location'); 
                } else {
                    setSelectedLocationId('');
                }
            }
        }
        // CRITICAL FIX: Removed 'teachers', 'teachingItems', etc. to prevent form reset when background data updates.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, initialData]); 
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setClassDetails(prev => {
            const newState = { ...prev, [name]: value };
            if (name === 'mode') {
                if (value === 'Online') {
                    newState.paymentMethod = 'platform';
                    newState.institute = '';
                    newState.district = '';
                    newState.town = '';
                    setSelectedLocationId('');
                }
            }
            if (name === 'targetAudience' && value !== 'Other') {
                setCustomTargetAudience('');
                if (hasTeachingItems) {
                    const firstValidSubject = teachingItems.find(i => i.audience === value)?.subject || '';
                    newState.subject = firstValidSubject;
                    newState.medium = '';
                    newState.grade = '';
                } else {
                    const newAudienceSubjects = subjects[value] || [];
                    newState.subject = newAudienceSubjects[0]?.value || 'Other';
                }
            }
            if (name === 'subject') {
                 if (value !== 'Other') setCustomSubject('');
                 if (hasTeachingItems) {
                    newState.medium = '';
                    newState.grade = '';
                 }
            }
            return newState;
        });
    };

    const handleLocationSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const locId = e.target.value;
        setSelectedLocationId(locId);

        if (!locId) {
             // Clear fields if deselected to ensure validation fails or no stale data persists
             setClassDetails(prev => ({
                ...prev,
                institute: '',
                district: '',
                town: ''
            }));
            return;
        }
        
        if (locId === 'legacy_location' && initialData) {
             // Populate fields with legacy data but allow editing
             setClassDetails(prev => ({
                ...prev,
                institute: initialData.institute || '',
                district: initialData.district || '',
                town: initialData.town || ''
            }));
        } else if (locId === 'custom_location') {
             // Clear fields for new manual entry
             setClassDetails(prev => ({
                ...prev,
                institute: '',
                district: '',
                town: ''
            }));
        } else {
            // Profile location - locked fields
            const location = teachingLocations.find(l => l.id === locId);
            if (location) {
                setClassDetails(prev => ({
                    ...prev,
                    institute: location.instituteName,
                    district: location.district,
                    town: location.town
                }));
            }
        }
    };

    const handleAddFlexibleDate = () => {
        if (newFlexibleDate.date && newFlexibleDate.startTime && newFlexibleDate.endTime) {
            setFlexibleDates(prev => [...prev, newFlexibleDate]);
            setNewFlexibleDate({ date: '', startTime: '', endTime: '' });
        }
    };

    const handleRemoveFlexibleDate = (index: number) => {
        setFlexibleDates(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (isGoogleMeetMode) {
            setIsCreatingMeet(true);
        }

        let finalJoiningLink = classDetails.joiningLink || '';
        let finalGoogleEventId = classDetails.googleEventId || '';

        try {
            if (isGoogleMeetMode) {
                const createMeetUrl = 'https://google-meet-handler-980531128265.us-central1.run.app/createGoogleMeet';
                const response = await fetch(createMeetUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        teacherId: currentUser?.role === 'admin' ? teacherId : (currentUser?.id || teacherId),
                        title: classDetails.title,
                        startTime: classDetails.startTime,
                        endTime: classDetails.endTime,
                        date: classDetails.date,
                        googleEventId: classDetails.googleEventId,
                    }),
                });
                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'Failed to create or update Google Meet link.');
                }
                finalJoiningLink = data.meetLink;
                finalGoogleEventId = data.eventId;
            } else if ((classDetails.mode === 'Online' || classDetails.mode === 'Both') && classDetails.joiningLink) {
                new URL(classDetails.joiningLink);
            }

            const finalTargetAudience = (classDetails.targetAudience === 'Other' && !hasTeachingItems) ? customTargetAudience : classDetails.targetAudience;
            if (!finalTargetAudience?.trim()) throw new Error('Target Audience is a required field.');

            const finalSubject = (classDetails.subject === 'Other' && !hasTeachingItems) ? customSubject : classDetails.subject;
            if (!finalSubject?.trim()) throw new Error('Subject is a required field.');

            // Validate location for physical classes
            if ((classDetails.mode === 'Physical' || classDetails.mode === 'Both') && !isGoogleMeetMode) {
                if (!classDetails.institute || !classDetails.district || !classDetails.town) {
                    throw new Error('Please select a valid teaching location or ensure all location fields are filled.');
                }
            }

            let finalDetails: Partial<IndividualClass> = {};
            if (classDetails.recurrence === 'flexible') {
                if (flexibleDates.length === 0) throw new Error('Please add at least one date for a flexible class.');
                const sortedDates = [...flexibleDates].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                finalDetails = {
                    flexibleDates: sortedDates,
                    // Use first date for main date/time fields for consistency
                    date: sortedDates[0].date,
                    startTime: sortedDates[0].startTime,
                    endTime: sortedDates[0].endTime,
                };
            } else {
                 const selectedDateTime = new Date(`${classDetails.date}T${classDetails.startTime}`);
                 const now = new Date();
                 if ((!initialData?.id || classDetails.status === 'scheduled') && selectedDateTime < now) {
                     throw new Error('Cannot schedule a class in the past.');
                 }
            }
            
            onSave({
                ...classDetails,
                ...finalDetails,
                joiningLink: finalJoiningLink,
                googleEventId: finalGoogleEventId,
                targetAudience: finalTargetAudience,
                subject: finalSubject,
                id: initialData?.id || Date.now(),
                fee: parseFloat(classDetails.fee as any) || 0,
            } as IndividualClass);

        } catch (err: any) {
            setError(err.message || 'An error occurred.');
        } finally {
            setIsCreatingMeet(false);
        }
    };

    const modalTitle = initialData ? (initialData.meetProvider === 'google' && !initialData.id ? 'Schedule with Google Meet' : 'Edit Class Details') : 'Schedule a New Class';
    const isLocationEditable = selectedLocationId === 'legacy_location' || selectedLocationId === 'custom_location';
    const isProfileLocation = selectedLocationId && !isLocationEditable;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="3xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                <FormInput label="Class Title" name="title" value={classDetails.title || ''} onChange={handleChange} required placeholder="e.g., A-Level Physics 2025 Theory"/>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormSelect 
                        label="Target Audience"
                        name="targetAudience"
                        value={classDetails.targetAudience || ''}
                        onChange={handleChange}
                        options={audienceOptions}
                        required
                    />
                    <FormSelect label="Subject" name="subject" value={classDetails.subject || ''} onChange={handleChange} options={subjectOptionsForAudience} required />
                </div>

                {!hasTeachingItems && classDetails.targetAudience === 'Other' && (
                     <FormInput
                        label="Please specify audience"
                        name="customTargetAudience"
                        value={customTargetAudience}
                        onChange={(e) => setCustomTargetAudience(e.target.value)}
                        required
                        placeholder="e.g., International school grade 8"
                    />
                )}
                {!hasTeachingItems && classDetails.subject === 'Other' && (
                     <FormInput
                        label="Please specify subject"
                        name="customSubject"
                        value={customSubject}
                        onChange={(e) => setCustomSubject(e.target.value)}
                        required
                        placeholder="e.g., Advanced Robotics"
                    />
                )}

                {hasTeachingItems && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <FormSelect label="Medium" name="medium" value={classDetails.medium || ''} onChange={handleChange} options={[{value: '', label: 'Select Medium'}, ...mediumOptions]} />
                         <FormSelect label="Grade" name="grade" value={classDetails.grade || ''} onChange={handleChange} options={[{value: '', label: 'Select Grade'}, ...gradeOptions]} />
                    </div>
                )}

                 <MarkdownEditor
                    key={initialData?.id || `new-class-${isOpen}`}
                    label="Description"
                    id="description"
                    name="description"
                    value={classDetails.description || ''}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Briefly describe the class"
                />
                <FormSelect label="Recurrence" name="recurrence" value={classDetails.recurrence || 'none'} onChange={handleChange} options={[{value: 'none', label: 'One-time'}, {value: 'weekly', label: 'Weekly'}, {value: 'flexible', label: 'Flexible'}]} required />
                
                {classDetails.recurrence === 'weekly' && (
                    <div className="p-4 border border-dashed border-light-border dark:border-dark-border rounded-md space-y-4">
                        <FormInput label="Start Date" name="date" type="date" value={classDetails.date || ''} onChange={handleChange} required />
                        <FormInput label="End Date (Optional)" name="endDate" type="date" value={classDetails.endDate || ''} onChange={handleChange} />
                        <FormSelect label="Payment Option" name="weeklyPaymentOption" value={classDetails.weeklyPaymentOption || 'per_session'} onChange={handleChange} options={[{value: 'per_session', label: 'Per Session'}, {value: 'per_month', label: 'Per Month'}]} />
                    </div>
                )}
                
                {classDetails.recurrence === 'flexible' && (
                    <div className="p-4 border border-dashed border-light-border dark:border-dark-border rounded-md space-y-4">
                        <h3 className="font-medium text-light-text dark:text-dark-text">Define Class Sessions</h3>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                            {flexibleDates.map((d, i) => (
                                <div key={i} className="flex items-center justify-between p-2 bg-light-surface dark:bg-dark-surface rounded-md">
                                    <p className="text-sm">{new Date(d.date).toLocaleDateString()} at {d.startTime} - {d.endTime}</p>
                                    <button type="button" onClick={() => handleRemoveFlexibleDate(i)} className="p-1 text-red-500 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col md:flex-row items-end gap-2 pt-2 border-t border-light-border dark:border-dark-border">
                            <FormInput label="Date" name="new_date" type="date" value={newFlexibleDate.date} onChange={e => setNewFlexibleDate(p => ({...p, date: e.target.value}))} />
                            <FormInput label="Start" name="new_start" type="time" value={newFlexibleDate.startTime} onChange={e => setNewFlexibleDate(p => ({...p, startTime: e.target.value}))} />
                            <FormInput label="End" name="new_end" type="time" value={newFlexibleDate.endTime} onChange={e => setNewFlexibleDate(p => ({...p, endTime: e.target.value}))} />
                            <button type="button" onClick={handleAddFlexibleDate} className="px-4 py-2 bg-primary text-white rounded-md text-sm h-10"><PlusIcon className="w-5 h-5"/></button>
                        </div>
                    </div>
                )}
                
                {classDetails.recurrence !== 'flexible' && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {classDetails.recurrence === 'none' && <FormInput label="Date" name="date" type="date" value={classDetails.date || ''} onChange={handleChange} required />}
                        <FormInput label="Start Time" name="startTime" type="time" value={classDetails.startTime || ''} onChange={handleChange} required />
                        <FormInput label="End Time" name="endTime" type="time" value={classDetails.endTime || ''} onChange={handleChange} required />
                    </div>
                )}
                
                <div>
                    <FormInput label="Fee (LKR)" name="fee" type="number" value={classDetails.fee as any || ''} onChange={handleChange} required />
                    <p className="text-xs text-light-subtle dark:text-dark-subtle mt-1">Fee is per session for 'Weekly (Per Session)' and 'One-time' classes. For 'Weekly (Per Month)' and 'Flexible', this is the total fee for the period.</p>
                </div>
                <FormSelect label="Mode" name="mode" value={classDetails.mode || 'Online'} onChange={handleChange} options={[{value: 'Online', label: 'Online'}, {value: 'Physical', label: 'Physical'}, {value: 'Both', label: 'Online & Physical'}]} required />
                
                {(classDetails.mode === 'Physical' || classDetails.mode === 'Both') && !isGoogleMeetMode && (
                    <div className="p-4 border border-light-border dark:border-dark-border rounded-md space-y-4">
                        <h3 className="font-medium text-light-text dark:text-dark-text">Physical Location & Payment</h3>
                        
                        <FormSelect
                            label="Select a Saved Location"
                            name="locationId"
                            value={selectedLocationId}
                            onChange={handleLocationSelect}
                            options={[{ value: '', label: 'Select a location...' }, ...locationOptions]}
                            required
                        />
                        
                        {locationOptions.length === 0 && (
                            <p className="text-red-500 text-xs bg-red-50 dark:bg-red-900/30 p-2 rounded-md">
                                You have not added any teaching locations to your profile yet. Please go to your Profile (Edit Profile -&gt; Optional Details) to add Institutes/Locations before scheduling a physical class.
                            </p>
                        )}
                        
                        {/* 
                           If a profile location is selected, show read-only details.
                           If a legacy or custom option is selected, show editable fields.
                        */}
                        {selectedLocationId && (
                            isProfileLocation ? (
                                <div className="p-3 bg-light-background dark:bg-dark-background rounded-md text-sm text-light-text dark:text-dark-text border border-light-border dark:border-dark-border">
                                    <p><span className="font-semibold">Institute:</span> {classDetails.institute}</p>
                                    <p><span className="font-semibold">Area:</span> {classDetails.town}, {classDetails.district}</p>
                                </div>
                            ) : (
                                <div className="space-y-4 pt-2">
                                     <FormInput label="Institute Name" name="institute" value={classDetails.institute || ''} onChange={handleChange} required placeholder="e.g., Apex Hall" />
                                     <div className="grid grid-cols-2 gap-4">
                                          <SearchableSelect
                                              label="District"
                                              options={sriLankanDistricts.map(d => ({ value: d, label: d }))}
                                              value={classDetails.district || ''}
                                              onChange={(val) => setClassDetails(prev => ({...prev, district: val, town: ''}))}
                                              placeholder="District"
                                          />
                                          <SearchableSelect
                                              label="Town"
                                              options={classDetails.district ? [{ value: '', label: 'Select a town' }, ...(sriLankanTownsByDistrict[classDetails.district] || []).map(t => ({ value: t, label: t }))] : []}
                                              value={classDetails.town || ''}
                                              onChange={(val) => setClassDetails(prev => ({...prev, town: val}))}
                                              placeholder="Town"
                                              disabled={!classDetails.district}
                                          />
                                     </div>
                                </div>
                            )
                        )}

                         <FormSelect
                            label="Payment Collection Method"
                            name="paymentMethod"
                            value={classDetails.paymentMethod || 'platform'}
                            onChange={handleChange}
                            options={[
                                { value: 'platform', label: 'Collect through clazz.lk (Recommended)' },
                                { value: 'manual', label: 'Collect manually (e.g., at venue)' }
                            ]}
                            required
                        />
                    </div>
                )}
                
                {(!isGoogleMeetMode && (classDetails.mode === 'Online' || classDetails.mode === 'Both')) && (
                     <div className="p-4 border border-light-border dark:border-dark-border rounded-md space-y-4">
                        <h3 className="font-medium text-light-text dark:text-dark-text">Online Details</h3>
                        <FormInput 
                            label="Online Joining Link (Zoom, Manual Meet, etc.)" 
                            name="joiningLink" 
                            type="url" 
                            value={classDetails.joiningLink || ''} 
                            onChange={handleChange} 
                            placeholder="e.g., https://zoom.us/j/1234567890" 
                        />
                        <FormInput 
                            label="Shared Document Link (Google Drive, etc.)" 
                            name="documentLink" 
                            type="url" 
                            value={classDetails.documentLink || ''} 
                            onChange={handleChange} 
                            placeholder="e.g., https://drive.google.com/drive/folders/..." 
                        />
                    </div>
                )}

                {isGoogleMeetMode && (
                     <div className="p-4 border border-light-border dark:border-dark-border rounded-md space-y-4">
                         <h3 className="font-medium text-light-text dark:text-dark-text">Online Details</h3>
                        <p className="text-sm p-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md">
                            A Google Meet link will be automatically generated and attached to this class upon saving.
                        </p>
                        <FormInput 
                            label="Shared Document Link (Google Drive, etc.)" 
                            name="documentLink" 
                            type="url" 
                            value={classDetails.documentLink || ''} 
                            onChange={handleChange} 
                            placeholder="e.g., https://drive.google.com/drive/folders/..." 
                        />
                    </div>
                )}
                
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                <div className="pt-4 flex justify-end space-x-3">
                     <button type="button" onClick={onClose} className="inline-flex items-center justify-center px-4 py-2 border border-light-border dark:border-dark-border text-sm font-medium rounded-md shadow-sm text-light-text dark:text-dark-text bg-light-surface dark:bg-dark-surface hover:bg-light-border dark:hover:bg-dark-border/50 transition-colors">
                        <XIcon className="w-4 h-4 mr-2"/>
                        Cancel
                    </button>
                    <button type="submit" disabled={isCreatingMeet} className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark disabled:opacity-50">
                        {isCreatingMeet ? <SpinnerIcon className="w-4 h-4 mr-2" /> : <SaveIcon className="w-4 h-4 mr-2"/>}
                        {isCreatingMeet ? 'Saving...' : 'Save Class'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default ScheduleClassModal;
