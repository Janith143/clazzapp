import React, { useState, useEffect, useMemo, useRef } from 'react';
import Modal from '../Modal';
import FormInput from '../FormInput';
import FormSelect from '../FormSelect';
import ImageUploadInput from '../ImageUploadInput';
import { SaveIcon, XIcon, PlusIcon, TrashIcon, ChevronDownIcon } from '../Icons';
// FIX: Alias Event to InstituteEvent to avoid name collision with native DOM Event type.
import { Event as InstituteEvent, Teacher, EventCategory } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { sriLankanDistricts, sriLankanTownsByDistrict } from '../../data/mockData';
import { v4 as uuidv4 } from 'uuid';
import MarkdownEditor from '../MarkdownEditor';

const eventCategories: EventCategory[] = ['Workshop', 'Seminar', 'Exhibition', 'Competition', 'Camp', 'Class Series', 'Award Ceremony'];

const MultiSelectTeachers: React.FC<{ selected: string[], onChange: (selected: string[]) => void }> = ({ selected, onChange }) => {
    const { teachers } = useData();
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const availableTeachers = useMemo(() => teachers.filter(t => t.registrationStatus === 'approved'), [teachers]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const toggleTeacher = (teacherId: string) => {
        if (selected.includes(teacherId)) {
            onChange(selected.filter(id => id !== teacherId));
        } else {
            onChange([...selected, teacherId]);
        }
    };

    const selectedTeacherNames = selected.map(id => teachers.find(t => t.id === id)?.name).filter(Boolean).join(', ');

    return (
        <div className="relative" ref={wrapperRef}>
            <label className="block text-sm font-medium mb-1 text-light-text dark:text-dark-text">Participating Teachers</label>
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full p-2 border border-light-border dark:border-dark-border rounded-md bg-light-background dark:bg-dark-background text-left truncate text-light-text dark:text-dark-text">
                {selected.length > 0 ? selectedTeacherNames : <span className="text-light-subtle dark:text-dark-subtle">Select teachers...</span>}
            </button>
            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {availableTeachers.map(teacher => (
                        <label key={teacher.id} className="flex items-center p-2 hover:bg-light-border dark:hover:bg-dark-border cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selected.includes(teacher.id)}
                                onChange={() => toggleTeacher(teacher.id)}
                                className="h-4 w-4 text-primary focus:ring-primary border-light-border dark:border-dark-border rounded"
                            />
                            <span className="ml-3 text-sm text-light-text dark:text-dark-text">{teacher.name}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};


interface TIScheduleEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (eventDetails: InstituteEvent) => void;
    organizerId: string;
    organizerType?: 'tuition_institute' | 'teacher';
    initialData?: InstituteEvent | null;
}

const TIScheduleEventModal: React.FC<TIScheduleEventModalProps> = ({ isOpen, onClose, onSave, organizerId, organizerType = 'tuition_institute', initialData }) => {
    const { handleImageSave } = useData();
    const { addToast } = useUI();
    const [eventDetails, setEventDetails] = useState<Partial<InstituteEvent>>({});
    const [error, setError] = useState('');
    const [flyerImageBase64, setFlyerImageBase64] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setError('');
            setFlyerImageBase64(null);
            const defaultGallery = {
                isEnabled: false,
                googleDriveLink: '',
                downloadPrice: 150,
                downloadPriceHighRes: 500,
                bulkDiscounts: [],
            };

            if (initialData) {
                setEventDetails({
                    ...initialData,
                    tickets: {
                        price: initialData.tickets.price.toString() as any,
                        maxParticipants: initialData.tickets.maxParticipants?.toString() as any || null
                    },
                    gallery: initialData.gallery || defaultGallery,
                });
            } else {
                setEventDetails({
                    organizerId: organizerId,
                    organizerType: 'tuition_institute',
                    title: '',
                    description: '',
                    category: 'Workshop',
                    mode: 'Physical',
                    isPublished: true,
                    adminApproval: 'approved',
                    status: 'scheduled',
                    participatingTeacherIds: [],
                    tickets: { price: '' as any, maxParticipants: null },
                    gallery: defaultGallery
                });
            }
        }
    }, [isOpen, initialData, organizerId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEventDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleTicketChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEventDetails(prev => ({
            ...prev,
            tickets: {
                ...prev.tickets!,
                [name]: value
            }
        }));
    };

    const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setEventDetails(prev => ({
            ...prev,
            gallery: {
                ...(prev.gallery || { isEnabled: false }),
                [name]: type === 'checkbox' ? checked : value,
            }
        }));
    };

    const handleDiscountChange = (index: number, field: 'quantity' | 'discountPercent', value: string) => {
        const newDiscounts = [...(eventDetails.gallery?.bulkDiscounts || [])];
        const numValue = parseInt(value, 10);
        newDiscounts[index] = { ...newDiscounts[index], id: newDiscounts[index].id || uuidv4(), [field]: isNaN(numValue) ? 0 : numValue };
        setEventDetails(prev => ({ ...prev, gallery: { ...prev.gallery!, bulkDiscounts: newDiscounts } }));
    };

    const addDiscount = () => {
        const newDiscount = { id: uuidv4(), quantity: 5, discountPercent: 10 };
        setEventDetails(prev => ({
            ...prev,
            gallery: {
                ...(prev.gallery || { isEnabled: false }),
                bulkDiscounts: [...(prev.gallery?.bulkDiscounts || []), newDiscount]
            }
        }));
    };

    const removeDiscount = (index: number) => {
        setEventDetails(prev => ({
            ...prev,
            gallery: {
                ...prev.gallery!,
                bulkDiscounts: prev.gallery!.bulkDiscounts!.filter((_, i) => i !== index)
            }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSaving(true);

        try {
            let flyerImageUrl = initialData?.flyerImage || '';
            if (flyerImageBase64) {
                const uploadedUrl = await handleImageSave(flyerImageBase64, 'event_flyer', { organizerId: organizerId });
                if (!uploadedUrl) throw new Error("Flyer image upload failed.");
                flyerImageUrl = uploadedUrl;
            }
            if (!flyerImageUrl) throw new Error("A flyer image is required.");

            const finalGallery = eventDetails.gallery?.isEnabled ? {
                isEnabled: true,
                googleDriveLink: eventDetails.gallery.googleDriveLink || '',
                downloadPrice: parseFloat(eventDetails.gallery.downloadPrice as any) || 0,
                downloadPriceHighRes: parseFloat(eventDetails.gallery.downloadPriceHighRes as any) || 0,
                bulkDiscounts: (eventDetails.gallery.bulkDiscounts || []).filter(d => d.quantity > 0 && d.discountPercent > 0)
            } : { isEnabled: false, googleDriveLink: '', downloadPrice: 0, downloadPriceHighRes: 0, bulkDiscounts: [] };

            const finalEvent: InstituteEvent = {
                ...eventDetails,
                id: initialData?.id || `evt_${Date.now()}`,
                flyerImage: flyerImageUrl,
                tickets: {
                    price: parseFloat(eventDetails.tickets?.price as any) || 0,
                    maxParticipants: eventDetails.tickets?.maxParticipants ? parseInt(eventDetails.tickets.maxParticipants as any, 10) : null
                },
                gallery: finalGallery,
            } as InstituteEvent;

            onSave(finalEvent);

        } catch (err: any) {
            const errorMessage = err.message || "An error occurred.";
            setError(errorMessage);
            addToast(errorMessage, "error");
        } finally {
            setIsSaving(false);
        }
    };

    const modalTitle = initialData ? 'Edit Event' : 'Schedule New Event';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="4xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <FormInput label="Event Title" name="title" value={eventDetails.title || ''} onChange={handleChange} required />
                        <ImageUploadInput label="Flyer Image" currentImage={flyerImageBase64 || eventDetails.flyerImage || null} onImageChange={setFlyerImageBase64} aspectRatio="aspect-video" />
                        <MarkdownEditor
                            label="Description"
                            id="description"
                            name="description"
                            value={eventDetails.description || ''}
                            onChange={handleChange}
                            rows={5}
                        />
                    </div>
                    <div className="space-y-4">
                        <FormSelect label="Category" name="category" value={eventDetails.category || ''} onChange={handleChange} options={eventCategories.map(c => ({ value: c, label: c }))} required />
                        <FormSelect label="Mode" name="mode" value={eventDetails.mode || 'Physical'} onChange={handleChange} options={[{ value: 'Physical', label: 'Physical' }, { value: 'Online', label: 'Online' }, { value: 'Hybrid', label: 'Hybrid' }]} />

                        {(eventDetails.mode === 'Physical' || eventDetails.mode === 'Hybrid') && (
                            <FormInput label="Venue / Address" name="venue" value={eventDetails.venue || ''} onChange={handleChange} />
                        )}
                        {(eventDetails.mode === 'Online' || eventDetails.mode === 'Hybrid') && (
                            <FormInput label="Online Link (Zoom, Meet, etc.)" name="onlineLink" type="url" value={eventDetails.onlineLink || ''} onChange={handleChange} />
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <FormInput label="Start Date" name="startDate" type="date" value={eventDetails.startDate || ''} onChange={handleChange} required />
                            <FormInput label="Start Time" name="startTime" type="time" value={eventDetails.startTime || ''} onChange={handleChange} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormInput label="End Date" name="endDate" type="date" value={eventDetails.endDate || ''} onChange={handleChange} required />
                            <FormInput label="End Time" name="endTime" type="time" value={eventDetails.endTime || ''} onChange={handleChange} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormInput label="Registration Deadline" name="registrationDeadline" type="date" value={eventDetails.registrationDeadline || ''} onChange={handleChange} required />
                            <FormInput label="Duration" name="duration" value={eventDetails.duration || ''} onChange={handleChange} placeholder="e.g., 3 hours, Full Day" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormInput label="Price per Ticket (LKR)" name="price" type="number" value={eventDetails.tickets?.price as any || ''} onChange={handleTicketChange} required />
                            <FormInput label="Max Participants" name="maxParticipants" type="number" value={eventDetails.tickets?.maxParticipants as any || ''} onChange={handleTicketChange} placeholder="Leave empty for unlimited" />
                        </div>
                        <MultiSelectTeachers
                            selected={eventDetails.participatingTeacherIds || []}
                            onChange={(selected) => setEventDetails(prev => ({ ...prev, participatingTeacherIds: selected }))}
                        />
                    </div>
                </div>

                <div className="md:col-span-2 pt-4 mt-4 border-t border-light-border dark:border-dark-border">
                    <details className="group" open={eventDetails.gallery?.isEnabled}>
                        <summary className="cursor-pointer font-semibold text-lg list-none flex justify-between items-center text-light-text dark:text-dark-text">
                            <span>Photo Gallery & Sales</span>
                            <span className="text-primary transform group-open:rotate-180 transition-transform duration-200">
                                <ChevronDownIcon className="w-5 h-5" />
                            </span>
                        </summary>
                        <div className="mt-4 space-y-4 animate-fadeIn">
                            <div className="flex items-center gap-2 p-3 bg-light-background dark:bg-dark-background rounded-md border border-light-border dark:border-dark-border">
                                <input
                                    type="checkbox"
                                    id="galleryEnabled"
                                    name="isEnabled"
                                    checked={eventDetails.gallery?.isEnabled || false}
                                    onChange={handleGalleryChange}
                                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                />
                                <label htmlFor="galleryEnabled" className="text-sm font-medium text-light-text dark:text-dark-text">
                                    Enable Photo Gallery for this Event
                                </label>
                            </div>

                            {eventDetails.gallery?.isEnabled && (
                                <div className="space-y-4 p-4 border border-light-border dark:border-dark-border rounded-lg bg-light-background dark:bg-dark-background">
                                    <FormInput
                                        label="Google Drive Folder Link"
                                        name="googleDriveLink"
                                        value={eventDetails.gallery?.googleDriveLink || ''}
                                        onChange={handleGalleryChange}
                                        placeholder="Must be a public 'Anyone with the link' folder"
                                    />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormInput
                                            label="Standard Download Price (LKR)"
                                            name="downloadPrice"
                                            type="number"
                                            min={0}
                                            value={eventDetails.gallery?.downloadPrice?.toString() || ''}
                                            onChange={handleGalleryChange}
                                        />
                                        <FormInput
                                            label="Full Quality Download Price (LKR)"
                                            name="downloadPriceHighRes"
                                            type="number"
                                            min={0}
                                            value={eventDetails.gallery?.downloadPriceHighRes?.toString() || ''}
                                            onChange={handleGalleryChange}
                                        />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-sm mb-2 text-light-text dark:text-dark-text">Bulk Purchase Discounts</h4>
                                        <div className="space-y-2">
                                            {(eventDetails.gallery?.bulkDiscounts || []).map((discount, index) => (
                                                <div key={discount.id || index} className="flex flex-wrap items-center gap-2 p-2 bg-light-surface dark:bg-dark-surface rounded border border-light-border dark:border-dark-border">
                                                    <span className="text-sm text-light-text dark:text-dark-text">If cart has</span>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={discount.quantity || ''}
                                                        onChange={(e) => handleDiscountChange(index, 'quantity', e.target.value)}
                                                        className="w-16 p-1 border rounded bg-light-background dark:bg-dark-background border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                                                    />
                                                    <span className="text-sm text-light-text dark:text-dark-text">or more photos, give a</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={discount.discountPercent || ''}
                                                        onChange={(e) => handleDiscountChange(index, 'discountPercent', e.target.value)}
                                                        className="w-16 p-1 border rounded bg-light-background dark:bg-dark-background border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                                                    />
                                                    <span className="text-sm text-light-text dark:text-dark-text">% discount.</span>
                                                    <button type="button" onClick={() => removeDiscount(index)} className="p-1 text-red-500 ml-auto"><TrashIcon className="w-4 h-4" /></button>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={addDiscount}
                                            className="mt-2 flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-dark"
                                        >
                                            <PlusIcon className="w-4 h-4" /> Add Discount Tier
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </details>
                </div>

                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <div className="pt-4 flex justify-end space-x-3">
                    <button type="button" onClick={onClose} className="inline-flex items-center justify-center px-4 py-2 border border-light-border dark:border-dark-border text-sm font-medium rounded-md shadow-sm text-light-text dark:text-dark-text bg-light-surface dark:bg-dark-surface hover:bg-light-border dark:hover:bg-dark-border/50">
                        <XIcon className="w-4 h-4 mr-2" />Cancel
                    </button>
                    <button type="submit" disabled={isSaving} className="inline-flex items-center justify-center px-4 py-2 bg-primary text-white rounded-md disabled:opacity-50">
                        <SaveIcon className="w-4 h-4 mr-2" />
                        {isSaving ? 'Saving...' : 'Save Event'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default TIScheduleEventModal;