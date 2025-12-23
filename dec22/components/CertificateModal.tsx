
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
  const { users, sales } = useData();
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

  const generatePDF = async () => {
    if (!certificateRef.current || !selectedStudent) return;
    setIsGenerating(true);

    try {
        const canvas = await html2canvas(certificateRef.current, { scale: 2, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Certificate - ${selectedStudent.firstName} ${selectedStudent.lastName}.pdf`);
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
                    Select a student to generate a certificate of completion for <strong>{course.title}</strong>.
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

            {selectedStudent && (
                <>
                    <div className="border border-gray-300 shadow-lg overflow-hidden">
                        <div 
                            ref={certificateRef} 
                            className="relative w-full bg-white text-black p-16 text-center flex flex-col justify-center items-center"
                            style={{ minHeight: '600px', border: '20px solid #2563eb' }} // Blue border
                        >
                             <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none" style={{ backgroundImage: 'url(/Logo3.png)', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundSize: '50%' }}></div>
                             
                             <h1 className="text-5xl font-serif font-bold text-blue-900 mb-8 uppercase tracking-widest">Certificate of Completion</h1>
                             <p className="text-xl mb-2">This is to certify that</p>
                             <h2 className="text-4xl font-bold text-black mb-4 border-b-2 border-gray-400 px-8 pb-2 inline-block min-w-[300px]">{selectedStudent.firstName} {selectedStudent.lastName}</h2>
                             <p className="text-xl mb-2">has successfully completed the course</p>
                             <h3 className="text-3xl font-bold text-blue-700 mb-12">{course.title}</h3>
                             
                             <div className="flex justify-between w-full px-20 mt-12">
                                 <div className="text-center">
                                     <p className="font-bold text-lg">{currentDate}</p>
                                     <div className="h-px w-40 bg-black mt-1"></div>
                                     <p className="text-sm mt-1 font-semibold text-gray-600">Date</p>
                                 </div>
                                 <div className="text-center">
                                     <p className="font-bold text-lg font-signature text-2xl">{teacher.name}</p> 
                                     <div className="h-px w-40 bg-black mt-1"></div>
                                     <p className="text-sm mt-1 font-semibold text-gray-600">Instructor</p>
                                 </div>
                             </div>
                             
                             <div className="mt-12 text-xs text-gray-400">
                                 Verified by clazz.lk | ID: {course.id}-{selectedStudent.id}
                             </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-end">
                        <button 
                            onClick={generatePDF} 
                            disabled={isGenerating}
                            className="flex items-center space-x-2 px-6 py-2 bg-primary text-white font-bold rounded-md hover:bg-primary-dark disabled:opacity-50"
                        >
                            <DownloadIcon className="w-5 h-5" />
                            <span>{isGenerating ? "Generating..." : "Download PDF"}</span>
                        </button>
                    </div>
                </>
            )}
        </div>
    </Modal>
  );
};

export default CertificateModal;
