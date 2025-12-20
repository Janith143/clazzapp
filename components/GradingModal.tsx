import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import FormInput from './FormInput';
import { SaveIcon, XIcon } from './Icons';
import { IndividualClass, User, ClassGrading } from '../types';

interface GradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (classId: number, instanceDate: string, grades: ClassGrading) => void;
  classInfo: IndividualClass | null;
  instanceDate: string | null;
  enrolledStudents: User[];
}

const GradingModal: React.FC<GradingModalProps> = ({ isOpen, onClose, onSave, classInfo, instanceDate, enrolledStudents }) => {
    const [maxMark, setMaxMark] = useState<string>('');
    const [scores, setScores] = useState<{ [studentId: string]: string }>({});
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && classInfo && instanceDate) {
            setError('');
            const existingGrades = classInfo.grades?.[instanceDate];
            if (existingGrades) {
                setMaxMark(existingGrades.maxMark.toString());
                const initialScores: { [studentId: string]: string } = {};
                existingGrades.studentScores.forEach(s => {
                    initialScores[s.studentId] = s.score.toString();
                });
                setScores(initialScores);
            } else {
                setMaxMark('');
                setScores({});
            }
        }
    }, [isOpen, classInfo, instanceDate]);

    const handleScoreChange = (studentId: string, value: string) => {
        setScores(prev => ({ ...prev, [studentId]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!classInfo || !instanceDate) return;

        const numMaxMark = parseFloat(maxMark);
        if (isNaN(numMaxMark) || numMaxMark <= 0) {
            setError('Please enter a valid positive number for "Out of Mark".');
            return;
        }

        const studentScores = enrolledStudents.map(student => {
            const scoreStr = scores[student.id] || '0';
            const score = parseFloat(scoreStr);
            if (isNaN(score) || score < 0 || score > numMaxMark) {
                throw new Error(`Invalid score for ${student.firstName}. Score must be between 0 and ${numMaxMark}.`);
            }
            return { studentId: student.id, score };
        });

        try {
            const newGrades: ClassGrading = {
                maxMark: numMaxMark,
                studentScores: studentScores
            };
            onSave(classInfo.id, instanceDate, newGrades);
        } catch (e: any) {
            setError(e.message);
        }
    };

    if (!classInfo || !instanceDate) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Grades for "${classInfo.title}" on ${new Date(instanceDate).toLocaleDateString()}`} size="2xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                <FormInput 
                    label="Out of Mark (Maximum Score)"
                    name="maxMark"
                    type="number"
                    value={maxMark}
                    onChange={(e) => setMaxMark(e.target.value)}
                    required
                    placeholder="e.g., 100"
                />

                <div className="overflow-x-auto max-h-96">
                    <table className="min-w-full divide-y divide-light-border dark:divide-dark-border text-sm">
                        <thead className="bg-light-background dark:bg-dark-background sticky top-0">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Student</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Student ID</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-light-border dark:divide-dark-border">
                            {enrolledStudents.map(student => (
                                <tr key={student.id}>
                                    <td className="px-4 py-2 font-medium text-light-text dark:text-dark-text">{student.firstName} {student.lastName}</td>
                                    <td className="px-4 py-2 text-light-text dark:text-dark-text">{student.id}</td>
                                    <td className="px-4 py-2 text-right">
                                        <input
                                            type="number"
                                            value={scores[student.id] || ''}
                                            onChange={(e) => handleScoreChange(student.id, e.target.value)}
                                            min="0"
                                            max={maxMark || undefined}
                                            className="w-24 p-1 border rounded-md text-right bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                                            placeholder="Score"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                <div className="pt-4 flex justify-end space-x-3">
                     <button type="button" onClick={onClose} className="inline-flex items-center justify-center px-4 py-2 border border-light-border dark:border-dark-border text-sm font-medium rounded-md shadow-sm">
                        <XIcon className="w-4 h-4 mr-2"/>
                        Cancel
                    </button>
                    <button type="submit" className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark">
                        <SaveIcon className="w-4 h-4 mr-2"/>
                        Save Grades
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default GradingModal;