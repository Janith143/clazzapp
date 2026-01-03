import React, { useState, useEffect } from 'react';
import { IndividualClass } from '../../types';
import { useData } from '../../contexts/DataContext';
import { XIcon, PlusIcon, TrashIcon, VideoCameraIcon } from '../Icons';

interface ClassRecordingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    classInfo: IndividualClass;
    teacherId: string;
}

const ClassRecordingsModal: React.FC<ClassRecordingsModalProps> = ({ isOpen, onClose, classInfo, teacherId }) => {
    const { handleSaveClassRecording } = useData();
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [recordingUrls, setRecordingUrls] = useState<string[]>(['']);
    const [existingRecordings, setExistingRecordings] = useState<{ date: string; urls: string[] }[]>([]);

    useEffect(() => {
        if (isOpen && classInfo) {
            // Pre-fill One-Time class date
            if (classInfo.recurrence === 'none') {
                setSelectedDate(classInfo.date);
            } else {
                setSelectedDate(''); // Reset for weekly to force selection
            }

            // Load existing recordings
            if (classInfo.recordingUrls) {
                const loaded = Object.entries(classInfo.recordingUrls).map(([date, urls]) => ({ date, urls: urls as string[] }));
                // Sort by date descending
                loaded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setExistingRecordings(loaded);
            } else {
                setExistingRecordings([]);
            }
        }
    }, [isOpen, classInfo]);

    useEffect(() => {
        // If date selected, load its URLs if they exist (for editing) or empty
        if (selectedDate && classInfo.recordingUrls && classInfo.recordingUrls[selectedDate]) {
            setRecordingUrls(classInfo.recordingUrls[selectedDate]);
        } else {
            setRecordingUrls(['']);
        }
    }, [selectedDate, classInfo]);

    if (!isOpen) return null;

    const handleUrlChange = (index: number, value: string) => {
        const newUrls = [...recordingUrls];
        newUrls[index] = value;
        setRecordingUrls(newUrls);
    };

    const addUrlField = () => {
        setRecordingUrls([...recordingUrls, '']);
    };

    const removeUrlField = (index: number) => {
        const newUrls = recordingUrls.filter((_, i) => i !== index);
        setRecordingUrls(newUrls.length ? newUrls : ['']);
    };

    const handleSave = async () => {
        if (!selectedDate) {
            alert("Please select a date.");
            return;
        }

        const cleanUrls = recordingUrls.filter(u => u.trim() !== '');

        if (cleanUrls.length === 0) {
            if (!confirm("No URLs entered. This will remove recordings for this date. Continue?")) return;
        }

        await handleSaveClassRecording(teacherId, classInfo.id, selectedDate, cleanUrls);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                        <VideoCameraIcon className="w-5 h-5 mr-2 text-primary" />
                        Manage Recordings
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Session Date</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-primary focus:border-primary"
                            readOnly={classInfo.recurrence === 'none'}
                        />
                        {classInfo.recurrence !== 'none' && <p className="text-xs text-gray-500 mt-1">Select the date of the session you are adding recordings for.</p>}
                    </div>

                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Recording Links</label>
                        {recordingUrls.map((url, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <input
                                    type="url"
                                    placeholder="https://zoom.us/rec/..."
                                    value={url}
                                    onChange={(e) => handleUrlChange(index, e.target.value)}
                                    className="flex-1 px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-primary focus:border-primary text-sm"
                                />
                                <button onClick={() => removeUrlField(index)} className="p-2 text-red-500 hover:text-red-700">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        <button onClick={addUrlField} className="text-sm text-primary hover:underline flex items-center">
                            <PlusIcon className="w-4 h-4 mr-1" /> Add another link
                        </button>
                    </div>

                    {existingRecordings.length > 0 && (
                        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Previous Uploads</h4>
                            <div className="space-y-2">
                                {existingRecordings.map(({ date, urls }) => (
                                    <div key={date} className="text-sm bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-medium text-gray-700 dark:text-gray-300">{new Date(date).toDateString()}</span>
                                            <button
                                                onClick={() => setSelectedDate(date)}
                                                className="text-primary text-xs hover:underline"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            {urls.map((u, i) => (
                                                <a key={i} href={u} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 truncate hover:underline text-xs block">
                                                    {u}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark">
                        Save Recordings
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClassRecordingsModal;
