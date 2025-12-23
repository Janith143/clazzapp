import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useNavigation } from '../contexts/NavigationContext';
import StudentAttendanceModal from '../components/ti/StudentAttendanceModal';
import { User, IndividualClass, Sale } from '../types';
import { ChevronLeftIcon, CameraIcon } from '../components/Icons.tsx';

// jsQR is loaded from a CDN in index.html, so it's available on the window object
declare const jsQR: any;

interface AttendanceScannerPageProps {
    classId?: number;
    eventId?: string;
}

const AttendanceScannerPage: React.FC<AttendanceScannerPageProps> = ({ classId, eventId }) => {
    const { users, sales, teachers } = useData();
    const { handleBack } = useNavigation();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameId = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [scannedStudent, setScannedStudent] = useState<User | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const classInfo = useMemo(() => {
        if (!classId) return null;
        for (const teacher of teachers) {
            const foundClass = teacher.individualClasses.find(c => c.id === classId);
            if (foundClass) return foundClass;
        }
        return null;
    }, [teachers, classId]);

    const studentSale = useMemo(() => {
        if (!scannedStudent || !classInfo) return null;
        return sales.find(s => s.studentId === scannedStudent.id && s.itemId === classInfo.id && s.itemType === 'class' && s.status === 'completed');
    }, [sales, scannedStudent, classInfo]);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setScannedStudent(null);
    }, []);

    const handleScanResult = useCallback((result: string) => {
        const student = users.find(u => u.id === result);
        if (student) {
            setScannedStudent(student);
            setIsModalOpen(true);
        } else {
            setError(`Student ID "${result}" not found.`);
            setTimeout(() => {
                setError('');
            }, 3000);
        }
    }, [users]);
    
    // Effect for controlling the scanning loop
    useEffect(() => {
        let isCancelled = false;
        
        const tick = () => {
            if (isCancelled) return;

            if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                if (canvasRef.current) {
                    const canvas = canvasRef.current;
                    const video = videoRef.current;
                    const ctx = canvas.getContext('2d');
                    
                    if (video.videoWidth > 0) {
                        canvas.height = video.videoHeight;
                        canvas.width = video.videoWidth;
                        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
                        if (imageData) {
                            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                                inversionAttempts: 'dontInvert',
                            });
                            if (code && code.data) {
                                handleScanResult(code.data);
                                // Stop the loop once a code is found and modal opens
                                return; 
                            }
                        }
                    }
                }
            }
            animationFrameId.current = requestAnimationFrame(tick);
        };

        if (!isModalOpen && !isLoading) {
            animationFrameId.current = requestAnimationFrame(tick);
        }

        return () => {
            isCancelled = true;
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [isModalOpen, isLoading, handleScanResult]);


    // Effect for camera setup and teardown
    useEffect(() => {
        const setupCamera = async () => {
            setError('');
            setIsLoading(true);

            // Check if mediaDevices and getUserMedia are supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setError("Camera access is not supported by this browser.");
                setIsLoading(false);
                return;
            }

            try {
                // Directly request the camera stream. This will trigger the permission prompt.
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    // The 'playsinline' attribute is important for iOS Safari to prevent fullscreen video.
                    videoRef.current.setAttribute('playsinline', 'true');
                    await videoRef.current.play();
                }
            } catch (err) {
                console.error("Camera Error:", err);
                let errorMessage = 'Could not access camera. Please grant permission and try again.';
                if (err instanceof DOMException) {
                    if (err.name === "NotAllowedError") {
                        errorMessage = "Camera permission was denied. Please enable it in your browser settings.";
                    } else if (err.name === "NotFoundError") {
                        errorMessage = "No camera found on this device.";
                    } else if (err.name === "NotReadableError") {
                        errorMessage = "The camera is currently in use by another application.";
                    }
                }
                setError(errorMessage);
            } finally {
                setIsLoading(false);
            }
        };

        setupCamera();

        // Cleanup function to stop the camera stream when the component unmounts
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []); // Empty dependency array ensures this runs only on mount and unmount

    
    if (!classInfo && !eventId) {
        return <div className="p-8 text-center">No class or event specified.</div>;
    }

    if (eventId && !classInfo) {
        // Handle case where eventId might be passed but classId is not.
        // The rest of the component is written only for classes, so we stop here for events.
        return <div className="p-8 text-center">{classId ? "Class not found." : "Event attendance scanning is not yet supported."}</div>;
    }

    if (!classInfo) {
        return <div className="p-8 text-center">Class not found.</div>
    }

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slideInUp">
             <div className="mb-4">
                <button onClick={handleBack} className="flex items-center space-x-2 text-sm font-medium text-primary hover:text-primary-dark transition-colors">
                    <ChevronLeftIcon className="h-5 w-5" />
                    <span>Back to Dashboard</span>
                </button>
            </div>
            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <h1 className="text-2xl font-bold">Attendance Scanner</h1>
                <p className="text-lg text-primary">{classInfo.title}</p>
                <div className="mt-4 relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center text-white">
                    <video ref={videoRef} className="w-full h-full object-cover" muted />
                    <canvas ref={canvasRef} className="hidden" />
                    {isLoading && <p>Starting camera...</p>}
                    {error && <p className="p-4 text-center text-red-400">{error}</p>}
                    {!isLoading && !error && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-2/3 h-2/3 border-4 border-dashed border-white/50 rounded-lg" />
                        </div>
                    )}
                </div>
                 <p className="text-center mt-4 text-light-subtle dark:text-dark-subtle">
                    <CameraIcon className="w-5 h-5 inline-block mr-2" />
                    Point the camera at the student's ID card QR code.
                </p>
            </div>
            {isModalOpen && scannedStudent && classInfo && (
                <StudentAttendanceModal
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    student={scannedStudent}
                    classInfo={classInfo}
                    sale={studentSale}
                />
            )}
        </div>
    );
};

export default AttendanceScannerPage;