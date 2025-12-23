import React, { useState, useCallback, useRef, useEffect } from 'react';
import Modal from './Modal.tsx';
import ImageUploadInput from './ImageUploadInput.tsx';
import { SaveIcon, CameraIcon, XIcon, UploadIcon } from './Icons.tsx';
import { useUI } from '../contexts/UIContext.tsx';
import { useData } from '../contexts/DataContext.tsx';

const SpinnerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const ImageUploadModal: React.FC = () => {
    const { imageUploadModal, setImageUploadModal } = useUI();
    const { handleImageSave } = useData();

    // State for standard image upload
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    
    // State for cropper
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    
    const [isSaving, setIsSaving] = useState(false);
    
    const isCroppingMode = imageUploadModal.type === 'profile' || imageUploadModal.type === 'student_profile';

    const onClose = useCallback(() => {
        if (isSaving) return;
        setImageUploadModal({ isOpen: false, type: null, context: undefined });
        setSelectedImage(null);
        setSourceImage(null);
        imageRef.current = null;
    }, [isSaving, setImageUploadModal]);
    
    useEffect(() => {
        if (!imageUploadModal.isOpen) {
             setSourceImage(null);
             setSelectedImage(null);
             imageRef.current = null;
        }
    }, [imageUploadModal.isOpen]);

    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const image = imageRef.current;
        if (!canvas || !image) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
    
        const canvasSize = canvas.width;
        ctx.clearRect(0, 0, canvasSize, canvasSize);
    
        // Calculate the minimum zoom to fit the image
        const minZoom = Math.max(canvasSize / image.width, canvasSize / image.height);
        const effectiveZoom = Math.max(zoom, minZoom);
    
        const scaledWidth = image.width * effectiveZoom;
        const scaledHeight = image.height * effectiveZoom;
    
        const x = (canvasSize - scaledWidth) / 2 + offset.x;
        const y = (canvasSize - scaledHeight) / 2 + offset.y;
    
        ctx.drawImage(image, x, y, scaledWidth, scaledHeight);
    }, [zoom, offset]);
    
    useEffect(() => {
        if (sourceImage && imageRef.current) {
            drawCanvas();
        }
    }, [sourceImage, drawCanvas]);

    const handleFileSelect = (base64: string) => {
        if (isCroppingMode) {
            const img = new Image();
            img.onload = () => {
                imageRef.current = img;
                const canvas = canvasRef.current;
                const canvasSize = canvas ? canvas.width : 300;
                const minZoom = Math.max(canvasSize / img.width, canvasSize / img.height);
                setZoom(minZoom); // Start with image fitting the crop area
                setOffset({ x: 0, y: 0 });
                setSourceImage(base64);
            };
            img.src = base64;
        } else {
            setSelectedImage(base64);
        }
    };
    
    const getCroppedImage = (): string | null => {
        const canvas = canvasRef.current;
        const image = imageRef.current;
        if (!canvas || !image) return null;

        const outputSize = 256;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = outputSize;
        tempCanvas.height = outputSize;
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) return null;
        
        const canvasSize = canvas.width;
        const minZoom = Math.max(canvasSize / image.width, canvasSize / image.height);
        const effectiveZoom = Math.max(zoom, minZoom);
        
        const displayWidth = image.width * effectiveZoom;
        const displayHeight = image.height * effectiveZoom;
        
        const displayX = (canvasSize - displayWidth) / 2 + offset.x;
        const displayY = (canvasSize - displayHeight) / 2 + offset.y;

        const sourceX = -displayX / effectiveZoom;
        const sourceY = -displayY / effectiveZoom;
        const sourceSize = canvasSize / effectiveZoom;
        
        ctx.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, outputSize, outputSize);
        return tempCanvas.toDataURL('image/png');
    };

    const handleSave = async () => {
        let imageToSave: string | null = null;
        if (isCroppingMode) {
            imageToSave = getCroppedImage();
        } else {
            imageToSave = selectedImage;
        }
        
        if (imageToSave && !isSaving) {
            setIsSaving(true);
            try {
                await handleImageSave(imageToSave, imageUploadModal.type, imageUploadModal.context);
            } finally {
                setIsSaving(false);
                onClose();
            }
        }
    };

    // --- Drag Handlers ---
    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handlePointerUp = () => setIsDragging(false);
    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        e.preventDefault();
        setZoom(prev => Math.max(0.1, prev - e.deltaY * 0.001));
    };

    const getTitle = () => {
      const type = imageUploadModal.type;
      if (type === 'student_profile') return 'Update Your Profile Picture';
      if (type === 'profile') return 'Update Profile Picture';
      if (type === 'cover_add') return 'Add New Cover Image';
      // FIX: Update check to match valid types 'id_verification_front' and 'id_verification_back'.
      if (type === 'id_verification_front' || type === 'id_verification_back') return 'Upload ID Verification';
      if (type === 'bank_verification') return 'Upload Bank Verification';
      if (type === 'admin_default_cover') return 'Add Default Cover Image';
      return 'Change Cover Image';
    };

    const renderCropper = () => {
        const minZoom = imageRef.current ? Math.max(300 / imageRef.current.width, 300 / imageRef.current.height) : 0.1;
        return (
            <div className="space-y-4 flex flex-col items-center">
                <div
                    className="relative w-[300px] h-[300px] bg-light-border dark:bg-dark-border rounded-full touch-none cursor-move overflow-hidden"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    onWheel={handleWheel}
                >
                    <canvas ref={canvasRef} width={300} height={300} className="absolute top-0 left-0" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1 text-center">Zoom</label>
                    <input
                        type="range"
                        min={minZoom}
                        max={minZoom + 2}
                        step="0.01"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="w-64"
                    />
                </div>
                <button
                    onClick={() => setSourceImage(null)}
                    className="text-sm text-primary hover:underline"
                >
                    Change Image
                </button>
            </div>
        );
    };

    const renderUploader = () => {
        const aspectRatio = (imageUploadModal.type === 'profile' || imageUploadModal.type === 'student_profile') ? 'aspect-square' : 'aspect-video';
        return (
            <ImageUploadInput
                label={isCroppingMode ? "Select an image to crop" : "Select an image"}
                currentImage={selectedImage}
                onImageChange={isCroppingMode ? handleFileSelect : setSelectedImage}
                aspectRatio={aspectRatio}
            />
        );
    };

    return (
        <Modal isOpen={imageUploadModal.isOpen} onClose={onClose} title={getTitle()}>
            <div className="space-y-4">
                {isCroppingMode && sourceImage ? renderCropper() : renderUploader()}
                
                <div className="pt-4 flex justify-end">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={(!selectedImage && !sourceImage) || isSaving}
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light transition-colors disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <SpinnerIcon className="w-5 h-5 mr-2" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <SaveIcon className="w-5 h-5 mr-2" />
                                Save Image
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ImageUploadModal;
