import React, { useState } from 'react';
import Modal from '../Modal';
import { useBroadcastActions } from '../../hooks/useBroadcastActions';

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    teacherId: string;
    teacherName: string;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose, teacherId, teacherName }) => {
    const { createGroup, loading } = useBroadcastActions();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [bannerFile, setBannerFile] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await createGroup(teacherId, teacherName, name, description, bannerFile || undefined);
        if (success) {
            onClose();
            setName('');
            setDescription('');
            setBannerFile(null);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create Broadcast Group" size="md">
            <div className="text-center mb-4">
                <p className="text-sm text-gray-500">
                    Create a one-way broadcast channel to share updates with your students.
                </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Group Name</label>
                    <input
                        type="text"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. A/L Physics 2026 Announcements"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description (Optional)</label>
                    <textarea
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What is this group for?"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Banner Image (Optional)</label>
                    <input
                        type="file"
                        accept="image/*"
                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-gray-700 dark:file:text-gray-300"
                        onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                    />
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none disabled:opacity-50"
                    >
                        {loading ? 'Creating...' : 'Create Group'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateGroupModal;
