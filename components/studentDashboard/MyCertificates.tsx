import React from 'react';
import { useData } from '../../contexts/DataContext';
import { User, Certificate } from '../../types';
import { DownloadIcon } from '../Icons';

interface MyCertificatesProps {
    user: User;
}

const MyCertificates: React.FC<MyCertificatesProps> = ({ user }) => {
    const { certificates } = useData();

    const myCertificates = React.useMemo(() => {
        return certificates.filter(c => c.studentId === user.id).sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
    }, [certificates, user.id]);

    if (myCertificates.length === 0) {
        return (
            <div className="text-center py-12 bg-light-surface dark:bg-dark-surface rounded-lg shadow border border-light-border dark:border-dark-border">
                <p className="text-light-subtle dark:text-dark-subtle text-lg">You haven't earned any certificates yet.</p>
                <p className="text-sm text-gray-500 mt-2">Complete your courses to earn certificates!</p>
            </div>
        );
    }

    return (
        <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-sm border border-light-border dark:border-dark-border p-6 overflow-hidden">
            <h2 className="text-2xl font-bold mb-6 text-light-text dark:text-dark-text border-b border-light-border dark:border-dark-border pb-4">My Certificates</h2>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {myCertificates.map((cert) => (
                    <div key={cert.id} className="border border-l-4 border-l-blue-500 border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:shadow-md transition-shadow bg-white dark:bg-gray-800 flex flex-col justify-between h-full">
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Course Certificate</span>
                                <span className="text-xs text-gray-500">{new Date(cert.issuedAt).toLocaleDateString()}</span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2" title={cert.itemTitle}>{cert.itemTitle}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Instructor: {cert.teacherName}</p>

                            <div className="text-xs text-gray-400 mb-4 font-mono truncate">
                                ID: {cert.verificationId}
                            </div>
                        </div>

                        <a
                            href={cert.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-full px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-dark transition-colors"
                        >
                            <DownloadIcon className="w-4 h-4 mr-2" />
                            Download PDF
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MyCertificates;
