
import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../Modal';
import FormInput from '../FormInput';
import FormSelect from '../FormSelect';
import SearchableSelect from '../SearchableSelect';
import { SaveIcon, XIcon } from '../Icons.tsx';
import { IndividualClass, Teacher } from '../../types';
import { sriLankanDistricts, sriLankanTownsByDistrict, targetAudienceOptions } from '../../data/mockData.ts';
import { useNavigation } from '../../contexts/NavigationContext';
import { useData } from '../../contexts/DataContext';
import MarkdownEditor from '../MarkdownEditor';

interface TIScheduleClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (classDetails: IndividualClass) => void;
  instituteId: string;
  initialData?: IndividualClass | null;
}

const initialClassState: Omit<IndividualClass, 'id'> = {
    teacherId: '',
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

const TIScheduleClassModal: React.FC<TIScheduleClassModalProps> = ({ isOpen, onClose, onSave, instituteId, initialData }) => {
    const { subjects } = useNavigation();
    const { teachers, tuitionInstitutes } = useData();
    const [classDetails, setClassDetails] = useState<Partial<IndividualClass>>({});
    const [error, setError] = useState('');
    
    const institute = useMemo(() => tuitionInstitutes.find(ti => ti.id === instituteId), [tuitionInstitutes, instituteId]);
    const instituteName = institute?.name;
    
    // Logic to get teaching items from selected teacher
    const selectedTeacher = useMemo(() => teachers.find(t => t.id === classDetails.teacherId), [teachers, classDetails.teacherId]);
    const teachingItems = selectedTeacher?.teachingItems || [];
    const hasTeachingItems = teachingItems.length > 0;


    const teacherOptions = useMemo(() => {
        return teachers
            .filter(t => t.registrationStatus === 'approved')
            .map(t => ({ value: t.id, label: `${t.name} (${t.id})` }));
    }, [teachers]);

    // Filtered Options based on Teacher Profile
    const audienceOptions = useMemo(() => {
        if (hasTeachingItems) {
             const audiences = Array.from(new Set(teachingItems.map(i => i.audience))).map(a => ({ value: a, label: a }));
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
             if (classDetails.subject && !options.some(s => s.value === classDetails.subject)) {
                options.push({ value: classDetails.subject, label: classDetails.subject });
            }
            return options;
        }
        return subjects[classDetails.targetAudience || ''] || [];
    }, [hasTeachingItems, teachingItems, classDetails.targetAudience, subjects, classDetails.subject]);

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


    useEffect(() => {
        if (isOpen) {
            setError('');
            if (initialData) {
                setClassDetails({
                    ...initialData,
                    fee: initialData.fee.toString() as any,
                    institute: initialData.institute || instituteName,
                    medium: initialData.medium || '',
                    grade: initialData.grade || ''
                });
            } else {
                 // Try to auto-detect location based on institute address
                 let defaultDistrict = '';
                 let defaultTown = '';
                 
                 if (institute?.address) {
                     const addrState = institute.address.state;
                     const addrCity = institute.address.city;
                     
                     // Check if state matches a known district
                     if (sriLankanDistricts.includes(addrState)) {
                         defaultDistrict = addrState;
                         // Check if city matches a town in that district
                         if (sriLankanTownsByDistrict[defaultDistrict]?.includes(addrCity)) {
                             defaultTown = addrCity;
                         }
                     } else {
                         // Fallback: search all districts to see if state matches a town? Unlikely.
                         // Or iterate districts to find where city exists.
                         const foundDistrict = sriLankanDistricts.find(d => sriLankanTownsByDistrict[d]?.includes(addrCity));
                         if (foundDistrict) {
                             defaultDistrict = foundDistrict;
                             defaultTown = addrCity;
                         }
                     }
                 }

                 setClassDetails({
                    ...initialClassState,
                    instituteId: instituteId,
                    institute: instituteName,
                    fee: '' as any,
                    district: defaultDistrict,
                    town: defaultTown
                });
            }
        }
    }, [isOpen, initialData, instituteId, instituteName, institute]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setClassDetails(prev => {
            const newState = { ...prev, [name]: value };
            if (name === 'mode' && value === 'Online') {
                newState.paymentMethod = 'platform';
            }
            if (name === 'targetAudience' && hasTeachingItems) {
                 newState.subject = '';
                 newState.medium = '';
                 newState.grade = '';
            }
            if (name === 'subject' && hasTeachingItems) {
                 newState.medium = '';
                 newState.grade = '';
            }
            return newState;
        });
    };

    const handleTeacherChange = (teacherId: string) => {
        setClassDetails(prev => ({ 
            ...prev, 
            teacherId,
            // Reset selections when teacher changes
            targetAudience: '', 
            subject: '',
            medium: '',
            grade: ''
        }));
    };

    const handleDistrictChange = (value: string) => {
        setClassDetails(prev => ({ ...prev, district: value, town: '' }));
    };

    const townOptions = useMemo(() => {
        if (!classDetails.district) return [];
        const towns = sriLankanTownsByDistrict[classDetails.district] || [];
        return [{ value: '', label: 'Select a town' }, ...towns.map(t => ({ value: t, label: t }))];
    }, [classDetails.district]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (!classDetails.teacherId) {
            setError('You must select a teacher.');
            return;
        }

        if (institute && selectedTeacher && selectedTeacher.commissionRate > institute.commissionRate) {
            setError(`Institute commission rate (${institute.commissionRate}%) cannot be lower than the teacher's base rate (${selectedTeacher.commissionRate}%).`);
            return;
        }

        onSave({
            ...initialClassState,
            ...classDetails,
            id: initialData?.id || Date.now(),
            fee: parseFloat(classDetails.fee as any) || 0,
        } as IndividualClass);
    };
    
    const modalTitle = initialData ? 'Edit Class Details' : 'Schedule New Class for Institute';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="3xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                <SearchableSelect
                    label="Select Teacher"
                    options={teacherOptions}
                    value={classDetails.teacherId || ''}
                    onChange={handleTeacherChange}
                    placeholder="Search for a registered teacher by name or ID..."
                    disabled={!!initialData}
                />
                <FormInput label="Class Title" name="title" value={classDetails.title || ''} onChange={handleChange} required />
                
                <FormSelect label="Target Audience" name="targetAudience" value={classDetails.targetAudience || ''} onChange={handleChange} options={audienceOptions} required />
                <FormSelect label="Subject" name="subject" value={classDetails.subject || ''} onChange={handleChange} options={subjectOptionsForAudience} required />
                
                {hasTeachingItems && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <FormSelect label="Medium" name="medium" value={classDetails.medium || ''} onChange={handleChange} options={[{value: '', label: 'Select Medium'}, ...mediumOptions]} />
                         <FormSelect label="Grade" name="grade" value={classDetails.grade || ''} onChange={handleChange} options={[{value: '', label: 'Select Grade'}, ...gradeOptions]} />
                    </div>
                )}

                <MarkdownEditor
                    label="Description"
                    id="ti-class-description"
                    name="description"
                    value={classDetails.description || ''}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Briefly describe the class"
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormSelect label="Recurrence" name="recurrence" value={classDetails.recurrence || 'none'} onChange={handleChange} options={[{value: 'none', label: 'One-time'}, {value: 'weekly', label: 'Weekly'}]} required />
                    <FormInput label={classDetails.recurrence === 'weekly' ? "Start Date" : "Date"} name="date" type="date" value={classDetails.date || ''} onChange={handleChange} required />
                </div>
                {classDetails.recurrence === 'weekly' && (
                     <FormInput label="End Date (Optional)" name="endDate" type="date" value={classDetails.endDate || ''} onChange={handleChange} />
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormInput label="Start Time" name="startTime" type="time" value={classDetails.startTime || ''} onChange={handleChange} required />
                    <FormInput label="End Time" name="endTime" type="time" value={classDetails.endTime || ''} onChange={handleChange} required />
                    <div>
                        <FormInput label="Fee (LKR)" name="fee" type="number" value={classDetails.fee as any || ''} onChange={handleChange} required />
                        <p className="text-xs text-light-subtle dark:text-dark-subtle mt-1">
                            Fee is per session. For recurring classes, this will be charged for each weekly session.
                        </p>
                    </div>
                </div>
                
                <FormSelect label="Mode" name="mode" value={classDetails.mode || 'Online'} onChange={handleChange} options={[{value: 'Online', label: 'Online'}, {value: 'Physical', label: 'Physical'}, {value: 'Both', label: 'Online & Physical'}]} required />
                
                {(classDetails.mode === 'Physical' || classDetails.mode === 'Both') && (
                    <div className="p-4 border border-light-border dark:border-dark-border rounded-md space-y-4">
                        <h3 className="font-medium">Physical Location & Payment</h3>
                        <FormInput label="Institute / Hall Name" name="institute" value={classDetails.institute || ''} onChange={handleChange} disabled />
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SearchableSelect
                                label="District"
                                options={sriLankanDistricts.map(d => ({ value: d, label: d }))}
                                value={classDetails.district || ''}
                                onChange={handleDistrictChange}
                                placeholder="Select a district"
                            />
                             <SearchableSelect
                                label="Town"
                                options={townOptions}
                                value={classDetails.town || ''}
                                onChange={(value) => setClassDetails(prev => ({...prev, town: value}))}
                                placeholder="Select a district first"
                                disabled={!classDetails.district}
                            />
                        </div>
                         <FormSelect
                            label="Payment Collection Method"
                            name="paymentMethod"
                            value={classDetails.paymentMethod || 'platform'}
                            onChange={handleChange}
                            options={[
                                { value: 'platform', label: 'Collect through clazz.lk (Recommended)' },
                                { value: 'manual', label: 'Collect manually at venue' }
                            ]}
                            required
                        />
                    </div>
                )}
                {(classDetails.mode === 'Online' || classDetails.mode === 'Both') && (
                    <div className="p-4 border border-light-border dark:border-dark-border rounded-md space-y-4">
                        <h3 className="font-medium">Online Details</h3>
                        <FormInput 
                            label="Online Joining Link (Zoom, Meet, etc.)" 
                            name="joiningLink" 
                            type="url" 
                            value={classDetails.joiningLink || ''} 
                            onChange={handleChange} 
                            placeholder="e.g., https://zoom.us/j/1234567890" 
                        />
                        <p className="text-xs text-light-subtle dark:text-dark-subtle -mt-3">
                            This link will only become visible to enrolled students after the class starts.
                        </p>
                        <FormInput 
                            label="Shared Document Link (Google Drive, etc.)" 
                            name="documentLink" 
                            type="url" 
                            value={classDetails.documentLink || ''} 
                            onChange={handleChange} 
                            placeholder="e.g., https://drive.google.com/drive/folders/..." 
                        />
                        <p className="text-xs text-light-subtle dark:text-dark-subtle -mt-3">
                            This link will be visible to students immediately after they enroll.
                        </p>
                    </div>
                )}

                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                <div className="pt-4 flex justify-end space-x-3">
                     <button type="button" onClick={onClose} className="inline-flex items-center justify-center px-4 py-2 border border-light-border dark:border-dark-border text-sm font-medium rounded-md shadow-sm text-light-text dark:text-dark-text bg-light-surface dark:bg-dark-surface hover:bg-light-border dark:hover:bg-dark-border/50">
                        <XIcon className="w-4 h-4 mr-2"/>
                        Cancel
                    </button>
                    <button type="submit" className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark">
                        <SaveIcon className="w-4 h-4 mr-2"/>
                        Save Class
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default TIScheduleClassModal;
