

import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext.tsx';
import { useUI } from '../../contexts/UIContext.tsx';
import { useNavigation, HomePageLayoutConfig, SectionConfig } from '../../contexts/NavigationContext.tsx';
import ItemSelector from '../ItemSelector.tsx';
import { StaticPageKey, HomeSlide, SocialMediaLink, UpcomingExam, PhotoPrintOption, FinancialSettings, SupportSettings, AdditionalService } from '../../types.ts';
import FormInput from '../FormInput.tsx';
import FormSelect from '../FormSelect.tsx';
import { SaveIcon, PlusIcon, TrashIcon } from '../Icons.tsx';
import { targetAudienceOptions } from '../../data/mockData.ts';
import TagInput from '../TagInput.tsx';
import { v4 as uuidv4 } from 'uuid';
import ImageUploadInput from '../ImageUploadInput.tsx';
import MarkdownEditor from '../MarkdownEditor.tsx';

const availablePlatforms: Omit<SocialMediaLink, 'url'>[] = [
    { id: 'facebook', name: 'Facebook', icon: 'FacebookIcon' },
    { id: 'twitter', name: 'Twitter', icon: 'TwitterIcon' },
    { id: 'linkedin', name: 'LinkedIn', icon: 'LinkedInIcon' },
    { id: 'instagram', name: 'Instagram', icon: 'InstagramIcon' },
    { id: 'youtube', name: 'YouTube', icon: 'YouTubeIcon' },
    { id: 'whatsapp', name: 'WhatsApp', icon: 'WhatsAppIcon' },
];

type EditorKey = StaticPageKey | 'home_slides' | 'social_media_links' | 'subjects' | 'student_card_taglines' | 'teacher_card_taglines' | 'home_page_layout' | 'upcoming_exams' | 'photo_print_options' | 'og_image' | 'teacher_dashboard_message' | 'financial_settings' | 'support_settings' | 'additional_services';

interface SiteContentManagementProps {
    initialKey?: string;
}

