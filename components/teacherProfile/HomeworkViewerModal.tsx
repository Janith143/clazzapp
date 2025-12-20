import React from 'react';
import Modal from '../Modal';
// FIX: Add HomeworkSubmission to imports to allow for explicit typing.
import { IndividualClass, User, HomeworkSubmission } from '../../types';
import { LinkIcon, UserCircleIcon } from '../Icons';

interface HomeworkViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  classInfo: IndividualClass | null;
  instanceDate: string | null;
  enrolledStudents: User[];
}

const HomeworkViewerModal: React.FC<HomeworkViewerModalProps> = ({ isOpen, onClose, classInfo, instanceDate, enrolledStudents }) => {
    if (!isOpen || !classInfo || !instanceDate) return null;

    // FIX: Explicitly type `submissions` as `HomeworkSubmission[]` to solve the type inference issue.
    const submissions: HomeworkSubmission[] = classInfo.homeworkSubmissions?.[instanceDate] || [];
    const submissionMap = new Map(submissions.map(s => [s.studentId, s]));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Homework for "${classInfo.title}" on ${new Date(instanceDate).toLocaleDateString()}`} size="2xl">
            <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-light-border dark:divide-dark-border text-sm">
                    <thead className="bg-light-background dark:bg-dark-background sticky top-0">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Student</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Student ID</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Submission</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-light-border dark:divide-dark-border">
                        {enrolledStudents.length > 0 ? enrolledStudents.map(student => {
                            const submission = submissionMap.get(student.id);
                            return (
                                <tr key={student.id}>
                                    <td className="px-4 py-2 font-medium text-light-text dark:text-dark-text">{student.firstName} {student.lastName}</td>
                                    <td className="px-4 py-2 text-light-text dark:text-dark-text">{student.id}</td>
                                    <td className="px-4 py-2">
                                        {submission ? (
                                            <a href={submission.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                                                <LinkIcon className="w-4 h-4" />
                                                View Submission
                                            </a>
                                        ) : (
                                            <span className="text-light-subtle dark:text-dark-subtle italic">Not Submitted</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan={3} className="text-center py-8 text-light-subtle dark:text-dark-subtle">No students were enrolled for this session.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Modal>
    );
};

export default HomeworkViewerModal;