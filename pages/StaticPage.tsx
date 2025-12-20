import React from 'react';
import { ChevronLeftIcon } from '../components/Icons.tsx';

interface StaticPageProps {
    title: string;
    content: string;
    onBack: () => void;
}

const StaticPage: React.FC<StaticPageProps> = ({ title, content, onBack }) => {
    // Basic prose styles for light and dark mode
    const proseStyles = `
        prose 
        prose-slate 
        dark:prose-invert 
        max-w-none 
        prose-h1:text-3xl
        prose-h2:text-2xl
        prose-p:leading-relaxed
        prose-a:text-primary
        prose-a:no-underline
        hover:prose-a:underline
    `;

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slideInUp">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <button onClick={onBack} className="flex items-center space-x-2 text-sm font-medium text-primary hover:text-primary-dark transition-colors">
                        <ChevronLeftIcon className="h-5 w-5" />
                        <span>Back</span>
                    </button>
                </div>
                <div className="bg-light-surface dark:bg-dark-surface p-8 md:p-12 rounded-lg shadow-md">
                    <div className={proseStyles}>
                        <h1>{title}</h1>
                        <div dangerouslySetInnerHTML={{ __html: content }} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaticPage;