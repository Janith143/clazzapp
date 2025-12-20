
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Course, Lecture, LiveSession, PaymentPlan } from '../types';
import FormInput from '../components/FormInput';
import FormSelect from '../components/FormSelect';
import LectureEditModal from '../components/LectureEditModal';
import { SaveIcon, XIcon, PencilIcon, TrashIcon, PlusIcon, SpinnerIcon, CalendarIcon, ClockIcon, CheckCircleIcon } from '../components/Icons';
import ImageUploadInput from '../components/ImageUploadInput';
import { useNavigation } from '../contexts/NavigationContext';
import MarkdownEditor from '../components/MarkdownEditor';
import { useData } from '../contexts/DataContext';
import { v4 as uuidv4 } from 'uuid';

interface CourseEditorPageProps {
  courseData: Course | null;
  teacherId: string;
  onSave: (course: Course) => Promise<void>;
  onCancel: () => void;
}

const CourseEditorPage: React.FC<CourseEditorPageProps> = ({ courseData, teacherId, onSave, onCancel }) => {
  const { allSubjects } = useNavigation();
  const { teachers } = useData();

  // Get the teacher object to access teachingItems
  const teacher = useMemo(() => teachers.find(t => t.id === teacherId), [teachers, teacherId]);
  const teachingItems = teacher?.teachingItems || [];
  const hasTeachingItems = teachingItems.length > 0;

  const newCourseTemplate: Course = {
    id: `c_${Date.now()}`,
    teacherId: teacherId,
    title: '',
    description: '',
    subject: hasTeachingItems ? teachingItems[0].subject : (allSubjects[0]?.value || ''),
    coverImage: '',
    fee: 0,
    currency: 'LKR',
    type: 'recorded',
    paymentPlan: 'full',
    lectures: [],
    liveSessions: [],
    isPublished: false,
    ratings: [],
    adminApproval: 'not_requested',
    medium: '',
    grade: ''
  };

  const [course, setCourse] = useState<Course>(
      courseData ? { ...newCourseTemplate, ...courseData } : newCourseTemplate
  );
  const [isLectureModalOpen, setIsLectureModalOpen] = useState(false);
  const [lectureToEdit, setLectureToEdit] = useState<Lecture | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Schedule Generator State
  const [scheduleConfig, setScheduleConfig] = useState({
      startDate: '',
      startTime: '',
      durationMinutes: 60,
      weekCount: 4,
      days: [] as number[] // 0-6
  });

  // Initialize schedule config if editing existing live course
  useEffect(() => {
      if (courseData && courseData.type === 'live' && courseData.scheduleConfig) {
          setScheduleConfig(courseData.scheduleConfig);
      }
  }, [courseData]);


  // Computed Options based on selected values and profile
  const subjectOptions = useMemo(() => {
      if (hasTeachingItems) {
          const uniqueSubjects = Array.from(new Set(teachingItems.map(i => i.subject)));
          const options = uniqueSubjects.map(s => ({ value: s, label: s }));
           // Ensure current selected subject is in the list to support legacy data
           if (course.subject && !options.some(s => s.value === course.subject)) {
               options.push({ value: course.subject, label: course.subject });
           }
           return options;
      }
      return allSubjects;
  }, [hasTeachingItems, teachingItems, allSubjects, course.subject]);

  const mediumOptions = useMemo(() => {
      if (hasTeachingItems) {
          const mediums = new Set<string>();
          teachingItems
              .filter(i => i.subject === course.subject)
              .forEach(i => i.mediums.forEach(m => mediums.add(m)));
          
          const options = Array.from(mediums).map(m => ({ value: m, label: m }));
          if (course.medium && !options.some(o => o.value === course.medium)) {
            options.push({ value: course.medium, label: course.medium });
          }
          return options;
      }
      return [];
  }, [hasTeachingItems, teachingItems, course.subject, course.medium]);

  const gradeOptions = useMemo(() => {
      if (hasTeachingItems) {
          const grades = new Set<string>();
          teachingItems
              .filter(i => i.subject === course.subject)
              .forEach(i => i.grades.forEach(g => grades.add(g)));
          
          const options = Array.from(grades).map(g => ({ value: g, label: g }));
          if (course.grade && !options.some(o => o.value === course.grade)) {
            options.push({ value: course.grade, label: course.grade });
          }
          return options;
      }
      return [];
  }, [hasTeachingItems, teachingItems, course.subject, course.grade]);


  const handleCloseLectureModal = useCallback(() => {
    setIsLectureModalOpen(false);
    setLectureToEdit(null);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCourse(prev => {
        const newState = { ...prev, [name]: name === 'fee' ? parseFloat(value) || 0 : value };
        // Reset dependent fields if subject changes
        if (name === 'subject' && hasTeachingItems) {
            newState.medium = '';
            newState.grade = '';
        }
        return newState;
    });
  };

  const handleCoverImageChange = (base64: string) => {
    setCourse(prev => ({ ...prev, coverImage: base64 }));
  };

  const openLectureModal = (lecture: Lecture | null) => {
    setLectureToEdit(lecture);
    setIsLectureModalOpen(true);
  };
  
  const handleSaveLecture = (lecture: Lecture) => {
    const existingIndex = course.lectures.findIndex(l => l.id === lecture.id);
    let newLectures = [...course.lectures];
    if (existingIndex > -1) {
        newLectures[existingIndex] = lecture;
    } else {
        newLectures.push(lecture);
    }
    setCourse(prev => ({ ...prev, lectures: newLectures }));
    setIsLectureModalOpen(false);
    setLectureToEdit(null);
  }

  const handleDeleteLecture = (lectureId: string) => {
    setCourse(prev => ({
        ...prev,
        lectures: prev.lectures.filter(l => l.id !== lectureId)
    }));
  }
  
  // --- Live Schedule Logic ---

  const toggleDay = (dayIndex: number) => {
      setScheduleConfig(prev => {
          const days = prev.days.includes(dayIndex) 
             ? prev.days.filter(d => d !== dayIndex)
             : [...prev.days, dayIndex].sort();
          return { ...prev, days };
      });
  };

  const generateSchedule = () => {
      if (!scheduleConfig.startDate || !scheduleConfig.startTime || scheduleConfig.days.length === 0) {
          alert("Please fill in Start Date, Time and select at least one Day.");
          return;
      }

      const sessions: LiveSession[] = [];
      const start = new Date(`${scheduleConfig.startDate}T${scheduleConfig.startTime}`);
      const durationMs = scheduleConfig.durationMinutes * 60000;
      
      // Calculate total sessions needed based on weeks * days per week
      const totalDays = scheduleConfig.weekCount * 7;
      let sessionCount = 1;

      // Iterate through the date range
      for (let i = 0; i < totalDays; i++) {
          const checkDate = new Date(start);
          checkDate.setDate(start.getDate() + i);
          
          if (scheduleConfig.days.includes(checkDate.getDay())) {
              // Format date YYYY-MM-DD
              const yyyy = checkDate.getFullYear();
              const mm = String(checkDate.getMonth() + 1).padStart(2, '0');
              const dd = String(checkDate.getDate()).padStart(2, '0');
              const dateStr = `${yyyy}-${mm}-${dd}`;

              // Calculate End Time
              const endTimeDate = new Date(checkDate.getTime() + durationMs);
              const endHH = String(endTimeDate.getHours()).padStart(2, '0');
              const endMM = String(endTimeDate.getMinutes()).padStart(2, '0');
              const endTimeStr = `${endHH}:${endMM}`;

              // Check if a session already exists at this index to preserve title/resources
              const existingSession = course.liveSessions && course.liveSessions[sessionCount - 1];
              
              sessions.push({
                  id: existingSession?.id || uuidv4(),
                  title: existingSession?.title || `Session ${sessionCount}: [Topic]`,
                  description: existingSession?.description || '',
                  date: dateStr,
                  startTime: scheduleConfig.startTime,
                  endTime: endTimeStr,
                  status: 'scheduled',
                  resourceLink: existingSession?.resourceLink || '',
                  joinLink: existingSession?.joinLink || '',
                  recordingLink: existingSession?.recordingLink || ''
              });
              sessionCount++;
          }
      }

      setCourse(prev => ({
          ...prev,
          liveSessions: sessions,
          scheduleConfig: scheduleConfig
      }));
  };

  const handleSessionChange = (id: string, field: keyof LiveSession, value: string) => {
      setCourse(prev => ({
          ...prev,
          liveSessions: (prev.liveSessions || []).map(s => s.id === id ? { ...s, [field]: value } : s)
      }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(isSaving) return;
    
    if (course.type === 'live' && (!course.liveSessions || course.liveSessions.length === 0)) {
        alert("Please generate a schedule for your live course.");
        return;
    }

    setIsSaving(true);
    try {
        await onSave(course);
    } catch (e) {
        // Error toast is handled within onSave, so we just need to re-enable the button.
        setIsSaving(false);
    }
    // On success, the component will unmount, so no need to set isSaving to false.
  };

  // Calculate payment amounts
  const paymentCalculations = useMemo(() => {
      if (course.type !== 'live' || course.fee <= 0) return null;
      
      const currency = "LKR";
      // Calculate total sessions from config if available (for preview), else from generated list
      const daysPerWeek = scheduleConfig.days.length || 1;
      const weeks = scheduleConfig.weekCount || 1;
      const totalEstimatedSessions = daysPerWeek * weeks;
      
      const totalSessions = (course.liveSessions && course.liveSessions.length > 0) 
          ? course.liveSessions.length 
          : totalEstimatedSessions;

      switch (course.paymentPlan) {
          case 'monthly': {
              // Approximation: 4 weeks = 1 month
              const months = Math.max(1, weeks / 4);
              const perMonth = Math.round(course.fee / months);
              return { 
                  text: `Based on a ${weeks}-week duration (~${months.toFixed(1)} months), the student will pay approximately ${perMonth} ${currency} per month.`, 
                  amount: perMonth 
              };
          }
          case 'per_session': {
              const perSession = Math.round(course.fee / totalSessions);
              return { 
                  text: `Based on ${totalSessions} total sessions, the student will pay ${perSession} ${currency} per class.`, 
                  amount: perSession 
              };
          }
          case 'installments_2': {
              const perInstallment = Math.round(course.fee / 2);
              return { 
                  text: `The student will pay ${perInstallment} ${currency} now (50%), and ${perInstallment} ${currency} later.`, 
                  amount: perInstallment 
              };
          }
          case 'full':
          default:
              return { 
                  text: `The student will pay the full amount of ${course.fee} ${currency} upfront to enroll.`, 
                  amount: course.fee 
              };
      }
  }, [course.fee, course.paymentPlan, course.liveSessions, scheduleConfig, course.type]);


  return (
    <div className="max-w-4xl mx-auto animate-slideInUp p-4">
        <form onSubmit={handleSubmit}>
            <div className="bg-light-surface dark:bg-dark-surface p-8 rounded-lg shadow-md mb-8">
                 <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-light-text dark:text-dark-text">
                        {courseData ? 'Edit Course' : 'Create a New Course'}
                        </h1>
                        <p className="text-light-subtle dark:text-dark-subtle mt-1">Fill in the details below to set up your course.</p>
                    </div>
                     <button
                        type="button"
                        onClick={onCancel}
                        className="inline-flex items-center justify-center p-2 rounded-full text-light-subtle dark:text-dark-subtle hover:bg-light-border dark:hover:bg-dark-border transition-colors"
                    >
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Course Type Selector */}
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-3">Course Type</label>
                        <div className="flex space-x-6">
                            <label className="flex items-center cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="type" 
                                    value="recorded" 
                                    checked={course.type === 'recorded'} 
                                    onChange={handleChange} 
                                    className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                                />
                                <span className="ml-2 text-sm font-medium">Recorded (Video Lessons)</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="type" 
                                    value="live" 
                                    checked={course.type === 'live'} 
                                    onChange={handleChange} 
                                    className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                                />
                                <span className="ml-2 text-sm font-medium">Live Classes (Scheduled Sessions)</span>
                            </label>
                        </div>
                    </div>

                    <FormInput label="Course Title" name="title" value={course.title} onChange={handleChange} placeholder="e.g., Mastering Mechanics for A/L Physics" required />
                    <FormSelect label="Subject" name="subject" value={course.subject} onChange={handleChange} options={subjectOptions} required />
                    
                    {hasTeachingItems && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <FormSelect label="Medium" name="medium" value={course.medium || ''} onChange={handleChange} options={[{value: '', label: 'Select Medium'}, ...mediumOptions]} />
                             <FormSelect label="Grade" name="grade" value={course.grade || ''} onChange={handleChange} options={[{value: '', label: 'Select Grade'}, ...gradeOptions]} />
                        </div>
                    )}

                    <MarkdownEditor
                        label="Description"
                        id="description"
                        name="description"
                        value={course.description}
                        onChange={handleChange}
                        rows={4}
                        placeholder="A brief summary of what students will learn."
                    />
                    <ImageUploadInput
                        label="Cover Image"
                        currentImage={course.coverImage}
                        onImageChange={handleCoverImageChange}
                        aspectRatio="aspect-video"
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                         {course.type === 'live' && (
                            <FormSelect 
                                label="Student Payment Plan" 
                                name="paymentPlan" 
                                value={course.paymentPlan || 'full'} 
                                onChange={handleChange} 
                                options={[
                                    { value: 'full', label: 'One-time Full Payment' },
                                    { value: 'monthly', label: 'Monthly Payments' },
                                    { value: 'per_session', label: 'Pay Per Session' },
                                    { value: 'installments_2', label: '2 Installments (50% now, 50% later)' }
                                ]} 
                            />
                        )}
                        <div>
                            <FormInput label="Total Course Fee (LKR)" name="fee" type="number" value={course.fee.toString()} onChange={handleChange} required />
                            {paymentCalculations && (
                                <p className="text-xs mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md font-medium border border-blue-100 dark:border-blue-800">
                                    {paymentCalculations.text}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Section based on Type */}
            {course.type === 'recorded' ? (
                <div className="bg-light-surface dark:bg-dark-surface p-8 rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">Lectures</h2>
                        <button type="button" onClick={() => openLectureModal(null)} className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors">
                            <PlusIcon className="h-4 w-4" />
                            <span>Add Lecture</span>
                        </button>
                    </div>
                    <div className="space-y-3">
                        {course.lectures.length > 0 ? (
                            course.lectures.map((lecture, index) => (
                                <div key={lecture.id} className="flex items-center justify-between p-3 bg-light-background dark:bg-dark-background rounded-md border border-light-border dark:border-dark-border">
                                    <div className="flex items-center">
                                        <span className="text-sm font-bold text-light-subtle dark:text-dark-subtle mr-4">{index + 1}</span>
                                        <div>
                                            <p className="font-semibold text-light-text dark:text-dark-text">{lecture.title}</p>
                                            <p className="text-xs text-light-subtle dark:text-dark-subtle">{lecture.durationMinutes} mins {lecture.isFreePreview && <span className="text-green-500 font-medium">(Free Preview)</span>}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button type="button" onClick={() => openLectureModal(lecture)} className="p-2 text-light-subtle dark:text-dark-subtle hover:text-primary dark:hover:text-primary-light transition-colors"><PencilIcon className="h-4 w-4" /></button>
                                        <button type="button" onClick={() => handleDeleteLecture(lecture.id)} className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"><TrashIcon className="h-4 w-4" /></button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 border-2 border-dashed border-light-border dark:border-dark-border rounded-lg">
                                <p className="text-light-subtle dark:text-dark-subtle">No lectures added yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="bg-light-surface dark:bg-dark-surface p-8 rounded-lg shadow-md">
                    <h2 className="text-2xl font-bold mb-6">Live Class Schedule</h2>
                    
                    {/* Generator */}
                    <div className="p-4 border border-light-border dark:border-dark-border rounded-lg mb-8">
                        <h3 className="font-semibold mb-4 text-lg">Schedule Generator</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <FormInput 
                                label="Start Date" 
                                name="startDate" 
                                type="date" 
                                value={scheduleConfig.startDate} 
                                onChange={e => setScheduleConfig(p => ({...p, startDate: e.target.value}))} 
                            />
                            <FormInput 
                                label="Time" 
                                name="startTime" 
                                type="time" 
                                value={scheduleConfig.startTime} 
                                onChange={e => setScheduleConfig(p => ({...p, startTime: e.target.value}))} 
                            />
                            <FormInput 
                                label="Duration (Mins)" 
                                name="duration" 
                                type="number" 
                                value={scheduleConfig.durationMinutes.toString()} 
                                onChange={e => setScheduleConfig(p => ({...p, durationMinutes: parseInt(e.target.value)}))} 
                            />
                            <FormInput 
                                label="Number of Weeks" 
                                name="weeks" 
                                type="number" 
                                value={scheduleConfig.weekCount.toString()} 
                                onChange={e => setScheduleConfig(p => ({...p, weekCount: parseInt(e.target.value)}))} 
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">Days of Week</label>
                            <div className="flex gap-2 flex-wrap">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                                    <button 
                                        type="button"
                                        key={day}
                                        onClick={() => toggleDay(idx)}
                                        className={`px-3 py-1 text-sm rounded-full border ${scheduleConfig.days.includes(idx) ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-dark-background text-light-text dark:text-dark-text border-light-border dark:border-dark-border'}`}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button 
                            type="button" 
                            onClick={generateSchedule}
                            className="w-full py-2 bg-primary/10 text-primary font-semibold rounded-md hover:bg-primary/20 transition-colors"
                        >
                            Generate / Update Session List
                        </button>
                    </div>

                    {/* Generated List */}
                    <div className="space-y-4">
                        {course.liveSessions && course.liveSessions.map((session, index) => (
                            <div key={session.id} className="p-4 bg-light-background dark:bg-dark-background rounded-md border border-light-border dark:border-dark-border">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="font-bold text-light-text dark:text-dark-text">Session {index + 1}</span>
                                    <button type="button" onClick={() => {
                                        setCourse(prev => ({
                                            ...prev,
                                            liveSessions: prev.liveSessions?.filter(s => s.id !== session.id)
                                        }))
                                    }} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded p-1"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <FormInput 
                                        label="Date"
                                        name={`date-${index}`} 
                                        type="date"
                                        value={session.date} 
                                        onChange={e => handleSessionChange(session.id, 'date', e.target.value)} 
                                        required
                                    />
                                    <FormInput 
                                        label="Start Time"
                                        name={`start-${index}`} 
                                        type="time"
                                        value={session.startTime} 
                                        onChange={e => handleSessionChange(session.id, 'startTime', e.target.value)} 
                                        required
                                    />
                                    <FormInput 
                                        label="End Time"
                                        name={`end-${index}`} 
                                        type="time"
                                        value={session.endTime} 
                                        onChange={e => handleSessionChange(session.id, 'endTime', e.target.value)} 
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormInput 
                                        label="Topic / Title" 
                                        name={`topic-${index}`} 
                                        value={session.title} 
                                        onChange={e => handleSessionChange(session.id, 'title', e.target.value)} 
                                    />
                                    <FormInput 
                                        label="Resource Link (Optional)" 
                                        name={`res-${index}`} 
                                        value={session.resourceLink || ''} 
                                        onChange={e => handleSessionChange(session.id, 'resourceLink', e.target.value)} 
                                        placeholder="e.g. Google Drive PDF"
                                    />
                                </div>
                            </div>
                        ))}
                        {(!course.liveSessions || course.liveSessions.length === 0) && (
                             <div className="text-center py-8">
                                <p className="text-light-subtle dark:text-dark-subtle">Use the generator above to create your class schedule.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 rounded-r-md text-yellow-800 dark:text-yellow-200">
                <h4 className="font-bold">Course Publication & Deletion Policy</h4>
                <ul className="text-sm mt-2 list-disc list-inside space-y-1">
                    <li><strong>Admin Review:</strong> All new courses must be reviewed and approved by an administrator before they can be published for the first time. You can request publication after saving your course.</li>
                    <li><strong>Unpublishing:</strong> You can unpublish a course at any time to prevent new enrollments. Students who have already purchased the course will still have access.</li>
                    <li><strong>Deletion:</strong> A course cannot be deleted if it has one or more enrolled students. You can only unpublish it.</li>
                </ul>
            </div>


            <div className="mt-8 pt-6 flex justify-end space-x-4">
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
                    disabled={isSaving}
                    className="inline-flex items-center justify-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light transition-colors disabled:opacity-50"
                >
                    {isSaving ? <SpinnerIcon className="w-5 h-5 mr-2" /> : <SaveIcon className="w-5 h-5 mr-2" />}
                    {isSaving ? 'Saving...' : 'Save Course'}
                </button>
            </div>
        </form>
        <LectureEditModal 
            isOpen={isLectureModalOpen}
            onClose={handleCloseLectureModal}
            onSave={handleSaveLecture}
            lecture={lectureToEdit}
        />
    </div>
  );
};

export default CourseEditorPage;
