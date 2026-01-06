import React, { useState } from 'react';
import { Teacher } from '../../types';
import CustomClassSettingsTab from './CustomClassSettingsTab';
import { CurrencyDollarIcon } from '../Icons';

interface TeacherSettingsTabProps {
    teacher: Teacher;
}

const TeacherSettingsTab: React.FC<TeacherSettingsTabProps> = ({ teacher }) => {
    const [activeSubTab, setActiveSubTab] = useState<'private_classes'>('private_classes');

    return (
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Teacher Settings</h2>
                <p className="text-sm text-gray-500 mt-1">Manage your teacher profile and preferences.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 min-h-[400px]">
                {/* Sidebar */}
                <div className="border-r border-gray-200 dark:border-gray-700 p-4">
                    <nav className="space-y-1">
                        <button
                            onClick={() => setActiveSubTab('private_classes')}
                            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeSubTab === 'private_classes'
                                ? 'bg-primary/10 text-primary'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                                }`}
                        >
                            <CurrencyDollarIcon className="w-5 h-5 mr-3 flex-shrink-0" />
                            Private Classes
                        </button>
                    </nav>
                </div>

                {/* Content Area */}
                <div className="md:col-span-3 p-6">
                    {activeSubTab === 'private_classes' && (
                        <CustomClassSettingsTab teacher={teacher} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeacherSettingsTab;
