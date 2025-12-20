import React, { useRef, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { useData } from '../../contexts/DataContext.tsx';
import { User } from '../../types.ts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DownloadIcon } from '../Icons.tsx';
import MarkdownDisplay from '../MarkdownDisplay.tsx';

const CVPage: React.FC<{ children: React.ReactNode; ref?: React.Ref<HTMLDivElement> }> = React.forwardRef(({ children }, ref) => (
    <div ref={ref} className="a4-page bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-lg my-4 mx-auto overflow-hidden print:shadow-none print:my-0 print:mx-0">
        {children}
    </div>
));

const StudentCV: React.FC = () => {
    const { currentUser } = useAuth();
    const { sales, teachers, submissions } = useData();

    const page1Ref = useRef<HTMLDivElement>(null);
    const page2Ref = useRef<HTMLDivElement>(null);

    const user = currentUser as User;

    const cvData = useMemo(() => {
        if (!user) return null;

        const enrolledCourses = sales
            .filter(s => s.studentId === user.id && s.itemType === 'course' && s.status === 'completed')
            .map(s => {
                const teacher = teachers.find(t => t.id === s.teacherId);
                return `${s.itemName} (by ${teacher?.name || '...'})`;
            });
        
        const quizResults = submissions
            .filter(s => s.studentId === user.id)
            .map(s => {
                const sale = sales.find(sale => sale.itemId === s.quizId && sale.itemType === 'quiz' && (sale.itemSnapshot as any)?.instanceStartDate === s.quizInstanceId);
                if (!sale) return null;
                const quiz = sale.itemSnapshot as any;
                const score = `${s.score}/${quiz.questions.length}`;
                return `${quiz.title} - Score: ${score}`;
            }).filter(Boolean);

        return { enrolledCourses, quizResults };

    }, [user, sales, teachers, submissions]);

    if (!user) {
        return <p>Loading user data...</p>;
    }
    
    const handleDownloadPdf = async () => {
        const p1 = page1Ref.current;
        const p2 = page2Ref.current;
        if (!p1) return;

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        
        const canvas1 = await html2canvas(p1, { scale: 3, useCORS: true, backgroundColor: null });
        const imgData1 = canvas1.toDataURL('image/png');
        const pdfHeight1 = (canvas1.height * pdfWidth) / canvas1.width;
        pdf.addImage(imgData1, 'PNG', 0, 0, pdfWidth, pdfHeight1);
        
        const hasPage2Content = user.projects?.length || user.achievements?.length || cvData?.enrolledCourses.length || cvData?.quizResults.length || user.hobbies?.length || user.certifications?.length || user.references?.length;

        if (p2 && hasPage2Content) {
            const canvas2 = await html2canvas(p2, { scale: 3, useCORS: true, backgroundColor: null });
            pdf.addPage();
            const imgData2 = canvas2.toDataURL('image/png');
            const pdfHeight2 = (canvas2.height * pdfWidth) / canvas2.width;
            pdf.addImage(imgData2, 'PNG', 0, 0, pdfWidth, pdfHeight2);
        }

        pdf.save(`CV_${user.firstName}_${user.lastName}.pdf`);
    };

    const hasPage2Content = user.projects?.length || user.achievements?.length || (cvData?.enrolledCourses && cvData.enrolledCourses.length > 0) || (cvData?.quizResults && cvData.quizResults.length > 0) || user.hobbies?.length || user.certifications?.length || user.references?.length;

    return (
        <div className="bg-light-background dark:bg-dark-background p-4 rounded-lg">
             <style>{`
                .a4-page {
                    width: 210mm;
                    min-height: 297mm;
                    display: grid;
                    grid-template-columns: 1fr 2fr;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                }
                .cv-left-column { background: #23395d; color: white; padding: 30px; }
                .cv-right-column { padding: 40px; }
                .cv-left-column h3, .cv-right-column h3 { color: #a8c0ff; border-bottom: 2px solid #a8c0ff; display: inline-block; padding-bottom: 5px; font-size: 1.1em; font-weight: bold; margin-bottom: 0.75rem;}
                .cv-right-column h3 { color: #23395d; }
                .dark .cv-right-column h3 { color: #a8c0ff; }
             `}</style>
             <div className="flex justify-center mb-4">
                 <button onClick={handleDownloadPdf} className="flex items-center space-x-2 px-6 py-2 border border-primary text-primary rounded-md font-semibold hover:bg-primary/10 transition-colors">
                     <DownloadIcon className="w-5 h-5"/>
                     <span>Download CV as PDF</span>
                 </button>
             </div>

            <CVPage ref={page1Ref}>
                <div className="cv-left-column">
                    {user.avatar && (
                        <img src={user.avatar} alt="Profile" className="w-[150px] h-[150px] object-cover rounded-full mx-auto mb-6 border-4 border-white/50" crossOrigin="anonymous"/>
                    )}
                    <h2 className="text-2xl font-bold">{user.firstName} {user.lastName}</h2>
                    <p className="text-blue-200">{user.targetAudience}</p>

                    <div className="mt-8 text-left text-sm space-y-4">
                        <div>
                            <h3>Contact</h3>
                            {user.contactNumber && <p className="mt-2">📞 {user.contactNumber}</p>}
                            {user.email && <p>✉️ {user.email}</p>}
                            {user.address?.city && <p>🌍 {user.address.city}, {user.address.country}</p>}
                        </div>

                        {user.technicalSkills && user.technicalSkills.length > 0 && (
                            <div>
                                <h3>Technical Skills</h3>
                                {user.technicalSkills.map(skill => <p key={skill} className="mt-2 text-blue-100">{skill}</p>)}
                            </div>
                        )}
                        {user.softSkills && user.softSkills.length > 0 && (
                            <div>
                                <h3>Soft Skills</h3>
                                {user.softSkills.map(skill => <p key={skill} className="mt-2 text-blue-100">{skill}</p>)}
                            </div>
                        )}
                         {user.languages && user.languages.length > 0 && (
                            <div>
                                <h3>Languages</h3>
                                {user.languages.map(lang => <p key={lang} className="mt-2 text-blue-100">{lang}</p>)}
                            </div>
                        )}
                        {user.hobbies && user.hobbies.length > 0 && (
                            <div>
                                <h3>Hobbies & Interests</h3>
                                <ul className="mt-2 space-y-1 list-disc list-inside text-blue-100">
                                    {user.hobbies.map(hobby => <li key={hobby}>{hobby}</li>)}
                                </ul>
                            </div>
                        )}
                        {user.references && user.references.length > 0 && (
                            <div>
                                <h3>References</h3>
                                <div className="mt-2 space-y-3">
                                    {user.references.map(ref => (
                                        <div key={ref.id} className="text-xs">
                                            <p className="font-bold">{ref.name}</p>
                                            <p>{ref.title}</p>
                                            <p>{ref.organization}</p>
                                            {ref.email && <p>{ref.email}</p>}
                                            {ref.phone && <p>{ref.phone}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="cv-right-column">
                    {user.profileSummary && (
                        <div className="mb-8">
                            <h3>Profile Summary</h3>
                            <MarkdownDisplay content={user.profileSummary || ''} className="mt-3 text-sm leading-relaxed prose-sm prose-p:my-0"/>
                        </div>
                    )}
                    {user.experience && user.experience.length > 0 && (
                        <div className="mb-8">
                            <h3>Work Experience</h3>
                            <div className="mt-3 space-y-4">
                                {user.experience.map(exp => (
                                    <div key={exp.id}>
                                        <p className="font-bold text-md">{exp.role} at {exp.organization}</p>
                                        <p className="text-xs text-light-subtle dark:text-dark-subtle">{exp.period}</p>
                                        <MarkdownDisplay content={exp.description || ''} className="mt-1 text-sm leading-relaxed prose-sm prose-p:my-0" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {user.education && user.education.length > 0 && (
                        <div>
                            <h3>Education</h3>
                            <div className="mt-3 space-y-4">
                                {user.education.map(edu => (
                                    <div key={edu.id}>
                                        <p className="font-bold text-md">{edu.qualification}</p>
                                        <p className="text-sm">{edu.institution}</p>
                                        <p className="text-xs text-light-subtle dark:text-dark-subtle">{edu.period}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </CVPage>
            
            {hasPage2Content && (
                <CVPage ref={page2Ref}>
                    <div className="cv-left-column">
                        <div className="mt-8 text-left text-sm space-y-4">
                            <div>
                                <h3>Contact</h3>
                                {user.contactNumber && <p className="mt-2">📞 {user.contactNumber}</p>}
                                {user.email && <p>✉️ {user.email}</p>}
                                {user.address?.city && <p>🌍 {user.address.city}, {user.address.country}</p>}
                            </div>
                             {user.technicalSkills && user.technicalSkills.length > 0 && (
                                <div>
                                    <h3>Technical Skills</h3>
                                    {user.technicalSkills.map(skill => <p key={skill} className="mt-2 text-blue-100">{skill}</p>)}
                                </div>
                            )}
                            {user.softSkills && user.softSkills.length > 0 && (
                                <div>
                                    <h3>Soft Skills</h3>
                                    {user.softSkills.map(skill => <p key={skill} className="mt-2 text-blue-100">{skill}</p>)}
                                </div>
                            )}
                             {user.languages && user.languages.length > 0 && (
                                <div>
                                    <h3>Languages</h3>
                                    {user.languages.map(lang => <p key={lang} className="mt-2 text-blue-100">{lang}</p>)}
                                </div>
                            )}
                            {user.hobbies && user.hobbies.length > 0 && (
                                <div>
                                    <h3>Hobbies & Interests</h3>
                                    <ul className="mt-2 space-y-1 list-disc list-inside text-blue-100">
                                        {user.hobbies.map(hobby => <li key={hobby}>{hobby}</li>)}
                                    </ul>
                                </div>
                            )}
                            {user.references && user.references.length > 0 && (
                                <div>
                                    <h3>References</h3>
                                    <div className="mt-2 space-y-3">
                                        {user.references.map(ref => (
                                            <div key={ref.id} className="text-xs">
                                                <p className="font-bold">{ref.name}</p>
                                                <p>{ref.title}</p>
                                                <p>{ref.organization}</p>
                                                {ref.email && <p>{ref.email}</p>}
                                                {ref.phone && <p>{ref.phone}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="cv-right-column">
                        {user.projects && user.projects.length > 0 && (
                             <div className="mb-8">
                                <h3>Projects</h3>
                                <div className="mt-3 space-y-4">
                                    {user.projects.map(proj => (
                                        <div key={proj.id}>
                                            <p className="font-bold text-md">{proj.name}</p>
                                            <MarkdownDisplay content={proj.description || ''} className="text-sm leading-relaxed prose-sm prose-p:my-0" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {user.certifications && user.certifications.length > 0 && (
                             <div className="mb-8">
                                <h3>Certifications & Trainings</h3>
                                <ul className="mt-3 space-y-2 list-disc list-inside text-sm">
                                    {user.certifications.map(cert => <li key={cert}>{cert}</li>)}
                                </ul>
                            </div>
                        )}
                        {user.achievements && user.achievements.length > 0 && (
                             <div className="mb-8">
                                <h3>Awards & Achievements</h3>
                                <ul className="mt-3 space-y-2 list-disc list-inside text-sm">
                                    {user.achievements.map(ach => <li key={ach}>{ach}</li>)}
                                </ul>
                            </div>
                        )}
                        {cvData && cvData.enrolledCourses.length > 0 && (
                             <div className="mb-8">
                                <h3>Completed Courses on Clazz.lk</h3>
                                <ul className="mt-3 space-y-2 list-disc list-inside text-sm">
                                    {cvData.enrolledCourses.map(c => <li key={c}>{c}</li>)}
                                </ul>
                            </div>
                        )}
                        {cvData && cvData.quizResults.length > 0 && (
                             <div className="mb-8">
                                <h3>Quiz Results on Clazz.lk</h3>
                                <ul className="mt-3 space-y-2 list-disc list-inside text-sm">
                                    {cvData.quizResults.map(r => <li key={r as string}>{r}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                </CVPage>
            )}
        </div>
    );
};

export default StudentCV;