const SiteContentManagement: React.FC<SiteContentManagementProps> = ({ initialKey }) => {
    const { handleUpdateStaticContent, handleUpdateHomeSlides, handleUpdateSocialMediaLinks, handleUpdateSubjects, handleUpdateStudentCardTaglines, handleUpdateTeacherCardTaglines, handleUpdateHomePageLayoutConfig, handleUpdateUpcomingExams, handleUpdatePhotoPrintOptions, handleUpdateOgImage, handleImageSave, handleUpdateTeacherDashboardMessage, handleUpdateFinancialSettings, handleUpdateSupportSettings, handleUpdateAdditionalServices, teachers, tuitionInstitutes } = useData();
    const { staticPageContent, homeSlides, socialMediaLinks, subjects, studentCardTaglines, teacherCardTaglines, homePageLayoutConfig, upcomingExams, photoPrintOptions, ogImageUrl, teacherDashboardMessage, financialSettings, supportSettings, additionalServices } = useNavigation();
    const { addToast } = useUI();

    if (!staticPageContent) {
        return <div>Loading content...</div>
    }

    const contentKeys = Object.keys(staticPageContent) as StaticPageKey[];
    const allKeys: EditorKey[] = [...contentKeys.sort(), 'home_slides', 'social_media_links', 'subjects', 'student_card_taglines', 'teacher_card_taglines', 'home_page_layout', 'upcoming_exams', 'photo_print_options', 'additional_services', 'og_image', 'teacher_dashboard_message', 'financial_settings', 'support_settings'];

    const [selectedKey, setSelectedKey] = useState<EditorKey>(allKeys[0] || 'home_slides');
    const [pageData, setPageData] = useState({ title: '', content: '' });
    const [slidesData, setSlidesData] = useState<HomeSlide[]>([]);
    const [socialLinks, setSocialLinks] = useState<SocialMediaLink[]>([]);
    const [subjectsData, setSubjectsData] = useState<Record<string, { value: string, label: string }[]>>({});
    const [taglinesData, setTaglinesData] = useState<string[]>([]);
    const [layoutConfig, setLayoutConfig] = useState<HomePageLayoutConfig>({
        teachers: { count: 3, mode: 'latest', selectedIds: [] },
        courses: { count: 3, mode: 'latest', selectedIds: [] },
        classes: { count: 3, mode: 'latest', selectedIds: [] },
        quizzes: { count: 3, mode: 'latest', selectedIds: [] },
        events: { count: 3, mode: 'latest', selectedIds: [] }
    });
    const [examsData, setExamsData] = useState<UpcomingExam[]>([]);
    const [photoOptionsData, setPhotoOptionsData] = useState<PhotoPrintOption[]>([]);
    const [ogImage, setOgImage] = useState<string | null>(null);
    const [teacherMessage, setTeacherMessage] = useState<string>('');
    const [financeSettings, setFinanceSettings] = useState<FinancialSettings>(financialSettings);
    const [supportConf, setSupportConf] = useState<SupportSettings>(supportSettings);
    const [selectedAudience, setSelectedAudience] = useState(targetAudienceOptions[0].value);
    const [servicesData, setServicesData] = useState<AdditionalService[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Deep linking effect
    useEffect(() => {
        if (initialKey) {
            // Find the key in allKeys that matches initialKey
            const matchedKey = allKeys.find(k => k === initialKey);
            if (matchedKey) {
                setSelectedKey(matchedKey);
            }
        }
    }, [initialKey]);

    useEffect(() => {
        if (selectedKey === 'home_slides') {
            setSlidesData(homeSlides ? JSON.parse(JSON.stringify(homeSlides)) : []);
        } else if (selectedKey === 'social_media_links') {
            setSocialLinks(socialMediaLinks ? JSON.parse(JSON.stringify(socialMediaLinks)) : []);
        } else if (selectedKey === 'subjects') {
            setSubjectsData(subjects ? JSON.parse(JSON.stringify(subjects)) : {});
        } else if (selectedKey === 'student_card_taglines') {
            setTaglinesData(studentCardTaglines ? [...studentCardTaglines] : []);
        } else if (selectedKey === 'teacher_card_taglines') {
            setTaglinesData(teacherCardTaglines ? [...teacherCardTaglines] : []);
        } else if (selectedKey === 'home_page_layout') {
            setLayoutConfig(homePageLayoutConfig || {
                teachers: { count: 3, mode: 'latest', selectedIds: [] },
                courses: { count: 3, mode: 'latest', selectedIds: [] },
                classes: { count: 3, mode: 'latest', selectedIds: [] },
                quizzes: { count: 3, mode: 'latest', selectedIds: [] },
                events: { count: 3, mode: 'latest', selectedIds: [] }
            });
        } else if (selectedKey === 'upcoming_exams') {
            setExamsData(upcomingExams ? JSON.parse(JSON.stringify(upcomingExams)) : []);
        } else if (selectedKey === 'photo_print_options') {
            setPhotoOptionsData(photoPrintOptions ? JSON.parse(JSON.stringify(photoPrintOptions)) : []);
        } else if (selectedKey === 'og_image') {
            setOgImage(ogImageUrl);
        } else if (selectedKey === 'teacher_dashboard_message') {
            setTeacherMessage(teacherDashboardMessage || '');
        } else if (selectedKey === 'financial_settings') {
            setFinanceSettings(financialSettings ? { ...financialSettings } : {} as FinancialSettings);
        } else if (selectedKey === 'support_settings') {
            setSupportConf(supportSettings ? { ...supportSettings } : { telegramBotToken: '', telegramChatId: '', isEnabled: true });
        } else if (selectedKey === 'additional_services') {
            setServicesData(additionalServices ? JSON.parse(JSON.stringify(additionalServices)) : []);
        } else if (staticPageContent[selectedKey]) {
            setPageData(JSON.parse(JSON.stringify(staticPageContent[selectedKey])));
        } else {
            setPageData({ title: '', content: '' });
        }
    }, [selectedKey, staticPageContent, homeSlides, socialMediaLinks, subjects, studentCardTaglines, teacherCardTaglines, homePageLayoutConfig, upcomingExams, photoPrintOptions, ogImageUrl, teacherDashboardMessage, financialSettings, supportSettings, additionalServices]);

    const handlePageChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setPageData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSlideChange = (index: number, field: keyof HomeSlide, value: string) => {
        const newSlides = [...slidesData];
        newSlides[index] = { ...newSlides[index], [field]: value };
        setSlidesData(newSlides);
    };

    const addSlide = () => {
        setSlidesData(prev => [...prev, { image: '', title: '', subtitle: '', ctaText: '' }]);
    };

    const removeSlide = (index: number) => {
        setSlidesData(prev => prev.filter((_, i) => i !== index));
    };

    const handleSocialLinkChange = (index: number, value: string) => {
        const newLinks = [...socialLinks];
        newLinks[index].url = value;
        setSocialLinks(newLinks);
    };

    const addSocialLink = (platformId: string) => {
        const platform = availablePlatforms.find(p => p.id === platformId);
        if (platform && !socialLinks.some(l => l.id === platformId)) {
            setSocialLinks(prev => [...prev, { ...platform, url: '' }]);
        }
    };

    const removeSocialLink = (index: number) => {
        setSocialLinks(prev => prev.filter((_, i) => i !== index));
    };

    const handleAudienceSubjectsChange = (tags: string[]) => {
        const newSubjectsForAudience = tags.map(t => ({ value: t, label: t }));
        setSubjectsData(prev => ({
            ...prev,
            [selectedAudience]: newSubjectsForAudience
        }));
    };

    const handleLayoutConfigChange = (section: keyof HomePageLayoutConfig, field: keyof SectionConfig, value: any) => {
        setLayoutConfig(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };

    const handleExamChange = (index: number, field: keyof UpcomingExam, value: string | boolean) => {
        const newExams = [...examsData];
        (newExams[index] as any)[field] = value;
        setExamsData(newExams);
    };

    const addExam = () => {
        setExamsData(prev => [...prev, { id: uuidv4(), name: '', date: '', targetAudience: targetAudienceOptions[0].value, isHighPriority: false }]);
    };

    const removeExam = (index: number) => {
        setExamsData(prev => prev.filter((_, i) => i !== index));
    };

    const handlePhotoOptionChange = (index: number, field: keyof Omit<PhotoPrintOption, 'id'>, value: string) => {
        const newOptions = [...photoOptionsData];
        (newOptions[index] as any)[field] = field === 'price' ? parseFloat(value) || 0 : value;
        setPhotoOptionsData(newOptions);
    };

    const addPhotoOption = () => {
        setPhotoOptionsData(prev => [...prev, { id: uuidv4(), size: '', price: 0 }]);
    };

    const removePhotoOption = (index: number) => {
        setPhotoOptionsData(prev => prev.filter((_, i) => i !== index));
    };

    const handleTeacherMessageChange = (e: { target: { value: string } }) => {
        setTeacherMessage(e.target.value);
    };

    const handleFinancialSettingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFinanceSettings(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    };

    const handleSupportSettingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setSupportConf(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleServiceChange = (index: number, field: keyof AdditionalService, value: string | number) => {
        const newServices = [...servicesData];
        (newServices[index] as any)[field] = value;
        setServicesData(newServices);
    };

    const addService = () => {
        setServicesData(prev => [...prev, { id: uuidv4(), title: '', description: '', cost: 0 }]);
    };

    const removeService = (index: number) => {
        setServicesData(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (selectedKey === 'home_slides') {
                await handleUpdateHomeSlides(slidesData);
            } else if (selectedKey === 'social_media_links') {
                await handleUpdateSocialMediaLinks(socialLinks);
            } else if (selectedKey === 'subjects') {
                await handleUpdateSubjects(subjectsData);
            } else if (selectedKey === 'student_card_taglines') {
                await handleUpdateStudentCardTaglines(taglinesData);
            } else if (selectedKey === 'teacher_card_taglines') {
                await handleUpdateTeacherCardTaglines(taglinesData);
            } else if (selectedKey === 'home_page_layout') {
                await handleUpdateHomePageLayoutConfig(layoutConfig);
            } else if (selectedKey === 'upcoming_exams') {
                await handleUpdateUpcomingExams(examsData);
            } else if (selectedKey === 'photo_print_options') {
                await handleUpdatePhotoPrintOptions(photoOptionsData);
            } else if (selectedKey === 'teacher_dashboard_message') {
                await handleUpdateTeacherDashboardMessage(teacherMessage);
            } else if (selectedKey === 'financial_settings') {
                await handleUpdateFinancialSettings(financeSettings);
            } else if (selectedKey === 'support_settings') {
                await handleUpdateSupportSettings(supportConf);
            } else if (selectedKey === 'og_image') {
                if (ogImage && ogImage.startsWith('data:image')) {
                    const newUrl = await handleImageSave(ogImage, 'og_image');
                    if (newUrl) {
                        await handleUpdateOgImage(newUrl);
                    } else {
                        throw new Error("Image upload failed.");
                    }
                }
            } else if (selectedKey === 'additional_services') {
                await handleUpdateAdditionalServices(servicesData);
            } else {
                await handleUpdateStaticContent(selectedKey, pageData);
            }
            addToast('Content saved successfully!', 'success');
        } catch (e) {
            addToast('Failed to save content.', 'error');
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    const renderPageEditor = () => (
        <div className="space-y-4">
            <FormInput label="Page Title" name="title" value={pageData.title} onChange={handlePageChange} />
            <div>
                <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Content (HTML)</label>
                <textarea
                    name="content"
                    value={pageData.content}
                    onChange={handlePageChange}
                    rows={20}
                    className="w-full p-2 border border-light-border dark:border-dark-border rounded-md bg-light-background dark:bg-dark-background focus:outline-none focus:ring-primary focus:border-primary font-mono text-sm"
                    placeholder="Enter HTML content here..."
                />
                <p className="text-xs text-light-subtle dark:text-dark-subtle mt-1">You can use basic HTML tags like &lt;p&gt;, &lt;h2&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;, and &lt;a&gt; for formatting.</p>
            </div>
        </div>
    );

    const renderSlidesEditor = () => (
        <div className="space-y-6">
            {slidesData.map((slide, index) => (
                <div key={index} className="p-4 border border-light-border dark:border-dark-border rounded-lg relative">
                    <h3 className="font-semibold mb-2">Slide {index + 1}</h3>
                    <div className="space-y-3">
                        <FormInput label="Image URL" name="image" value={slide.image} onChange={(e) => handleSlideChange(index, 'image', e.target.value)} />
                        <FormInput label="Title" name="title" value={slide.title} onChange={(e) => handleSlideChange(index, 'title', e.target.value)} />
                        <FormInput label="Subtitle" name="subtitle" value={slide.subtitle} onChange={(e) => handleSlideChange(index, 'subtitle', e.target.value)} />
                        <FormInput label="CTA Button Text" name="ctaText" value={slide.ctaText} onChange={(e) => handleSlideChange(index, 'ctaText', e.target.value)} />
                    </div>
                    <button onClick={() => removeSlide(index)} className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="w-5 h-5" /></button>
                </div>
            ))}
            <button onClick={addSlide} className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium text-primary border-2 border-dashed border-primary/50 rounded-md hover:bg-primary/10 transition-colors">
                <PlusIcon className="h-5 h-5" />
                <span>Add Slide</span>
            </button>
        </div>
    );

    const renderSocialLinksEditor = () => {
        const currentPlatformIds = new Set(socialLinks.map(l => l.id));
        const platformsToAdd = availablePlatforms.filter(p => !currentPlatformIds.has(p.id));
        return (
            <div className="space-y-4">
                {socialLinks.map((link, index) => (
                    <div key={link.id} className="flex items-end gap-4 p-4 border border-light-border dark:border-dark-border rounded-lg">
                        <div className="flex-grow">
                            <FormInput label={link.name} name={`url-${link.id}`} value={link.url} onChange={(e) => handleSocialLinkChange(index, e.target.value)} placeholder={`https://...`} />
                        </div>
                        <button onClick={() => removeSocialLink(index)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md"><TrashIcon className="w-5 h-5" /></button>
                    </div>
                ))}
                {platformsToAdd.length > 0 && (
                    <div className="flex items-end gap-4 p-4 border-2 border-dashed border-light-border dark:border-dark-border rounded-lg">
                        <div className="flex-grow">
                            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Add New Platform</label>
                            <select onChange={e => addSocialLink(e.target.value)} className="w-full px-3 py-2 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text bg-light-background dark:bg-dark-background rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                                <option value="">Select a platform...</option>
                                {platformsToAdd.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderSubjectsEditor = () => (
        <div className="space-y-4">
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                This list populates the 'Subject' dropdown menu when teachers create classes.
            </p>
            <div>
                <label htmlFor="audience-select" className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Select Target Audience to Edit</label>
                <select
                    id="audience-select"
                    value={selectedAudience}
                    onChange={e => setSelectedAudience(e.target.value)}
                    className="w-full px-3 py-2 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text bg-light-background dark:bg-dark-background rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                >
                    {targetAudienceOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
            </div>

            <div className="mt-4">
                <TagInput
                    label={`Subjects for "${selectedAudience}"`}
                    tags={subjectsData[selectedAudience]?.map(s => s.value) || []}
                    onTagsChange={handleAudienceSubjectsChange}
                />
            </div>
        </div>
    );

    const renderTaglinesEditor = (description: string) => (
        <div className="space-y-4">
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                {description}
            </p>
            <TagInput
                label="Taglines"
                tags={taglinesData}
                onTagsChange={setTaglinesData}
            />
        </div>
    );

    const renderLayoutEditor = () => {
        // Flatten data for selectors
        const allCourses = teachers.flatMap(t => t.courses.map(c => ({ id: c.id, title: c.title, subtitle: t.name })));
        const allClasses = teachers.flatMap(t => t.individualClasses.map(c => ({ id: c.id, title: c.title, subtitle: `${t.name} - ${c.date}` })));
        const allQuizzes = teachers.flatMap(t => t.quizzes.map(q => ({ id: q.id, title: q.title, subtitle: t.name })));
        const allEvents = tuitionInstitutes.flatMap(ti => (ti.events || []).map(e => ({ id: e.id, title: e.title, subtitle: ti.name })));
        const allTeachers = teachers.map(t => ({ id: t.id, title: t.name, subtitle: t.tagline }));

        const sections: { key: keyof HomePageLayoutConfig, label: string, items: any[] }[] = [
            { key: 'teachers', label: 'Featured Teachers', items: allTeachers },
            { key: 'courses', label: 'Popular Courses', items: allCourses },
            { key: 'classes', label: 'Upcoming Classes', items: allClasses },
            { key: 'quizzes', label: 'Latest Quizzes', items: allQuizzes },
            { key: 'events', label: 'Upcoming Events', items: allEvents },
        ];

        return (
            <div className="space-y-8">
                <p className="text-sm text-light-subtle dark:text-dark-subtle">
                    Control how items appear on the home page. You can either show the latest items automatically or select specific ones.
                </p>
                <div className="space-y-6">
                    {sections.map(section => (
                        <div key={section.key} className="p-4 border border-light-border dark:border-dark-border rounded-lg">
                            <h3 className="text-lg font-semibold mb-3">{section.label}</h3>
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            id={`${section.key}-latest`}
                                            name={`${section.key}-mode`}
                                            checked={layoutConfig[section.key].mode === 'latest'}
                                            onChange={() => handleLayoutConfigChange(section.key, 'mode', 'latest')}
                                            className="h-4 w-4 text-primary focus:ring-primary border-light-border dark:border-dark-border"
                                        />
                                        <label htmlFor={`${section.key}-latest`} className="text-sm font-medium">Automatic (Latest)</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            id={`${section.key}-selected`}
                                            name={`${section.key}-mode`}
                                            checked={layoutConfig[section.key].mode === 'selected'}
                                            onChange={() => handleLayoutConfigChange(section.key, 'mode', 'selected')}
                                            className="h-4 w-4 text-primary focus:ring-primary border-light-border dark:border-dark-border"
                                        />
                                        <label htmlFor={`${section.key}-selected`} className="text-sm font-medium">Manual (Specific)</label>
                                    </div>
                                </div>

                                {layoutConfig[section.key].mode === 'latest' ? (
                                    <div className="w-48">
                                        <FormInput
                                            label="Number of Items"
                                            name={`${section.key}-count`}
                                            type="number"
                                            min={1}
                                            max={12}
                                            value={layoutConfig[section.key].count.toString()}
                                            onChange={(e) => handleLayoutConfigChange(section.key, 'count', parseInt(e.target.value) || 0)}
                                        />
                                    </div>
                                ) : (
                                    <ItemSelector
                                        label={`Select ${section.label}`}
                                        items={section.items}
                                        selectedIds={layoutConfig[section.key].selectedIds}
                                        onSelectionChange={(ids) => handleLayoutConfigChange(section.key, 'selectedIds', ids)}
                                    />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderExamsEditor = () => (
        <div className="space-y-6">
            {examsData.map((exam, index) => (
                <div key={exam.id} className="p-4 border border-light-border dark:border-dark-border rounded-lg relative space-y-3">
                    <h3 className="font-semibold mb-2">Exam {index + 1}</h3>
                    <FormInput label="Exam Name" name="name" value={exam.name} onChange={(e) => handleExamChange(index, 'name', e.target.value)} />
                    <FormInput label="Date" name="date" type="date" value={exam.date} onChange={(e) => handleExamChange(index, 'date', e.target.value)} />
                    <FormSelect label="Target Audience" name="targetAudience" value={exam.targetAudience} onChange={(e) => handleExamChange(index, 'targetAudience', e.target.value)} options={targetAudienceOptions} />
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id={`priority-${index}`} checked={exam.isHighPriority} onChange={(e) => handleExamChange(index, 'isHighPriority', e.target.checked)} className="h-4 w-4 text-primary focus:ring-primary border-light-border dark:border-dark-border rounded" />
                        <label htmlFor={`priority-${index}`} className="text-sm font-medium text-light-text dark:text-dark-text">Mark as High Priority</label>
                    </div>
                    <button onClick={() => removeExam(index)} className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="w-5 h-5" /></button>
                </div>
            ))}
            <button onClick={addExam} className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium text-primary border-2 border-dashed border-primary/50 rounded-md hover:bg-primary/10 transition-colors">
                <PlusIcon className="h-5 h-5" />
                <span>Add Exam</span>
            </button>
        </div>
    );

    const renderPhotoPrintOptionsEditor = () => (
        <div className="space-y-4">
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                Manage the available sizes and prices for photo prints that users can purchase from event galleries.
            </p>
            <div className="space-y-4">
                {photoOptionsData.map((option, index) => (
                    <div key={option.id} className="flex items-end gap-4 p-4 border border-light-border dark:border-dark-border rounded-lg">
                        <div className="flex-grow grid grid-cols-2 gap-4">
                            <FormInput label="Print Size (e.g., 4x6, A4)" name={`size-${index}`} value={option.size} onChange={(e) => handlePhotoOptionChange(index, 'size', e.target.value)} />
                            <FormInput label="Price (LKR)" name={`price-${index}`} type="number" min={0} value={option.price.toString()} onChange={(e) => handlePhotoOptionChange(index, 'price', e.target.value)} />
                        </div>
                        <button onClick={() => removePhotoOption(index)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md"><TrashIcon className="w-5 h-5" /></button>
                    </div>
                ))}
            </div>
            <button onClick={addPhotoOption} className="mt-4 w-full flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium text-primary border-2 border-dashed border-primary/50 rounded-md hover:bg-primary/10 transition-colors">
                <PlusIcon className="h-5 h-5" />
                <span>Add Print Option</span>
            </button>
        </div>
    );

    const renderOgImageEditor = () => (
        <div className="space-y-4">
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                This image (also known as an OG Image) is what appears on social media platforms like Facebook, Twitter, and WhatsApp when someone shares a link to your site. Recommended size: 1200x630 pixels.
            </p>
            <ImageUploadInput
                label="Site Share Image"
                currentImage={ogImage}
                onImageChange={setOgImage}
                aspectRatio="aspect-video"
            />
        </div>
    );

    const renderTeacherDashboardMessageEditor = () => (
        <div className="space-y-4">
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                The message entered here will be displayed at the top of every teacher's dashboard. Use this for announcements, maintenance updates, or general news for your educators.
            </p>
            <MarkdownEditor
                label="Teacher Dashboard Announcement"
                id="teacherDashboardMsg"
                name="teacherDashboardMsg"
                value={teacherMessage}
                onChange={handleTeacherMessageChange}
                rows={6}
                placeholder="Enter an announcement for all teachers..."
            />
        </div>
    );

    const renderFinancialSettingsEditor = () => {
        // Safe access in case manualPaymentPlatformFee is missing on the object yet
        const manualFee = financeSettings.manualPaymentPlatformFee !== undefined ? financeSettings.manualPaymentPlatformFee : 50;

        return (
            <div className="space-y-6">
                <p className="text-sm text-light-subtle dark:text-dark-subtle">
                    Adjust platform-wide financial variables used in revenue calculations.
                </p>

                <h3 className="font-semibold text-lg border-b border-light-border dark:border-dark-border pb-2">Manual Payments</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                        label="Platform Fee (LKR) per Manual Transaction"
                        name="manualPaymentPlatformFee"
                        type="number"
                        value={manualFee.toString()}
                        onChange={handleFinancialSettingChange}
                    />
                </div>

                <h3 className="font-semibold text-lg border-b border-light-border dark:border-dark-border pb-2">Referral System Base Rates</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput label="Gateway Fee Rate (0.04 = 4%)" name="referralGatewayFeeRate" type="number" step={0.01} value={financeSettings.referralGatewayFeeRate.toString()} onChange={handleFinancialSettingChange} />
                    <FormInput label="Platform Costs Rate (0.04 = 4%)" name="referralPlatformCostRate" type="number" step={0.01} value={financeSettings.referralPlatformCostRate.toString()} onChange={handleFinancialSettingChange} />
                    <FormInput label="Max Earning per Teacher (LKR)" name="referralMaxEarning" type="number" value={financeSettings.referralMaxEarning.toString()} onChange={handleFinancialSettingChange} />
                    <FormInput label="Base Commission Rate (Tier 1)" name="referralBaseRate" type="number" step={0.01} value={financeSettings.referralBaseRate.toString()} onChange={handleFinancialSettingChange} />
                </div>

                <h3 className="font-semibold text-lg border-b border-light-border dark:border-dark-border pb-2">Referral Tiers</h3>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <FormInput label="Tier 1 Threshold (LKR)" name="referralTier1Threshold" type="number" value={financeSettings.referralTier1Threshold.toString()} onChange={handleFinancialSettingChange} />
                        <FormInput label="Tier 1 Rate" name="referralTier1Rate" type="number" step={0.01} value={financeSettings.referralTier1Rate.toString()} onChange={handleFinancialSettingChange} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormInput label="Tier 2 Threshold (LKR)" name="referralTier2Threshold" type="number" value={financeSettings.referralTier2Threshold.toString()} onChange={handleFinancialSettingChange} />
                        <FormInput label="Tier 2 Rate" name="referralTier2Rate" type="number" step={0.01} value={financeSettings.referralTier2Rate.toString()} onChange={handleFinancialSettingChange} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormInput label="Tier 3 Threshold (LKR)" name="referralTier3Threshold" type="number" value={financeSettings.referralTier3Threshold.toString()} onChange={handleFinancialSettingChange} />
                        <FormInput label="Tier 3 Rate" name="referralTier3Rate" type="number" step={0.01} value={financeSettings.referralTier3Rate.toString()} onChange={handleFinancialSettingChange} />
                    </div>
                </div>
            </div>
        );
    };

    const renderSupportSettingsEditor = () => (
        <div className="space-y-6">
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                Configure settings for the support chat widget, including Telegram integration.
            </p>
            <div className="flex items-center mb-4">
                <input
                    type="checkbox"
                    id="supportEnabled"
                    name="isEnabled"
                    checked={supportConf.isEnabled}
                    onChange={handleSupportSettingChange}
                    className="h-4 w-4 text-primary focus:ring-primary border-light-border dark:border-dark-border rounded"
                />
                <label htmlFor="supportEnabled" className="ml-2 block text-sm text-light-text dark:text-dark-text">Enable Chat Widget</label>
            </div>

            <FormInput
                label="Telegram Bot Token"
                name="telegramBotToken"
                value={supportConf.telegramBotToken}
                onChange={handleSupportSettingChange}
                placeholder="e.g. 123456789:AbC..."
            />
            <FormInput
                label="Telegram Chat ID"
                name="telegramChatId"
                value={supportConf.telegramChatId}
                onChange={handleSupportSettingChange}
                placeholder="e.g. -100123456789"
            />
            <p className="text-xs text-light-subtle dark:text-dark-subtle italic">
                * To get these, create a bot via @BotFather on Telegram, create a group, add the bot, and get the Chat ID.
                Set your webhook URL to: <code>https://telegram-bot-service-[PROJECT_ID].cloudfunctions.net/telegramWebhook</code>
            </p>
        </div>
    );

    const renderServicesEditor = () => (
        <div className="space-y-6">
            <p className="text-sm text-light-subtle dark:text-dark-subtle">
                Define the additional services available for teachers to purchase.
            </p>
            {servicesData.map((service, index) => (
                <div key={service.id} className="p-4 border border-light-border dark:border-dark-border rounded-lg relative space-y-3">
                    <h3 className="font-semibold mb-2">Service {index + 1}</h3>
                    <FormInput label="Title" name="title" value={service.title} onChange={(e) => handleServiceChange(index, 'title', e.target.value)} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Description</label>
                            <textarea
                                value={service.description || ''}
                                onChange={(e) => handleServiceChange(index, 'description', e.target.value)}
                                className="w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-md bg-light-background dark:bg-dark-background focus:outline-none focus:ring-primary focus:border-primary"
                                rows={2}
                            />
                        </div>
                        <FormInput label="Cost (LKR)" name="cost" type="number" min={0} value={service.cost.toString()} onChange={(e) => handleServiceChange(index, 'cost', parseFloat(e.target.value) || 0)} />
                    </div>
                    <button onClick={() => removeService(index)} className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="w-5 h-5" /></button>
                </div>
            ))}
            <button onClick={addService} className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium text-primary border-2 border-dashed border-primary/50 rounded-md hover:bg-primary/10 transition-colors">
                <PlusIcon className="h-5 h-5" />
                <span>Add Service</span>
            </button>
        </div>
    );

    const renderCurrentEditor = () => {
        switch (selectedKey) {
            case 'home_slides': return renderSlidesEditor();
            case 'social_media_links': return renderSocialLinksEditor();
            case 'subjects': return renderSubjectsEditor();
            case 'student_card_taglines': return renderTaglinesEditor('Manage the list of random taglines that appear on the student ID card.');
            case 'teacher_card_taglines': return renderTaglinesEditor('Manage the list of random taglines for new teacher profiles.');
            case 'home_page_layout': return renderLayoutEditor();
            case 'upcoming_exams': return renderExamsEditor();
            case 'photo_print_options': return renderPhotoPrintOptionsEditor();
            case 'og_image': return renderOgImageEditor();
            case 'teacher_dashboard_message': return renderTeacherDashboardMessageEditor();
            case 'financial_settings': return renderFinancialSettingsEditor();
            case 'support_settings': return renderSupportSettingsEditor();
            case 'additional_services': return renderServicesEditor();
            default: return renderPageEditor();
        }
    }

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Site Content Management</h1>
            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
                    <div>
                        <label htmlFor="content-select" className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Select Content to Edit</label>
                        <select
                            id="content-select"
                            value={selectedKey}
                            onChange={e => setSelectedKey(e.target.value as any)}
                            className="w-full sm:w-64 px-3 py-2 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text bg-light-background dark:bg-dark-background rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        >
                            {allKeys.map(key => (
                                <option key={key} value={key}>
                                    {key.replace(/_/g, ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase())}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark disabled:opacity-50">
                        <SaveIcon className="w-5 h-5" />
                        <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                </div>

                <div className="mt-6 border-t border-light-border dark:border-dark-border pt-6">
                    {renderCurrentEditor()}
                </div>
            </div>
        </div>
    );
};

export default SiteContentManagement;
