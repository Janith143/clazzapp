
import React, { useState, useMemo } from 'react';
import Modal from '../Modal';
import FormInput from '../FormInput';
import FormSelect from '../FormSelect';
import { User } from '../../types';
import { useData } from '../../contexts/DataContext';
import { PlusIcon, SaveIcon, XIcon, UserGroupIcon } from '../Icons';

interface GenerateVoucherModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const GenerateVoucherModal: React.FC<GenerateVoucherModalProps> = ({ isOpen, onClose }) => {
    const { users, handleGenerateVouchers } = useData();
    
    const [targetType, setTargetType] = useState<'all_students' | 'specific_students'>('specific_students');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [amount, setAmount] = useState('');
    const [title, setTitle] = useState('');
    const [rules, setRules] = useState('');
    const [expiryMonths, setExpiryMonths] = useState('6');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const students = useMemo(() => users.filter(u => u.role === 'student'), [users]);
    
    const filteredStudents = useMemo(() => {
        if (!searchTerm) return students.slice(0, 50); // Limit initial view
        const lowerSearch = searchTerm.toLowerCase();
        return students.filter(s => 
            `${s.firstName} ${s.lastName}`.toLowerCase().includes(lowerSearch) || 
            s.email.toLowerCase().includes(lowerSearch) || 
            s.id.toLowerCase().includes(lowerSearch)
        );
    }, [students, searchTerm]);

    const handleSelectStudent = (studentId: string) => {
        setSelectedStudentIds(prev => 
            prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
        );
    };
    
    const handleSelectAllFiltered = () => {
        const newIds = filteredStudents.map(s => s.id);
        const combined = new Set([...selectedStudentIds, ...newIds]);
        setSelectedStudentIds(Array.from(combined));
    };

    const handleClearSelection = () => setSelectedStudentIds([]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        let targetIds: string[] = [];
        if (targetType === 'all_students') {
            if (!window.confirm(`Are you surely you want to generate a voucher for ALL ${students.length} students?`)) return;
            targetIds = students.map(s => s.id);
        } else {
            if (selectedStudentIds.length === 0) {
                alert('Please select at least one student.');
                return;
            }
            targetIds = selectedStudentIds;
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            alert('Please enter a valid amount.');
            return;
        }

        setIsSubmitting(true);
        
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + parseInt(expiryMonths));
        
        try {
            await handleGenerateVouchers(targetIds, numAmount, {
                title,
                rules,
                expiryDate: expiryDate.toISOString()
            });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Generate Free Gift Vouchers">
            <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="p-4 bg-light-background dark:bg-dark-background border border-light-border dark:border-dark-border rounded-md">
                    <h3 className="font-semibold mb-3">1. Select Recipients</h3>
                    <div className="flex gap-4 mb-4">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="targetType" checked={targetType === 'specific_students'} onChange={() => setTargetType('specific_students')} className="text-primary focus:ring-primary"/>
                            <span>Select Students</span>
                        </label>
                         <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="targetType" checked={targetType === 'all_students'} onChange={() => setTargetType('all_students')} className="text-primary focus:ring-primary"/>
                            <span>All Students ({students.length})</span>
                        </label>
                    </div>

                    {targetType === 'specific_students' && (
                        <div className="space-y-2">
                             <input 
                                type="text" 
                                placeholder="Search by name, ID or email..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full p-2 text-sm border border-light-border dark:border-dark-border rounded bg-light-surface dark:bg-dark-surface focus:ring-primary focus:border-primary"
                            />
                            <div className="flex justify-between text-xs text-light-subtle dark:text-dark-subtle">
                                <span>{selectedStudentIds.length} selected</span>
                                <div className="space-x-2">
                                     <button type="button" onClick={handleSelectAllFiltered} className="hover:text-primary">Select All Visible</button>
                                     <button type="button" onClick={handleClearSelection} className="hover:text-red-500">Clear Selection</button>
                                </div>
                            </div>
                            <div className="max-h-48 overflow-y-auto border border-light-border dark:border-dark-border rounded bg-light-surface dark:bg-dark-surface p-2 space-y-1">
                                {filteredStudents.map(student => (
                                    <div key={student.id} onClick={() => handleSelectStudent(student.id)} className={`flex items-center justify-between p-2 rounded cursor-pointer ${selectedStudentIds.includes(student.id) ? 'bg-primary/10 border border-primary/20' : 'hover:bg-light-background dark:hover:bg-dark-background'}`}>
                                        <div className="text-sm">
                                            <p className="font-semibold">{student.firstName} {student.lastName}</p>
                                            <p className="text-xs text-light-subtle dark:text-dark-subtle">{student.email} • {student.id}</p>
                                        </div>
                                        {selectedStudentIds.includes(student.id) && <div className="w-2 h-2 bg-primary rounded-full"></div>}
                                    </div>
                                ))}
                                {filteredStudents.length === 0 && <p className="text-center text-sm py-2">No students found.</p>}
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormInput label="Voucher Amount (LKR)" name="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="e.g. 1000" />
                     <FormSelect label="Valid For" name="expiry" value={expiryMonths} onChange={e => setExpiryMonths(e.target.value)} options={[{value: '1', label: '1 Month'}, {value: '3', label: '3 Months'}, {value: '6', label: '6 Months'}, {value: '12', label: '1 Year'}]} />
                </div>
                
                <FormInput label="Voucher Title (Optional)" name="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. New Year Gift" />

                <div>
                    <label className="block text-sm font-medium mb-1">Redemption Rules / Description</label>
                    <textarea 
                        value={rules}
                        onChange={e => setRules(e.target.value)}
                        rows={3}
                        className="w-full p-2 border border-light-border dark:border-dark-border rounded bg-light-surface dark:bg-dark-surface focus:outline-none focus:ring-primary focus:border-primary text-sm"
                        placeholder="e.g. Valid only for Physics Revision classes. Enter code at checkout."
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                     <button type="button" onClick={onClose} className="px-4 py-2 border border-light-border dark:border-dark-border rounded text-sm hover:bg-light-background dark:hover:bg-dark-background">Cancel</button>
                     <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50">
                        {isSubmitting ? 'Generating...' : (
                            <>
                                <PlusIcon className="w-4 h-4" /> Generate
                            </>
                        )}
                     </button>
                </div>
            </form>
        </Modal>
    );
};

export default GenerateVoucherModal;
