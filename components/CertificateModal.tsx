
import React, { useState, useRef } from 'react';
import Modal from './Modal';
import { User, Course, Teacher } from '../types';
import { useData } from '../contexts/DataContext';
import { CheckCircleIcon, DownloadIcon } from './Icons';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface CertificateModalProps {
    isOpen: boolean;
    onClose: () => void;
    course: Course;
    teacher: Teacher;
}

const CertificateModal: React.FC<CertificateModalProps> = ({ isOpen, onClose, course, teacher }) => {
    const { users, sales, certificates, handleIssueCertificate } = useData();
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const certificateRef = useRef<HTMLDivElement>(null);

    // Get enrolled students
    const enrolledStudents = React.useMemo(() => {
        const studentIds = sales
            .filter(s => s.itemId === course.id && s.status === 'completed')
            .map(s => s.studentId);
        return users.filter(u => studentIds.includes(u.id));
    }, [sales, course.id, users]);

    const selectedStudent = users.find(u => u.id === selectedStudentId);

    const existingCertificate = React.useMemo(() => {
        if (!selectedStudent) return null;
        return certificates.find(c => c.itemId === course.id && c.studentId === selectedStudent.id);
    }, [certificates, course.id, selectedStudent]);

    const handleIssue = async () => {
        if (!certificateRef.current || !selectedStudent) return;
        setIsGenerating(true);

        try {
            const canvas = await html2canvas(certificateRef.current, { scale: 2, backgroundColor: '#ffffff' });
            // Generate Blob
            canvas.toBlob(async (blob) => {
                if (blob) {
                    await handleIssueCertificate({
                        studentId: selectedStudent.id,
                        studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
                        teacherId: teacher.id,
                        teacherName: teacher.name,
                        itemId: course.id,
                        itemType: 'course',
                        itemTitle: course.title,
                        verificationId: `${course.id}-${selectedStudent.id}`,
                        issuedAt: new Date().toISOString(),
                    }, blob);
                    onClose();
                }
            }, 'application/pdf'); // Note: toBlob usually outputs image. For PDF we might need jsPDF output.

            // CORRECTION: html2canvas gives an image. We need to put that image in a PDF AND then get that PDF as blob.
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('l', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

            const pdfBlob = pdf.output('blob');
            await handleIssueCertificate({
                studentId: selectedStudent.id,
                studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
                teacherId: teacher.id,
                teacherName: teacher.name,
                itemId: course.id,
                itemType: 'course',
                itemTitle: course.title,
                verificationId: `${course.id}-${selectedStudent.id}`,
                issuedAt: new Date().toISOString(),
            }, pdfBlob);

            onClose();

        } catch (error) {
            console.error("Certificate generation failed", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Issue Certificate" size="4xl">
            <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                        Select a student to issue a certificate of completion for <strong>{course.title}</strong>.
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Select Student</label>
                    <select
                        className="w-full p-2 border rounded-md bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border"
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                    >
                        <option value="">-- Choose Student --</option>
                        {enrolledStudents.map(s => (
                            <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.email})</option>
                        ))}
                    </select>
                </div>

                {selectedStudent && existingCertificate && (
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md border border-green-200 dark:border-green-800 flex justify-between items-center">
                        <div>
                            <p className="font-semibold text-green-800 dark:text-green-200">Certificate Already Issued</p>
                            <p className="text-xs text-green-700 dark:text-green-300">Issued on {new Date(existingCertificate.issuedAt).toLocaleDateString()}</p>
                        </div>
                        <a
                            href={existingCertificate.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
                        >
                            View Existing
                        </a>
                    </div>
                )}

                {selectedStudent && (
                    <>
                        <div className="border-8 border-double border-gray-600 shadow-2xl overflow-hidden mx-auto max-w-[800px]">
                            <div
                                ref={certificateRef}
                                className="relative w-full bg-[#fdfbf7] text-black p-12 text-center flex flex-col justify-between"
                                style={{ minHeight: '600px', fontFamily: "'Times New Roman', serif" }}
                            >
                                {/* Background Watermark */}
                                <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none flex justify-center items-center">
                                    <img src="/Logo3.png" alt="Watermark" className="w-2/3 object-contain filter grayscale" crossOrigin="anonymous" />
                                </div>

                                {/* Ornamental Border Inner */}
                                <div className="absolute top-4 left-4 right-4 bottom-4 border-2 border-[#b8860b] pointer-events-none"></div>
                                <div className="absolute top-5 left-5 right-5 bottom-5 border border-[#b8860b] pointer-events-none"></div>

                                {/* Header */}
                                <div className="relative z-10 flex flex-col items-center mt-4">
                                    <img src="/Logo3.png" alt="Clazz.lk" className="h-16 mb-6 object-contain" crossOrigin="anonymous" />
                                    <h1 className="text-5xl font-serif font-bold text-[#1a237e] mb-2 uppercase tracking-widest leading-tight">Certificate</h1>
                                    <h2 className="text-2xl font-serif text-[#1a237e] uppercase tracking-widest">of Completion</h2>
                                </div>

                                {/* Content */}
                                <div className="relative z-10 my-8">
                                    <p className="text-lg text-gray-600 italic mb-4 font-serif">This certificate is proudly detailsed to</p>
                                    <h3 className="text-4xl font-bold text-black mb-6 px-8 py-2 font-serif border-b border-gray-400 inline-block min-w-[60%]">{selectedStudent.firstName} {selectedStudent.lastName}</h3>

                                    <p className="text-lg text-gray-600 italic mb-4 font-serif">For the successful completion of the course</p>
                                    <h4 className="text-3xl font-bold text-[#1a237e] mb-2 max-w-[80%] mx-auto leading-relaxed">{course.title}</h4>
                                </div>

                                {/* Red Badge / Seal */}
                                <div className="absolute bottom-16 right-16 z-20">
                                    <div className="relative w-24 h-24 flex items-center justify-center">
                                        {/* Seal Graphic (CSS/SVG) */}
                                        <svg viewBox="0 0 100 100" className="w-full h-full text-red-700 drop-shadow-md">
                                            <path fill="currentColor" d="M50 0 L61 25 L88 25 L75 50 L88 75 L61 75 L50 100 L39 75 L12 75 L25 50 L12 25 L39 25 Z" />
                                            <circle cx="50" cy="50" r="35" fill="#B91C1C" stroke="#FCD34D" strokeWidth="2" />
                                            <path d="M50 15 L60 38 L85 38 L65 53 L75 75 L50 60 L25 75 L35 53 L15 38 L40 38 Z" fill="none" stroke="#FCD34D" strokeWidth="1" opacity="0.5" />
                                            <text x="50" y="55" fontSize="14" fontWeight="bold" fill="white" textAnchor="middle" fontFamily="serif">VERIFIED</text>
                                        </svg>
                                        {/* Ribbon tails */}
                                        <div className="absolute -bottom-4 z-[-1] w-full flex justify-center space-x-1">
                                            <div className="w-6 h-10 bg-red-800 transform rotate-12 origin-top-left -ml-2 clip-ribbon"></div>
                                            <div className="w-6 h-10 bg-red-800 transform -rotate-12 origin-top-right -mr-2 clip-ribbon"></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer & Signatures */}
                                <div className="relative z-10 flex justify-between w-full px-16 mt-8 mb-4">
                                    <div className="text-center">
                                        <div className="font-bold text-xl text-[#1a237e]">{currentDate}</div>
                                        <div className="h-px w-48 bg-gray-400 mt-1 mx-auto"></div>
                                        <p className="text-sm mt-1 font-serif italic text-gray-500">Date Issued</p>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-bold text-2xl font-signature text-[#1a237e]" style={{ fontFamily: 'Cursive' }}>{teacher.name}</div>
                                        <div className="h-px w-48 bg-gray-400 mt-1 mx-auto"></div>
                                        <p className="text-sm mt-1 font-serif italic text-gray-500">Instructor Signature</p>
                                    </div>
                                </div>

                                <div className="relative z-10 text-[10px] text-gray-400 mt-4 uppercase tracking-wider">
                                    Certificate ID: {course.id}-{selectedStudent.id} • Verified by Clazz.lk
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            {existingCertificate && (
                                <button
                                    onClick={handleIssue}
                                    disabled={isGenerating}
                                    className="px-4 py-2 border border-red-500 text-red-500 rounded-md hover:bg-red-50"
                                >
                                    {isGenerating ? "Re-issuing..." : "Re-issue New Certificate"}
                                </button>
                            )}
                            {!existingCertificate && (
                                <button
                                    onClick={handleIssue}
                                    disabled={isGenerating}
                                    className="flex items-center space-x-2 px-6 py-2 bg-primary text-white font-bold rounded-md hover:bg-primary-dark disabled:opacity-50"
                                >
                                    <CheckCircleIcon className="w-5 h-5" />
                                    <span>{isGenerating ? "Issuing..." : "Issue & Email Certificate"}</span>
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default CertificateModal;
