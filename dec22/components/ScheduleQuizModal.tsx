
import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal.tsx';
import FormInput from './FormInput.tsx';
import FormSelect from './FormSelect.tsx';
import { SaveIcon, XIcon } from './Icons.tsx';
import { Quiz } from '../types.ts';
import { useNavigation } from '../contexts/NavigationContext.tsx';
import { useData } from '../contexts/DataContext.tsx';
import MarkdownEditor from './MarkdownEditor.tsx';

interface ScheduleQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (quizDetails: Quiz) => void | Promise<void>;
  initialData: Quiz | null;
  teacherId: string;
}

const initialQuizState: Omit<Quiz, 'id' | 'questions'> = {
    teacherId: '',
    title: '',
    subject: '',
    description: '',
    date: '',
    startTime: '',
    durationMinutes: 30,
    fee: 0,
    currency: 'LKR',
    status: 'scheduled',
    isPublished: false,
    medium: '',
    grade: ''
};

const ScheduleQuizModal: React.FC<ScheduleQuizModalProps> = ({ isOpen, onClose, onSave, initialData, teacherId }) => {
    const { allSubjects } = useNavigation();
    const { teachers } = useData();
    const [quizDetails, setQuizDetails] = useState<Partial<Quiz>>({});
    const [isSaving, setIsSaving] = useState(false);

    const teacher = useMemo(() => teachers.find(t => t.id === teacherId), [teachers, teacherId]);
    const teachingItems = teacher?.teachingItems || [];
    const hasTeachingItems = teachingItems.length > 0;

    const subjectOptions = useMemo(() => {
        if (hasTeachingItems) {
            const uniqueSubjects = Array.from(new Set(teachingItems.map(i => i.subject)));
            const options = uniqueSubjects.map(s => ({ value: s, label: s }));
             if (quizDetails.subject && !options.some(s => s.value === quizDetails.subject)) {
               options.push({ value: quizDetails.subject, label: quizDetails.subject });
            }
            return options;
        }
        return allSubjects;
    }, [hasTeachingItems, teachingItems, allSubjects, quizDetails.subject]);

    const mediumOptions = useMemo(() => {
        if (hasTeachingItems) {
            const mediums = new Set<string>();
            teachingItems
                .filter(i => i.subject === quizDetails.subject)
                .forEach(i => i.mediums.forEach(m => mediums.add(m)));
            
            const options = Array.from(mediums).map(m => ({ value: m, label: m }));
            if (quizDetails.medium && !options.some(o => o.value === quizDetails.medium)) {
               options.push({ value: quizDetails.medium, label: quizDetails.medium });
            }
            return options;
        }
        return [];
    }, [hasTeachingItems, teachingItems, quizDetails.subject, quizDetails.medium]);

    const gradeOptions = useMemo(() => {
        if (hasTeachingItems) {
            const grades = new Set<string>();
            teachingItems
                .filter(i => i.subject === quizDetails.subject)
                .forEach(i => i.grades.forEach(g => grades.add(g)));
            
            const options = Array.from(grades).map(g => ({ value: g, label: g }));
             if (quizDetails.grade && !options.some(o => o.value === quizDetails.grade)) {
               options.push({ value: quizDetails.grade, label: quizDetails.grade });
            }
            return options;
        }
        return [];
    }, [hasTeachingItems, teachingItems, quizDetails.subject, quizDetails.grade]);


    useEffect(() => {
        if (isOpen) {
            setIsSaving(false);
            if (initialData) {
                setQuizDetails({
                    ...initialData,
                    fee: initialData.fee.toString() as any,
                    durationMinutes: initialData.durationMinutes.toString() as any,
                });
            } else {
                setQuizDetails({
                    ...initialQuizState,
                    teacherId: teacherId,
                    subject: hasTeachingItems ? teachingItems[0].subject : (allSubjects[0]?.value || ''),
                    fee: '' as any,
                    durationMinutes: '30' as any,
                });
            }
        }
    }, [isOpen, initialData, teacherId, allSubjects, hasTeachingItems, teachingItems]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setQuizDetails(prev => {
             const newState = { ...prev, [name]: value };
             if (name === 'subject' && hasTeachingItems) {
                 newState.medium = '';
                 newState.grade = '';
             }
             return newState;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave({
                ...initialQuizState,
                ...quizDetails,
                id: initialData?.id || `q_${Date.now()}`,
                questions: initialData?.questions || [],
                fee: parseFloat(quizDetails.fee as any) || 0,
                durationMinutes: parseInt(quizDetails.durationMinutes as any, 10) || 30,
                instanceStartDate: initialData?.instanceStartDate || new Date().toISOString(),
            } as Quiz);
        } catch (e) {
            console.error("Error saving quiz from modal:", e);
        }
    };

    const modalTitle = initialData ? 'Edit Quiz Details' : 'Schedule a New Quiz';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <FormInput label="Quiz Title" name="title" value={quizDetails.title || ''} onChange={handleChange} required placeholder="e.g., Physics Unit 1 Test"/>
                <FormSelect label="Subject" name="subject" value={quizDetails.subject || ''} onChange={handleChange} options={subjectOptions} required />
                
                {hasTeachingItems && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormSelect label="Medium" name="medium" value={quizDetails.medium || ''} onChange={handleChange} options={[{value: '', label: 'Select Medium'}, ...mediumOptions]} />
                            <FormSelect label="Grade" name="grade" value={quizDetails.grade || ''} onChange={handleChange} options={[{value: '', label: 'Select Grade'}, ...gradeOptions]} />
                    </div>
                )}

                 <MarkdownEditor
                    label="Description"
                    id="description"
                    name="description"
                    value={quizDetails.description || ''}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Briefly describe what this quiz covers"
                 />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput label="Date" name="date" type="date" value={quizDetails.date || ''} onChange={handleChange} required />
                    <FormInput label="Start Time" name="startTime" type="time" value={quizDetails.startTime || ''} onChange={handleChange} required />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput label="Duration (minutes)" name="durationMinutes" type="number" value={quizDetails.durationMinutes as any || ''} onChange={handleChange} required />
                    <FormInput label="Fee (LKR)" name="fee" type="number" value={quizDetails.fee as any || ''} onChange={handleChange} required />
                </div>
                
                <div className="pt-4 flex justify-end space-x-3">
                     <button type="button" onClick={onClose} className="inline-flex items-center justify-center px-4 py-2 border border-light-border dark:border-dark-border text-sm font-medium rounded-md shadow-sm text-light-text dark:text-dark-text bg-light-surface dark:bg-dark-surface hover:bg-light-border dark:hover:bg-dark-border/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light transition-colors">
                        <XIcon className="w-4 h-4 mr-2"/>
                        Cancel
                    </button>
                    <button type="submit" disabled={isSaving} className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light transition-colors disabled:opacity-50">
                        <SaveIcon className="w-4 h-4 mr-2"/>
                        {isSaving ? 'Saving...' : (initialData ? 'Save & Edit Questions' : 'Save & Add Questions')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default ScheduleQuizModal;
