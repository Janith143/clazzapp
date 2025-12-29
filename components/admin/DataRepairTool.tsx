
import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUserActions } from '../../hooks/useUserActions'; // Correct hook for addTeacher
import { Teacher, User } from '../../types';
import { useUI } from '../../contexts/UIContext';
import { useNavigation } from '../../contexts/NavigationContext';

const DataRepairTool: React.FC = () => {
    const { users, teachers } = useData();
    const { addTeacher } = useUserActions({ currentUser: null, ui: useUI(), users, nav: useNavigation() }); // Hacky dependency injection for this tool
    const { addToast } = useUI();
    const { teacherCardTaglines } = useNavigation();

    const [fixing, setFixing] = useState(false);

    // optimize: create a set of valid teacher userIds for O(1) lookup
    const validTeacherIds = new Set(teachers.map(t => t.userId));

    const orphanedTeachers = users.filter(user =>
        user.role === 'teacher' && !validTeacherIds.has(user.id)
    );

    const handleFix = async () => {
        setFixing(true);
        let fixedCount = 0;
        let errors = 0;

        for (const user of orphanedTeachers) {
            try {
                const generateUniqueUsername = (fullName: string): string => {
                    const baseSlug = fullName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
                    // Check against teachers AND users to be safe, though teachers is the critical one for URLs
                    const allUsernames = new Set(teachers.map(t => t.username));

                    if (!allUsernames.has(baseSlug)) return baseSlug;

                    let counter = 2;
                    let newSlug = `${baseSlug}${counter}`;
                    while (allUsernames.has(newSlug)) {
                        counter++;
                        newSlug = `${baseSlug}${counter}`;
                    }
                    return newSlug;
                };

                const newTeacherUsername = generateUniqueUsername(`${user.firstName} ${user.lastName}`);
                const randomTagline = teacherCardTaglines && teacherCardTaglines.length > 0
                    ? teacherCardTaglines[Math.floor(Math.random() * teacherCardTaglines.length)]
                    : 'Passionate Educator Ready to Inspire';

                const newTeacher: Teacher = {
                    id: user.id, // Teacher ID matches User ID
                    userId: user.id,
                    name: `${user.firstName} ${user.lastName}`,
                    username: newTeacherUsername,
                    email: user.email,
                    profileImage: user.avatar || '',
                    avatar: user.avatar || '',
                    coverImages: [],
                    tagline: randomTagline,
                    bio: '',
                    subjects: [],
                    exams: [],
                    qualifications: [],
                    languages: [],
                    experienceYears: 0,
                    contact: {
                        phone: user.contactNumber || '',
                        email: user.email,
                        location: '',
                        onlineAvailable: true
                    },
                    timetable: [],
                    individualClasses: [],
                    courses: [],
                    quizzes: [],
                    achievements: [],
                    registrationStatus: 'pending', // Default to pending
                    earnings: { total: 0, withdrawn: 0, available: 0 },
                    withdrawalHistory: [],
                    payoutDetails: null,
                    commissionRate: 25,
                    verification: { id: { status: 'unverified' }, bank: { status: 'unverified' } },
                    ratings: [],
                };

                console.log(`Fixing teacher: ${newTeacher.name} (${newTeacher.id})`);
                await addTeacher(newTeacher);
                fixedCount++;

            } catch (err) {
                console.error(`Failed to fix user ${user.id}:`, err);
                errors++;
            }
        }

        addToast(`Repaired ${fixedCount} profiles. ${errors > 0 ? `${errors} failed.` : ''}`, errors > 0 ? 'error' : 'success');
        setFixing(false);
    };

    if (orphanedTeachers.length === 0) return null;

    return (
        <div className="mb-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <h3 className="text-lg font-bold text-yellow-800 dark:text-yellow-200 mb-2">
                ⚠️ Data Integrity Issue Detected
            </h3>
            <p className="text-yellow-700 dark:text-yellow-300 mb-4">
                Found <strong>{orphanedTeachers.length}</strong> users with "Teacher" role but no associated Teacher Profile.
                They will not appear in the admin panel or store.
            </p>
            <ul className="list-disc pl-5 mb-4 text-sm text-yellow-600 dark:text-yellow-400 max-h-40 overflow-y-auto">
                {orphanedTeachers.map(u => (
                    <li key={u.id}>{u.firstName} {u.lastName} ({u.email})</li>
                ))}
            </ul>
            <button
                onClick={handleFix}
                disabled={fixing}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md font-medium disabled:opacity-50"
            >
                {fixing ? 'Repairing...' : 'Fix Missing Profiles'}
            </button>
        </div>
    );
};

export default DataRepairTool;
