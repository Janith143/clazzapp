import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { CheckCircleIcon, XCircleIcon } from '../Icons';

export const CommunicationHistory: React.FC = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const q = query(collection(db, 'communication_logs'), orderBy('timestamp', 'desc'), limit(50));
                const snapshot = await getDocs(q);
                setLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (error) {
                console.error("Error fetching logs:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, []);

    if (loading) return <div className="p-8 text-center text-light-subtle">Loading history...</div>;

    return (
        <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-light-border dark:divide-dark-border">
                    <thead className="bg-light-background dark:bg-dark-background">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Channels</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Recipients</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Stats (Success/Fail)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-light-subtle dark:text-dark-subtle uppercase tracking-wider">Preview</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-dark-surface divide-y divide-light-border dark:divide-dark-border">
                        {logs.map(log => (
                            <tr key={log.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-light-text dark:text-dark-text">
                                    {new Date(log.timestamp).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-light-text dark:text-dark-text">
                                    <div className="flex space-x-1">
                                        {log.channels?.map((c: string) => (
                                            <span key={c} className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 capitalize">
                                                {c}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-light-text dark:text-dark-text">
                                    {log.recipientCount}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <div className="flex flex-col space-y-1">
                                        {log.stats?.email && (
                                            <div className="flex items-center text-xs">
                                                <span className="w-12">Email:</span>
                                                <span className="text-green-600 mr-2">{log.stats.email.success}</span>
                                                <span className="text-red-600">{log.stats.email.failed}</span>
                                            </div>
                                        )}
                                        {log.stats?.sms && (
                                            <div className="flex items-center text-xs">
                                                <span className="w-12">SMS:</span>
                                                <span className="text-green-600 mr-2">{log.stats.sms.success}</span>
                                                <span className="text-red-600">{log.stats.sms.failed}</span>
                                            </div>
                                        )}
                                        {log.stats?.push && (
                                            <div className="flex items-center text-xs">
                                                <span className="w-12">Push:</span>
                                                <span className="text-green-600 mr-2">{log.stats.push.success}</span>
                                                <span className="text-red-600">{log.stats.push.failed}</span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-light-subtle dark:text-dark-subtle max-w-xs truncate">
                                    {log.messagePreview?.subject || log.messagePreview?.push || log.messagePreview?.sms}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
