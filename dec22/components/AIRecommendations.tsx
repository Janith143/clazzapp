import React, { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { User, Teacher, Course, IndividualClass, Quiz } from '../types';
import { useData } from '../contexts/DataContext';
import { useNavigation } from '../contexts/NavigationContext';
import { getDynamicClassStatus } from '../utils';
import { BookOpenIcon, UserCircleIcon, VideoCameraIcon } from './Icons';

interface AIRecommendationsProps {
    currentUser: User;
}

// FIX: Redefined RecommendedItem as a discriminated union for better type safety and inference.
type RecommendedItem = 
    (Teacher & { itemType: 'teacher' }) | 
    (Course & { itemType: 'course'; teacher: Teacher }) | 
    (IndividualClass & { itemType: 'class'; teacher: Teacher });


const SkeletonCard: React.FC = () => (
    <div className="h-full bg-light-surface dark:bg-dark-surface p-4 rounded-lg shadow-md animate-pulse">
        <div className="w-full h-24 bg-light-border dark:bg-dark-border rounded-md"></div>
        <div className="mt-3 h-4 bg-light-border dark:bg-dark-border rounded w-3/4"></div>
        <div className="mt-2 h-3 bg-light-border dark:bg-dark-border rounded w-1/2"></div>
    </div>
);

const RecommendationCard: React.FC<{ item: RecommendedItem }> = ({ item }) => {
    const { handleNavigate } = useNavigation();

    if (item.itemType === 'teacher') {
        const teacher = item;
        return (
            <button 
                onClick={() => handleNavigate({ name: 'teacher_profile', teacherId: teacher.id })}
                className="w-full h-full text-left bg-light-surface dark:bg-dark-surface rounded-lg shadow-md overflow-hidden group transform hover:-translate-y-1 transition-transform duration-300 flex flex-col p-4 justify-center"
            >
                <div className="flex items-center text-xs font-semibold text-primary mb-2">
                    <UserCircleIcon className="w-4 h-4" />
                    <span className="ml-1.5 uppercase tracking-wider">Teacher</span>
                </div>
                <div className="flex items-center space-x-4">
                    <img src={teacher.profileImage} alt={teacher.name} className="w-16 h-16 rounded-full object-cover flex-shrink-0 border-2 border-white dark:border-dark-surface" />
                    <div className="flex-grow">
                        <h4 className="font-bold text-sm text-light-text dark:text-dark-text group-hover:text-primary transition-colors">{teacher.name}</h4>
                        <p className="text-xs text-light-subtle dark:text-dark-subtle mt-1">{teacher.tagline}</p>
                    </div>
                </div>
            </button>
        );
    }
    
    // Logic for Course and Class
    let title = '', subtitle = '', image = '', icon = null;
    let clickHandler = () => {};

    if (item.itemType === 'course') {
        const course = item;
        title = course.title;
        subtitle = `Course by ${course.teacher.name}`;
        image = course.coverImage;
        icon = <BookOpenIcon className="w-4 h-4" />;
        clickHandler = () => handleNavigate({ name: 'course_detail', courseId: course.id });
    } else if (item.itemType === 'class') {
        const classInfo = item;
        title = classInfo.title;
        subtitle = `Class by ${classInfo.teacher.name}`;
        image = classInfo.teacher.coverImages?.[0] || classInfo.teacher.profileImage;
        icon = <VideoCameraIcon className="w-4 h-4" />;
        clickHandler = () => handleNavigate({ name: 'class_detail', classId: classInfo.id });
    }

    return (
        <button onClick={clickHandler} className="w-full h-full text-left bg-light-surface dark:bg-dark-surface rounded-lg shadow-md overflow-hidden group transform hover:-translate-y-1 transition-transform duration-300 flex flex-col">
            <img src={image} alt={title} className="w-full h-24 object-cover flex-shrink-0" />
            <div className="p-4 flex-grow flex flex-col justify-between">
                <div>
                    <div className="flex items-center text-xs font-semibold text-primary mb-1">
                        {icon}
                        <span className="ml-1.5 uppercase tracking-wider">{item.itemType}</span>
                    </div>
                    <h4 className="font-bold text-sm text-light-text dark:text-dark-text group-hover:text-primary transition-colors">{title}</h4>
                </div>
                <p className="text-xs text-light-subtle dark:text-dark-subtle mt-1 truncate">{subtitle}</p>
            </div>
        </button>
    );
};


const AIRecommendations: React.FC<AIRecommendationsProps> = ({ currentUser }) => {
    const [recommendations, setRecommendations] = useState<RecommendedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { teachers, sales, submissions } = useData();

    useEffect(() => {
        const getRecommendations = async () => {
            const cachedRecs = sessionStorage.getItem('aiRecommendations');
            if (cachedRecs) {
                try {
                    const parsedRecs = JSON.parse(cachedRecs) as RecommendedItem[];
                    setRecommendations(parsedRecs);
                    setLoading(false);
                    return;
                } catch (e) {
                    console.error("Failed to parse cached AI recommendations, fetching new ones.", e);
                    sessionStorage.removeItem('aiRecommendations');
                }
            }

            try {
                const allCourses = teachers.flatMap(t => t.courses.map(c => ({ ...c, teacher: t })));
                const allLiveClasses = teachers.flatMap(t => t.individualClasses.filter(c => getDynamicClassStatus(c) !== 'finished' && getDynamicClassStatus(c) !== 'canceled').map(c => ({ ...c, teacher: t })));
                
                const studentProfileForAI = {
                    gender: currentUser.gender,
                    preferredLanguage: currentUser.preferredLanguage,
                    schools: currentUser.schools,
                    learningInstitutes: currentUser.learningInstitutes,
                    careerAspirations: currentUser.careerAspirations,
                    achievements: currentUser.achievements,
                    targetAudience: currentUser.targetAudience,
                    customExams: currentUser.customExams?.map(exam => ({ name: exam.name, targetAudience: exam.targetAudience })),
                    profileSummary: currentUser.profileSummary,
                    technicalSkills: currentUser.technicalSkills,
                    softSkills: currentUser.softSkills,
                    languages: currentUser.languages,
                    education: currentUser.education?.map(edu => ({ qualification: edu.qualification, institution: edu.institution })),
                    experience: currentUser.experience?.map(exp => ({ role: exp.role, organization: exp.organization })),
                    projects: currentUser.projects,
                    hobbies: currentUser.hobbies,
                    certifications: currentUser.certifications,
                };

                const enrolledItems = sales
                    .filter(s => s.studentId === currentUser.id && s.status === 'completed' && s.itemSnapshot)
                    .map(s => ({ title: s.itemName, type: s.itemType, subject: (s.itemSnapshot as any).subject }))
                    .slice(-10);

                const quizResults = submissions
                    .filter(s => s.studentId === currentUser.id)
                    .map(sub => {
                        const sale = sales.find(s => s.itemId === sub.quizId && s.itemType === 'quiz');
                        if (!sale) return null;
                        const quiz = sale.itemSnapshot as Quiz;
                        return { title: quiz.title, score: `${sub.score}/${quiz.questions.length}` };
                    }).filter(Boolean).slice(-5);

                const enrolledItemIds = new Set(sales.filter(s => s.studentId === currentUser.id).map(s => s.itemId));
                const availableItemsForAI = [
                    ...teachers.filter(t => t.registrationStatus === 'approved').map(t => ({ id: t.id, type: 'teacher', name: t.name, subjects: t.subjects, tagline: t.tagline.substring(0, 100) })),
                    ...allCourses.filter(c => c.isPublished && c.adminApproval === 'approved').map(c => ({ id: c.id, type: 'course', title: c.title, subject: c.subject, description: c.description.substring(0, 100) })),
                    ...allLiveClasses.filter(c => c.isPublished).map(c => ({ id: c.id, type: 'class', title: c.title, subject: c.subject, description: c.description.substring(0, 100) })),
                ].filter(item => !enrolledItemIds.has(item.id));
                
                if (availableItemsForAI.length === 0) {
                    setLoading(false);
                    return;
                }

                const ai = new GoogleGenAI({apiKey: 'AIzaSyB7BZfezyOj30ga7-dqKPQSVW6EbTMZiiQ'});

                const prompt = `You are a recommendation engine for an online learning platform called clazz.lk. Your goal is to suggest relevant items to a student based on their profile and activity.

                STUDENT PROFILE: ${JSON.stringify(studentProfileForAI)}
                STUDENT ENROLLMENT HISTORY: ${JSON.stringify(enrolledItems)}
                STUDENT QUIZ PERFORMANCE: ${JSON.stringify(quizResults)}
                AVAILABLE ITEMS TO RECOMMEND (teachers, courses, classes): ${JSON.stringify(availableItemsForAI.slice(0, 200))}

                Based on all the provided data, recommend up to 3 items from the "AVAILABLE ITEMS TO RECOMMEND" list that would be most beneficial for this student. If you can only find one or two good recommendations, that is fine. Prioritize items that match their target audience, career goals, and subjects of interest from their past enrollments.

                Respond ONLY with a valid JSON array of objects in this exact format:
                [
                  { "id": "item_id_1", "type": "teacher" | "course" | "class" }
                ]`;
                
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: { responseMimeType: "application/json" }
                });

                const resultText = response.text.trim();
                const recommendedIds: { id: string | number; type: 'teacher' | 'course' | 'class' }[] = JSON.parse(resultText) as { id: string | number; type: 'teacher' | 'course' | 'class' }[];

                const finalRecommendations: RecommendedItem[] = recommendedIds.map(rec => {
                    if (rec.type === 'teacher') {
                        const teacher = teachers.find(t => t.id === rec.id);
                        return teacher ? { ...teacher, itemType: 'teacher' } : null;
                    } else if (rec.type === 'course') {
                        const course = allCourses.find(c => c.id === rec.id);
                        return course ? { ...course, itemType: 'course' } : null;
                    } else if (rec.type === 'class') {
                        const classInfo = allLiveClasses.find(c => c.id === rec.id);
                        return classInfo ? { ...classInfo, itemType: 'class' } : null;
                    }
                    return null;
                }).filter((item): item is RecommendedItem => item !== null);

                setRecommendations(finalRecommendations);
                sessionStorage.setItem('aiRecommendations', JSON.stringify(finalRecommendations));

            } catch (e) {
                console.error("AI Recommendation Error:", e);
                setError("Could not fetch recommendations.");
            } finally {
                setLoading(false);
            }
        };

        getRecommendations();
    }, [currentUser, teachers, sales, submissions]);

    if (loading) {
        return (
            <section className="mt-12">
                <h2 className="text-3xl font-bold mb-6">Just for You, {currentUser.firstName}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            </section>
        );
    }
    
    if (error || recommendations.length === 0) {
        return null;
    }

    return (
        <section className="mt-12">
            <h2 className="text-3xl font-bold mb-6">Just for You, {currentUser.firstName}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {recommendations.map(item => (
                    <RecommendationCard key={`${item.itemType}-${item.id}`} item={item} />
                ))}
            </div>
        </section>
    );
};

export default AIRecommendations;