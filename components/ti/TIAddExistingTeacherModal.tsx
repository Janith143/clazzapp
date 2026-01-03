import React, { useState } from 'react';
import Modal from '../Modal';
import FormInput from '../FormInput';
import { useData } from '../../contexts/DataContext';
import { Teacher } from '../../types';
import { SearchIcon, UserPlusIcon } from '../Icons';

interface TIAddExistingTeacherModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (teacherId: string) => Promise<void>;
    existingTeacherIds: string[];
}

const TIAddExistingTeacherModal: React.FC<TIAddExistingTeacherModalProps> = ({ isOpen, onClose, onAdd, existingTeacherIds }) => {
    const { teachers } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const filteredTeachers = teachers.filter(t =>
        !t.isManaged && // Only independent teachers
        !existingTeacherIds.includes(t.id) && // Not already added
        (t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.email.toLowerCase().includes(searchTerm.toLowerCase()))
    ).slice(0, 5); // Limit to 5 results

    const handleAdd = async (teacherId: string) => {
        setIsAdding(true);
        try {
            await onAdd(teacherId);
            onClose();
        } catch (error) {
            console.error("Failed to add teacher", error);
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Existing Teacher" size="lg">
            <div className="space-y-6">
                <div>
                    <p className="text-sm text-light-subtle dark:text-dark-subtle mb-4">
                        Search for an existing independent teacher on Clazz.lk to link them to your institute.
                    </p>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-md bg-light-background dark:bg-dark-background focus:ring-primary focus:border-primary"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    {searchTerm && filteredTeachers.length === 0 ? (
                        <p className="text-center text-light-subtle dark:text-dark-subtle py-4">No teachers found matching "{searchTerm}"</p>
                    ) : (
                        filteredTeachers.map(teacher => (
                            <div key={teacher.id} className="flex items-center justify-between p-4 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg">
                                <div className="flex items-center space-x-4">
                                    <img
                                        src={teacher.profileImage || 'https://via.placeholder.com/48'}
                                        alt={teacher.name}
                                        className="w-12 h-12 rounded-full object-cover"
                                    />
                                    <div>
                                        <h4 className="font-bold text-light-text dark:text-dark-text">{teacher.name}</h4>
                                        <p className="text-sm text-light-subtle dark:text-dark-subtle">{teacher.email}</p>
                                        <p className="text-xs text-primary">{teacher.subjects.join(', ')}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleAdd(teacher.id)}
                                    disabled={isAdding}
                                    className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark disabled:opacity-50"
                                >
                                    <UserPlusIcon className="w-4 h-4" />
                                    <span>{isAdding ? 'Adding...' : 'Link Teacher'}</span>
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default TIAddExistingTeacherModal;
