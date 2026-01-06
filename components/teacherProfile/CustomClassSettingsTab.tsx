import React, { useState, useEffect } from 'react';
import { Teacher } from '../../types';
import { useData } from '../../contexts/DataContext';
import { SpinnerIcon, CheckCircleIcon, PlusIcon, TrashIcon } from '../Icons';
import { CalendarIcon } from '../Icons';

interface CustomClassSettingsTabProps {
    teacher: Teacher;
}

const CustomClassSettingsTab: React.FC<CustomClassSettingsTabProps> = ({ teacher }) => {
    const { handleUpdateTeacher, loading } = useData();
    const [isEnabled, setIsEnabled] = useState(false);
    const [hourlyRate, setHourlyRate] = useState<number>(0);
    const [availableDays, setAvailableDays] = useState<string[]>([]);
    const [timeWindows, setTimeWindows] = useState<{ start: string; end: string }[]>([{ start: '08:00', end: '20:00' }]);
    const [bufferMinutes, setBufferMinutes] = useState<number>(15);
    const [blackoutDates, setBlackoutDates] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    // Initialize state from teacher object
    useEffect(() => {
        if (teacher.customClassSettings) {
            setIsEnabled(teacher.customClassSettings.enabled);
            setHourlyRate(teacher.customClassSettings.rates.hourly);
            setAvailableDays(teacher.customClassSettings.availability.days);
            if (teacher.customClassSettings.availability.timeWindows) {
                setTimeWindows(teacher.customClassSettings.availability.timeWindows);
            }
            if (teacher.customClassSettings.availability.bufferMinutes !== undefined) {
                setBufferMinutes(teacher.customClassSettings.availability.bufferMinutes);
            }
            if (teacher.customClassSettings.availability.blackoutDates) {
                setBlackoutDates(teacher.customClassSettings.availability.blackoutDates);
            }
        }
    }, [teacher]);

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const toggleDay = (day: string) => {
        setAvailableDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        setMessage(null);
        try {
            const settings = {
                enabled: isEnabled,
                rates: {
                    hourly: hourlyRate,
                },
                availability: {
                    days: availableDays,
                    timeWindows,
                    bufferMinutes,
                    blackoutDates
                }
            };

            await handleUpdateTeacher(teacher.id, { customClassSettings: settings });
            setMessage({ text: "Settings saved successfully!", type: 'success' });
        } catch (error) {
            console.error(error);
            setMessage({ text: "Failed to save settings.", type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">Custom Class Requests</h2>

            <div className="flex items-center justify-between mb-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">Enable Feature</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Allow students to request custom private classes.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={isEnabled}
                        onChange={(e) => setIsEnabled(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
            </div>

            <div className={`space-y-6 transition-opacity duration-300 ${!isEnabled ? 'opacity-50 pointer-events-none' : ''}`}>

                {/* Pricing Section */}
                <div>
                    <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">Pricing</h3>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hourly Rate (LKR)</label>
                            <input
                                type="number"
                                value={hourlyRate}
                                onChange={(e) => setHourlyRate(Number(e.target.value))}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g. 1500"
                            />
                        </div>
                    </div>
                </div>

                {/* Availability Section */}
                <div>
                    <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">Availability</h3>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Available Days</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                        {daysOfWeek.map(day => (
                            <button
                                key={day}
                                onClick={() => toggleDay(day)}
                                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${availableDays.includes(day)
                                    ? 'bg-blue-100 text-blue-800 border-blue-200 border dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800'
                                    : 'bg-gray-100 text-gray-600 border-gray-200 border hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
                                    }`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>

                    {/* Time Windows */}
                    <div className="mb-6">
                        <h4 className="text-md font-semibold mb-2 text-gray-800 dark:text-gray-200">Daily Time Range</h4>
                        <p className="text-sm text-gray-500 mb-3">Set the standard hours you are available on the selected days.</p>
                        <div className="space-y-3">
                            {timeWindows.map((window, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    <input
                                        type="time"
                                        value={window.start}
                                        onChange={(e) => {
                                            const newWindows = [...timeWindows];
                                            newWindows[index].start = e.target.value;
                                            setTimeWindows(newWindows);
                                        }}
                                        className="p-2 border rounded-md dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                                    />
                                    <span className="text-gray-500">to</span>
                                    <input
                                        type="time"
                                        value={window.end}
                                        onChange={(e) => {
                                            const newWindows = [...timeWindows];
                                            newWindows[index].end = e.target.value;
                                            setTimeWindows(newWindows);
                                        }}
                                        className="p-2 border rounded-md dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                                    />
                                    {timeWindows.length > 1 && (
                                        <button onClick={() => setTimeWindows(timeWindows.filter((_, i) => i !== index))} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                onClick={() => setTimeWindows([...timeWindows, { start: '09:00', end: '17:00' }])}
                                className="text-sm text-primary flex items-center hover:underline"
                            >
                                <PlusIcon className="w-4 h-4 mr-1" /> Add Time Range
                            </button>
                        </div>
                    </div>

                    {/* Buffer Time */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Minimum Notice Buffer</label>
                        </div>
                        <select
                            value={bufferMinutes}
                            onChange={(e) => setBufferMinutes(Number(e.target.value))}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-gray-200"
                        >
                            <option value={0}>No buffer</option>
                            <option value={15}>15 minutes</option>
                            <option value={30}>30 minutes</option>
                            <option value={60}>1 hour</option>
                            <option value={1440}>24 hours</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Students cannot book slots starting sooner than this.</p>
                    </div>
                </div>

            </div>

            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                {message && (
                    <div className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                        {message.text}
                    </div>
                )}
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow transition-colors disabled:opacity-50 ml-auto"
                >
                    {isSaving ? <SpinnerIcon className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircleIcon className="w-5 h-5 mr-2" />}
                    Save Settings
                </button>
            </div>
        </div>
    );
};

export default CustomClassSettingsTab;
