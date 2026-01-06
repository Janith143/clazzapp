import React, { useState, useEffect, useCallback } from 'react';
import Modal from './Modal.tsx';
import { VideoCameraIcon, LockClosedIcon, PlayCircleIcon } from './Icons.tsx';
import { Course, Lecture, User } from '../types.ts';
import { useUI } from '../contexts/UIContext.tsx';
import { useData } from '../contexts/DataContext.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import { YouTubePlayer } from './YouTubePlayer.tsx';
import MarkdownDisplay from './MarkdownDisplay.tsx';
import { getYoutubeVideoId } from '../utils';

const VideoPlayerModal: React.FC = () => {
    const { videoPlayerState, setVideoPlayerState } = useUI();
    const { isOpen, lecture, course, isEnrolled } = videoPlayerState;
    const { currentUser } = useAuth();
    const { logLectureWatch } = useData();

    const [currentLecture, setCurrentLecture] = useState<Lecture | null>(lecture);
    const [videoInfo, setVideoInfo] = useState<{ provider: string; videoId: string | null }>({ provider: 'unknown', videoId: null });

    const parseVideoUrl = (url: string | undefined): { provider: string; videoId: string | null } => {
        if (!url) return { provider: 'unknown', videoId: null };
        try {
            const urlObj = new URL(url);
            if (urlObj.hostname.includes('vimeo.com')) {
                const videoId = urlObj.pathname.split('/').pop();
                return { provider: 'vimeo', videoId };
            }
            if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
                const videoId = getYoutubeVideoId(url);
                return { provider: 'youtube', videoId };
            }
            if (urlObj.hostname.includes('drive.google.com')) {
                const parts = urlObj.pathname.split('/');
                const fileIdIndex = parts.indexOf('d');
                if (fileIdIndex > -1 && parts.length > fileIdIndex + 1) {
                    const videoId = parts[fileIdIndex + 1];
                    return { provider: 'googledrive', videoId };
                }
            }
        } catch (e) {
            console.error("Invalid video URL", e);
        }
        return { provider: 'unknown', videoId: null };
    };

    useEffect(() => {
        if (isOpen) {
            setCurrentLecture(lecture);
            if (lecture?.videoUrl) {
                setVideoInfo(parseVideoUrl(lecture.videoUrl));
            }
        } else {
            setVideoInfo({ provider: 'unknown', videoId: null });
        }
    }, [isOpen, lecture]);

    useEffect(() => {
        if (isOpen && course && currentLecture && isEnrolled) {
            logLectureWatch(course.id, currentLecture.id);
        }
    }, [isOpen, course, currentLecture, isEnrolled, logLectureWatch]);

    const getEmbedUrl = (url: string | undefined): string | null => {
        if (!url) return null;
        try {
            const urlObj = new URL(url);
            // Vimeo
            if (urlObj.hostname.includes('vimeo.com')) {
                const videoId = urlObj.pathname.split('/').pop();
                return `https://player.vimeo.com/video/${videoId}?autoplay=1`;
            }
            // YouTube - Note: This is now a fallback, the dedicated component is preferred
            if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
                const videoId = getYoutubeVideoId(url);
                return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : null;
            }
            // Google Drive
            if (urlObj.hostname.includes('drive.google.com')) {
                const parts = urlObj.pathname.split('/');
                const fileIdIndex = parts.indexOf('d');
                if (fileIdIndex > -1 && parts.length > fileIdIndex + 1) {
                    const videoId = parts[fileIdIndex + 1];
                    return `https://drive.google.com/file/d/${videoId}/preview`;
                }
            }
        } catch (e) {
            console.error("Invalid video URL", e);
            return null;
        }
        return url;
    }

    const onClose = useCallback(() => setVideoPlayerState({ isOpen: false, lecture: null, course: null, isEnrolled: false }), [setVideoPlayerState]);

    if (!isOpen || !course || !currentLecture) return null;

    const embedUrl = getEmbedUrl(currentLecture.videoUrl);

    const handleSelectLecture = (lecture: Lecture) => {
        if (isEnrolled || lecture.isFreePreview) {
            setCurrentLecture(lecture);
            setVideoInfo(parseVideoUrl(lecture.videoUrl));
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={course.title} size="5xl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main video player and description */}
                <div className="lg:col-span-2">
                    {videoInfo.provider === 'youtube' && videoInfo.videoId ? (
                        <YouTubePlayer videoId={videoInfo.videoId} currentUser={currentUser} />
                    ) : (
                        <div className="aspect-video bg-black rounded-lg">
                            {embedUrl ? (
                                <iframe
                                    src={embedUrl}
                                    className="w-full h-full rounded-lg"
                                    frameBorder="0"
                                    allow="autoplay; fullscreen; picture-in-picture"
                                    allowFullScreen
                                    title={currentLecture.title}
                                ></iframe>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-light-subtle dark:text-dark-subtle">
                                    <VideoCameraIcon className="w-16 h-16 text-gray-400 dark:text-gray-600" />
                                    <p className="mt-4 font-semibold">Video not available</p>
                                    <p className="text-sm">The link for this lecture may be missing or invalid.</p>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="mt-4 p-2">
                        <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">{currentLecture.title}</h2>
                        <MarkdownDisplay content={currentLecture.description || ''} className="mt-2 text-sm text-light-subtle dark:text-dark-subtle" />
                    </div>
                </div>

                {/* Playlist sidebar */}
                <div className="lg:col-span-1">
                    <h3 className="text-lg font-semibold mb-3">Course Content</h3>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                        {course.lectures.map((lecture, index) => {
                            const canPlay = isEnrolled || lecture.isFreePreview;
                            const isActive = lecture.id === currentLecture.id;
                            return (
                                <button
                                    key={lecture.id}
                                    disabled={!canPlay}
                                    onClick={() => handleSelectLecture(lecture)}
                                    className={`w-full flex items-center justify-between p-3 rounded-md border text-left transition-colors
                                ${isActive ? 'bg-primary/10 border-primary' : 'bg-light-background dark:bg-dark-background border-light-border dark:border-dark-border'}
                                ${canPlay ? 'cursor-pointer hover:border-primary' : 'cursor-not-allowed opacity-70'}
                            `}
                                >
                                    <div className="flex items-start">
                                        <span className={`mr-3 mt-1 font-bold text-sm ${isActive ? 'text-primary' : 'text-light-subtle dark:text-dark-subtle'}`}>{index + 1}</span>
                                        <div>
                                            <p className={`font-semibold ${isActive ? 'text-primary' : 'text-light-text dark:text-dark-text'}`}>{lecture.title}</p>
                                            <p className="text-xs text-light-subtle dark:text-dark-subtle">
                                                {lecture.durationMinutes} mins
                                                {lecture.isFreePreview && <span className="text-green-500 font-medium ml-2">(Free Preview)</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 ml-2">
                                        {canPlay
                                            ? <PlayCircleIcon className={`w-6 h-6 ${isActive ? 'text-primary' : 'text-light-subtle dark:text-dark-subtle'}`} />
                                            : <LockClosedIcon className="w-5 h-5 text-light-subtle dark:text-dark-subtle" />
                                        }
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default VideoPlayerModal;