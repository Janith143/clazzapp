import React from 'react';
import { User } from '../../types.ts';
import { getOptimizedImageUrl } from '../../utils.ts';
import { LogoIcon } from '../Icons.tsx';
import QRCodeWithLogo from '../QRCodeWithLogo.tsx';

interface StudentIdCardProps {
    user: User;
    tagline: string;
}

const StudentIdCard = React.forwardRef<HTMLDivElement, StudentIdCardProps>(({ user, tagline }, ref) => {
    return (
        <div ref={ref} className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-800 dark:to-slate-900 rounded-xl shadow-lg p-6 max-w-md mx-auto border border-light-border dark:border-dark-border">
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <LogoIcon className="h-8 w-8 text-primary" />
                    <span className="text-xl font-bold text-light-text dark:text-dark-text">clazz.<span className="text-primary">lk</span></span>
                </div>
                <div className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-full">STUDENT ID</div>
            </div>

            <div className="mt-6 flex items-center space-x-4">
                {user.avatar ? (
                    <img src={getOptimizedImageUrl(user.avatar, 80, 80)} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-white dark:border-dark-surface" crossOrigin="anonymous" />
                ) : (
                    <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white font-bold text-3xl border-2 border-white dark:border-dark-surface">
                        <span>{user.firstName?.charAt(0)}{user.lastName?.charAt(0)}</span>
                    </div>
                )}
                <div>
                    <h3 className="text-2xl font-bold text-light-text dark:text-dark-text">{user.firstName} {user.lastName}</h3>
                    <p className="text-sm text-light-subtle dark:text-dark-subtle font-mono">{user.id}</p>
                </div>
            </div>

            <div className="mt-4 flex justify-center h-32 w-32 mx-auto p-1 bg-white rounded-md shadow-sm">
                <QRCodeWithLogo
                    data={user.id}
                    logoSrc="/Logo3.png"
                    size={128}
                    crossOrigin="anonymous"
                    className="w-full h-full object-contain"
                />
            </div>

            <div className="mt-4 pt-4 border-t border-primary/20 text-center">
                <p className="text-sm italic text-light-subtle dark:text-dark-subtle">"{tagline}"</p>
            </div>
        </div>
    );
});

export default StudentIdCard;
