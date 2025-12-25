import React, { useState, Suspense } from 'react';


const MessageSquareIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
);

// Lazy load the actual ChatWidget
const ChatWidget = React.lazy(() => import('./ChatWidget'));

const LazyChatWidget: React.FC = () => {
    const [isLoaded, setIsLoaded] = useState(false);

    // If not loaded, show a simple button that looks like the minimised chat widget
    if (!isLoaded) {
        return (
            <div className="fixed bottom-20 md:bottom-8 right-6 z-[60] flex flex-col items-end group">
                {/* Notification Badge */}
                <span className="absolute flex h-4 w-4 -top-1 -right-1 z-[61]">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white"></span>
                </span>

                <button
                    onClick={() => setIsLoaded(true)}
                    className="flex items-center p-4 bg-gradient-to-tr from-primary to-blue-500 text-white rounded-2xl shadow-xl hover:shadow-primary/40 transition-all duration-300 transform hover:scale-110 active:scale-95"
                    aria-label="Chat Now"
                >
                    {/* Reusing the SVG from ChatWidget or Icons.tsx if available. 
                         For now, I'll duplicate the SVG for zero-dependency loading */}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-8 h-8 group-hover:rotate-12 transition-transform duration-300">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                    </svg>
                    <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-3 transition-all duration-500 ease-in-out whitespace-nowrap font-bold">
                        Chat with us
                    </span>
                </button>
            </div>
        );
    }

    // Once loaded, render the real ChatWidget wrapped in Suspense
    return (
        <Suspense fallback={null}>
            <ChatWidget />
        </Suspense>
    );
};

export default LazyChatWidget;
