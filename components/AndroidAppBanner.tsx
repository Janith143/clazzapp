import React, { useEffect, useState } from 'react';
import { isWebView } from '../utils';

const AndroidAppBanner: React.FC = () => {
    const [shouldShow, setShouldShow] = useState(false);

    useEffect(() => {
        // Check if we verify NOT webview
        if (!isWebView()) {
            setShouldShow(true);
        }
    }, []);

    if (!shouldShow) return null;

    return (
        <div className="relative overflow-hidden bg-gradient-to-br from-[#3DDC84] to-[#34A853] rounded-3xl p-8 md:p-12 shadow-2xl text-white">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-black opacity-5 rounded-full blur-2xl pointer-events-none"></div>

            <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">

                {/* Visual Icon (Android Robot Head) */}
                <div className="flex-shrink-0 hidden md:block">
                    <svg className="w-32 h-32 text-white drop-shadow-md opacity-90" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.523 15.3414C17.523 15.3414 17.502 15.3533 17.502 15.3533L16.2731 13.5653C16.8906 13.0645 15.3276 11.2334 15.3276 11.2334L16.1423 10.1384C16.3262 9.89104 16.2721 9.53974 16.0248 9.35584C15.7774 9.17194 15.4261 9.22604 15.2422 9.47334L14.0754 11.0425C13.626 10.9506 13.1593 10.9038 12.6775 10.9038C12.1957 10.9038 11.729 10.9506 11.2797 11.0425L10.1129 9.47334C9.929 9.22604 9.5777 9.17194 9.3304 9.35584C9.083 9.53974 9.0289 9.89104 9.2128 10.1384L10.0275 11.2334C10.0275 11.2334 8.4645 13.0645 9.082 13.5653L7.8531 15.3533C7.8531 15.3533 7.8321 15.3414 7.8321 15.3414C7.7121 15.2674 7.556 15.3054 7.482 15.4254C7.408 15.5454 7.446 15.7014 7.566 15.7754C7.566 15.7754 8.5276 16.3683 9.7719 16.5925V18.1578H8.9179C8.7799 18.1578 8.6679 18.2698 8.6679 18.4078C8.6679 18.5458 8.7799 18.6578 8.9179 18.6578H16.4371C16.5751 18.6578 16.6871 18.5458 16.6871 18.4078C16.6871 18.2698 16.5751 18.1578 16.4371 18.1578H15.5832V16.5925C16.8275 16.3683 17.7891 15.7754 17.7891 15.7754C17.9091 15.7014 17.9471 15.5454 17.8731 15.4254C17.7991 15.3054 17.643 15.2674 17.523 15.3414ZM11.4552 13.0644C11.1966 13.0644 10.9869 12.8548 10.9869 12.5962C10.9869 12.3375 11.1966 12.1279 11.4552 12.1279C11.7139 12.1279 11.9235 12.3375 11.9235 12.5962C11.9235 12.8548 11.7139 13.0644 11.4552 13.0644ZM13.8999 13.0644C13.6413 13.0644 13.4316 12.8548 13.4316 12.5962C13.4316 12.3375 13.6413 12.1279 13.8999 12.1279C14.1585 12.1279 14.3682 12.3375 14.3682 12.5962C14.3682 12.8548 14.1585 13.0644 13.8999 13.0644Z" />
                    </svg>
                </div>

                <div className="flex-1 text-center md:text-left space-y-4">
                    <div className="md:hidden mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.523 15.3414C17.523 15.3414 17.502 15.3533 17.502 15.3533L16.2731 13.5653C16.8906 13.0645 15.3276 11.2334 15.3276 11.2334L16.1423 10.1384C16.3262 9.89104 16.2721 9.53974 16.0248 9.35584C15.7774 9.17194 15.4261 9.22604 15.2422 9.47334L14.0754 11.0425C13.626 10.9506 13.1593 10.9038 12.6775 10.9038C12.1957 10.9038 11.729 10.9506 11.2797 11.0425L10.1129 9.47334C9.929 9.22604 9.5777 9.17194 9.3304 9.35584C9.083 9.53974 9.0289 9.89104 9.2128 10.1384L10.0275 11.2334C10.0275 11.2334 8.4645 13.0645 9.082 13.5653L7.8531 15.3533C7.8531 15.3533 7.8321 15.3414 7.8321 15.3414C7.7121 15.2674 7.556 15.3054 7.482 15.4254C7.408 15.5454 7.446 15.7014 7.566 15.7754C7.566 15.7754 8.5276 16.3683 9.7719 16.5925V18.1578H8.9179C8.7799 18.1578 8.6679 18.2698 8.6679 18.4078C8.6679 18.5458 8.7799 18.6578 8.9179 18.6578H16.4371C16.5751 18.6578 16.6871 18.5458 16.6871 18.4078C16.6871 18.2698 16.5751 18.1578 16.4371 18.1578H15.5832V16.5925C16.8275 16.3683 17.7891 15.7754 17.7891 15.7754C17.9091 15.7014 17.9471 15.5454 17.8731 15.4254C17.7991 15.3054 17.643 15.2674 17.523 15.3414ZM11.4552 13.0644C11.1966 13.0644 10.9869 12.8548 10.9869 12.5962C10.9869 12.3375 11.1966 12.1279 11.4552 12.1279C11.7139 12.1279 11.9235 12.3375 11.9235 12.5962C11.9235 12.8548 11.7139 13.0644 11.4552 13.0644ZM13.8999 13.0644C13.6413 13.0644 13.4316 12.8548 13.4316 12.5962C13.4316 12.3375 13.6413 12.1279 13.8999 12.1279C14.1585 12.1279 14.3682 12.3375 14.3682 12.5962C14.3682 12.8548 14.1585 13.0644 13.8999 13.0644Z" />
                        </svg>
                    </div>
                    <h3 className="text-3xl font-extrabold tracking-tight">Get the Clazz Android App</h3>
                    <p className="text-lg text-green-50 font-medium">
                        Unlock the full potential of your learning journey.
                    </p>
                    <ul className="inline-flex flex-col md:flex-row gap-4 md:gap-8 text-sm font-medium text-green-100 mt-2">
                        <li className="flex items-center"><span className="mr-2">⚡</span> Faster Navigation</li>
                        <li className="flex items-center"><span className="mr-2">📱</span> Smooth Experience</li>
                        <li className="flex items-center"><span className="mr-2">🔔</span> Instant Updates</li>
                    </ul>
                </div>

                <div className="flex-shrink-0">
                    <a
                        href="https://play.google.com/store/apps/details?id=com.clazz.app&pcampaignid=web_share"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-900 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                        <svg className="w-8 h-8 mr-3 text-[#3DDC84]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3.609 1.814L13.792 12 3.61 22.186a2.048 2.048 0 01-1.359-1.921V3.735a2.048 2.048 0 011.358-1.921zM15.485 13.693l5.068 2.852a1.023 1.023 0 001.447-1.119L15.618 12 15.485 13.693zM14.613 11l-9.87-9.871c.216-.142.484-.207.747-.156.495.097 6.942 3.903 14.939 8.403L14.613 11zM14.613 13l5.816 3.624c-7.997 4.5-14.444 8.306-14.939 8.403a1.36 1.36 0 01-.747-.156L14.613 13z" />
                        </svg>
                        <div className="text-left">
                            <div className="text-xs uppercase font-semibold tracking-wider text-gray-400">Get it on</div>
                            <div className="text-xl font-bold font-sans -mt-1">Google Play</div>
                        </div>
                    </a>
                </div>
            </div>
        </div>
    );
};

export default AndroidAppBanner;
