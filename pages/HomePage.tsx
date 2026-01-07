import React, { useMemo, useState, useEffect } from 'react';
import { Teacher, Course, IndividualClass, Quiz, Event, TuitionInstitute } from '../types';
import AdvancedHeroFilter from '../components/AdvancedSearch/AdvancedHeroFilter';
// import HomeSlider from '../components/HomeSlider';
import SearchBar from '../components/SearchBar';
import TeacherCard from '../components/TeacherCard';
import CourseCard from '../components/CourseCard';
import ClassCard from '../components/ClassCard';
import QuizCard from '../components/QuizCard';
import EventCard from '../components/EventCard';
import OngoingClassesBar from '../components/OngoingClassesBar';
import UpcomingExamsSection from '../components/UpcomingExamsSection';

// FIX: Import the 'MyExamsSection' component to resolve the "Cannot find name" error.
import MyExamsSection from '../components/MyExamsSection';
import AndroidAppBanner from '../components/AndroidAppBanner';
import { getDynamicClassStatus, getDynamicQuizStatus, getDynamicEventStatus, getNextSessionDateTime, isCourseSessionLive } from '../utils';
import { slugify } from '../utils/slug';
import { useNavigation } from '../contexts/NavigationContext';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import SEOHead from '../components/SEOHead';

const HomePage: React.FC = () => {
    const { teachers, users, tuitionInstitutes } = useData();
    const { currentUser } = useAuth();
    const { handleNavigate, searchQuery, setSearchQuery, homeSlides, homePageLayoutConfig } = useNavigation();
    const { setModalState } = useUI();

    const [now, setNow] = useState(new Date());
    const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

    // Using SEOHead component instead of useSEO hook
    // useSEO(
    //     'clazz.lk - Online Learning Platform for Sri Lanka',
    //     'Connect with the best tutors, enroll in online classes, and excel in your studies.'
    // );

    // Debounce effect for search input
    useEffect(() => {
        const handler = setTimeout(() => {
            setSearchQuery(localSearchQuery);
        }, 500); // 500ms delay

        return () => {
            clearTimeout(handler);
        };
    }, [localSearchQuery, setSearchQuery]);

    // Sync local state if global state changes from elsewhere (e.g., navigation)
    useEffect(() => {
        if (searchQuery !== localSearchQuery) {
            setLocalSearchQuery(searchQuery);
        }
    }, [searchQuery]);


    useEffect(() => {
        // This interval will cause the component to re-render every 30 seconds,
        // which in turn will cause the useMemo hooks that depend on 'now' to be re-evaluated.
        const intervalId = setInterval(() => {
            setNow(new Date());
        }, 30000); // Re-check every 30 seconds

        return () => clearInterval(intervalId); // Cleanup on component unmount
    }, []);

    const onViewCourse = (course: any, teacher: any) => handleNavigate({ name: 'course_detail_slug', slug: slugify(course.title) });
    const onViewClass = (classInfo: any, teacher: any) => handleNavigate({ name: 'class_detail_slug', slug: slugify(classInfo.title) });
    const onViewQuiz = (quiz: any) => handleNavigate({ name: 'quiz_detail_slug', slug: slugify(quiz.title) });
    const onViewEvent = (event: any) => handleNavigate({ name: 'event_detail_slug', slug: slugify(event.title) });
    const onViewAllTeachers = () => handleNavigate({ name: 'all_teachers' });
    const onViewAllCourses = () => handleNavigate({ name: 'all_courses' });
    const onViewAllClasses = (options?: { ongoingOnly?: boolean }) => handleNavigate({ name: 'all_classes', options });
    const onViewAllQuizzes = () => handleNavigate({ name: 'all_quizzes' });
    const onViewAllEvents = () => handleNavigate({ name: 'all_events' });

    const onCtaClick = (ctaText: string) => {
        switch (ctaText) {
            case 'Find a Teacher':
                handleNavigate({ name: 'all_teachers' });
                break;
            case 'Explore Classes':
                handleNavigate({ name: 'all_classes' });
                break;
            case 'Start Teaching':
                if (currentUser?.role === 'teacher') {
                    const teacherProfile = teachers.find(t => t.userId === currentUser.id);
                    if (teacherProfile) {
                        handleNavigate({ name: 'teacher_profile', teacherId: teacherProfile.id });
                    } else {
                        setModalState({ name: 'register' });
                    }
                } else {
                    setModalState({ name: 'register' });
                }
                break;
            default:
                // Fallback for any other CTA
                handleNavigate({ name: 'home' });
                break;
        }
    };

    const approvedTeachers = useMemo(() => teachers.filter(t => t.registrationStatus === 'approved' && t.isPublished !== false), [teachers]);

    // --- LIVE & DEFAULT CONTENT ---
    const liveItems = useMemo(() => {
        const liveClasses = approvedTeachers
            .flatMap(t => t.individualClasses.map(c => ({ classInfo: c, teacher: t })))
            .filter(({ classInfo }) => classInfo.isPublished && (classInfo.mode === 'Online' || classInfo.mode === 'Both') && getDynamicClassStatus(classInfo) === 'live' && !!classInfo.joiningLink)
            .map(({ classInfo, teacher }) => ({
                id: classInfo.id,
                title: classInfo.title,
                teacher,
                type: 'class' as const,
                originalItem: classInfo
            }));

        const liveCourses = approvedTeachers
            .flatMap(t => t.courses.map(c => ({ course: c, teacher: t })))
            .filter(({ course }) => {
                // Course must be published and live type
                if (!course.isPublished || course.type !== 'live') return false;

                // Must be currently live according to schedule/sessions
                if (!isCourseSessionLive(course)) return false;

                // CRITICAL: Must have a join link! 
                // Either in a currently active specific session, or generally (if we supported that, but we don't seem to).
                // We check if there's an active session with a join link.
                const hasJoinableSession = course.liveSessions?.some(s => {
                    const now = new Date(); // Use closure 'now' if available, otherwise new Date()
                    const start = new Date(`${s.date}T${s.startTime}`);
                    const end = new Date(`${s.date}T${s.endTime}`);
                    return now >= start && now <= end && !!s.joinLink;
                });

                return !!hasJoinableSession;
            })
            .map(({ course, teacher }) => ({
                id: course.id,
                title: course.title,
                teacher,
                type: 'course' as const,
                originalItem: course
            }));

        return [...liveClasses, ...liveCourses];
    }, [approvedTeachers, now]);

    const featuredTeachers = useMemo(() => {
        if (!homePageLayoutConfig) return approvedTeachers.slice(0, 3);
        const config = homePageLayoutConfig.teachers;

        if (config.mode === 'selected' && config.selectedIds && config.selectedIds.length > 0) {
            const userMap = new Map(users.map(u => [u.id, u]));
            return config.selectedIds
                .map(id => approvedTeachers.find(t => t.id === id))
                .filter((t): t is Teacher => t !== undefined);
        } else {
            const userMap = new Map(users.map(u => [u.id, u]));
            return [...approvedTeachers]
                .sort((a, b) => {
                    const userA = userMap.get(a.userId || '');
                    const userB = userMap.get(b.userId || '');
                    const dateA = userA?.createdAt ? new Date(userA.createdAt).getTime() : 0;
                    const dateB = userB?.createdAt ? new Date(userB.createdAt).getTime() : 0;
                    return dateB - dateA;
                })
                .slice(0, config.count || 3);
        }
    }, [approvedTeachers, users, homePageLayoutConfig]);

    const popularCourses = useMemo(() => {
        if (!homePageLayoutConfig) return [];
        const config = homePageLayoutConfig.courses;

        if (config.mode === 'selected' && config.selectedIds && config.selectedIds.length > 0) {
            return config.selectedIds
                .map(id => {
                    const teacher = approvedTeachers.find(t => t.courses.some(c => c.id === id));
                    const course = teacher?.courses.find(c => c.id === id);
                    return course && teacher ? { course, teacher } : null;
                })
                .filter((item): item is { course: Course; teacher: Teacher } => item !== null);
        } else {
            return approvedTeachers
                .flatMap(t => t.courses.map(c => ({ course: c, teacher: t })))
                .filter(({ course }) => course.isPublished)
                .sort((a, b) => b.course.ratings.length - a.course.ratings.length)
                .slice(0, config.count || 3);
        }
    }, [approvedTeachers, homePageLayoutConfig]);

    const upcomingClasses = useMemo(() => {
        if (!homePageLayoutConfig) return [];
        const config = homePageLayoutConfig.classes;

        if (config.mode === 'selected' && config.selectedIds && config.selectedIds.length > 0) {
            return config.selectedIds
                .map(id => {
                    const teacher = approvedTeachers.find(t => t.individualClasses.some(c => String(c.id) === id));
                    const classInfo = teacher?.individualClasses.find(c => String(c.id) === id);
                    if (!classInfo || !teacher) return null;
                    const status = getDynamicClassStatus(classInfo, now);
                    const isLive = status === 'live';
                    const nextSession = getNextSessionDateTime(classInfo, now);
                    const sortDate = isLive ? now : nextSession;
                    return { classInfo, teacher, isLive, nextSession, sortDate };
                })
                .filter((item): item is { classInfo: IndividualClass; teacher: Teacher; isLive: boolean; nextSession: Date | null; sortDate: Date | null } => item !== null && (item.classInfo.isPublished && (item.isLive || item.nextSession !== null)));
        } else {
            return approvedTeachers
                .flatMap(t => t.individualClasses.map(c => ({ classInfo: c, teacher: t })))
                .map(item => {
                    const status = getDynamicClassStatus(item.classInfo, now);
                    const isLive = status === 'live';
                    const nextSession = getNextSessionDateTime(item.classInfo, now);
                    const sortDate = isLive ? now : nextSession;
                    return { ...item, isLive, nextSession, sortDate };
                })
                .filter(({ classInfo, isLive, nextSession }) => classInfo.isPublished && (isLive || nextSession))
                .sort((a, b) => (a.sortDate && b.sortDate) ? a.sortDate.getTime() - b.sortDate.getTime() : 0)
                .slice(0, config.count || 3);
        }
    }, [approvedTeachers, now, homePageLayoutConfig]);

    const latestQuizzes = useMemo(() => {
        if (!homePageLayoutConfig) return [];
        const config = homePageLayoutConfig.quizzes;

        if (config.mode === 'selected' && config.selectedIds && config.selectedIds.length > 0) {
            return config.selectedIds
                .map(id => {
                    const teacher = approvedTeachers.find(t => t.quizzes.some(q => q.id === id));
                    const quiz = teacher?.quizzes.find(q => q.id === id);
                    return quiz && teacher ? { quiz, teacher } : null;
                })
                .filter((item): item is { quiz: Quiz; teacher: Teacher } => item !== null && (item.quiz.isPublished && getDynamicQuizStatus(item.quiz) === 'scheduled'));
        } else {
            return approvedTeachers
                .flatMap(t => t.quizzes.map(q => ({ quiz: q, teacher: t })))
                .filter(({ quiz }) => quiz.isPublished && getDynamicQuizStatus(quiz) === 'scheduled')
                .sort((a, b) => b.quiz.id.localeCompare(a.quiz.id))
                .slice(0, config.count || 3);
        }
    }, [approvedTeachers, now, homePageLayoutConfig]);

    const upcomingEvents = useMemo(() => {
        if (!homePageLayoutConfig) return [];
        const config = homePageLayoutConfig.events;

        if (config.mode === 'selected' && config.selectedIds && config.selectedIds.length > 0) {
            return config.selectedIds
                .map(id => {
                    const organizer = tuitionInstitutes.find(ti => (ti.events || []).some(e => e.id === id));
                    const event = organizer?.events?.find(e => e.id === id);
                    return event && organizer ? { event, organizer } : null;
                })
                .filter((item): item is { event: Event; organizer: TuitionInstitute } => item !== null && (item.event.isPublished && getDynamicEventStatus(item.event) === 'scheduled'));
        } else {
            return tuitionInstitutes
                .flatMap(ti => (ti.events || []).map(e => ({ event: e, organizer: ti })))
                .filter(({ event }) => event.isPublished && getDynamicEventStatus(event) === 'scheduled')
                .sort((a, b) => new Date(a.event.startDate).getTime() - new Date(b.event.startDate).getTime())
                .slice(0, config.count || 3);
        }
    }, [tuitionInstitutes, now, homePageLayoutConfig]);

    const handleLiveItemClick = (item: any, type: 'class' | 'course') => {
        if (type === 'class') {
            onViewClass(item, undefined);
        } else {
            onViewCourse(item, undefined);
        }
    };


    // --- SEARCH RESULTS ---
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) {
            return {
                data: { teachers: [], courses: [], classes: [], quizzes: [], events: [] },
                isExact: true
            };
        }

        const performSearch = (query: string, mode: 'exact' | 'fuzzy') => {
            const lowerQuery = query.toLowerCase();
            const queryWords = mode === 'fuzzy' ? lowerQuery.split(/\s+/) : [lowerQuery];

            const checkMatch = (content: string) => {
                const lowerContent = content.toLowerCase();
                if (mode === 'exact') {
                    return lowerContent.includes(lowerQuery);
                }
                // Fuzzy: matches any word in the query
                return queryWords.some(word => lowerContent.includes(word));
            };

            const teachers = approvedTeachers.filter(teacher => {
                const locations = teacher.teachingLocations
                    ? teacher.teachingLocations.map(l => `${l.instituteName} ${l.town} ${l.district}`).join(' ')
                    : '';

                const searchableContent = [
                    teacher.name,
                    teacher.tagline,
                    teacher.contact?.location,
                    teacher.id,
                    teacher.username,
                    ...teacher.subjects,
                    ...teacher.qualifications,
                    locations
                ].join(' ');
                return checkMatch(searchableContent);
            });

            const courses = approvedTeachers
                .flatMap(teacher => teacher.courses.map(course => ({ ...course, teacher })))
                .filter(course => {
                    if (!course.isPublished) return false;
                    const searchableContent = [
                        course.title,
                        course.description,
                        course.subject,
                        course.teacher.name,
                        course.teacher.id,
                        course.teacher.username,
                        course.teacher.contact?.location
                    ].join(' ');
                    return checkMatch(searchableContent);
                });

            const classes = approvedTeachers
                .flatMap(teacher => teacher.individualClasses.map(classInfo => ({ ...classInfo, teacher })))
                .filter(classInfo => {
                    const status = getDynamicClassStatus(classInfo);
                    if (!classInfo.isPublished || status === 'finished' || status === 'canceled') return false;
                    const searchableContent = [
                        classInfo.title,
                        classInfo.description,
                        classInfo.subject,
                        classInfo.teacher.name,
                        classInfo.teacher.id,
                        classInfo.teacher.username,
                        classInfo.teacher.contact?.location
                    ].join(' ');
                    return checkMatch(searchableContent);
                });

            const quizzes = approvedTeachers
                .flatMap(teacher => teacher.quizzes.map(quiz => ({ ...quiz, teacher })))
                .filter(quiz => {
                    if (!quiz.isPublished || getDynamicQuizStatus(quiz) !== 'scheduled') return false;
                    const searchableContent = [
                        quiz.title,
                        quiz.description,
                        quiz.subject,
                        quiz.teacher.name,
                        quiz.teacher.id,
                        quiz.teacher.username,
                        quiz.teacher.contact?.location
                    ].join(' ');
                    return checkMatch(searchableContent);
                });

            const events = tuitionInstitutes
                .flatMap(ti => (ti.events || []).map(event => ({ ...event, organizer: ti })))
                .filter(event => {
                    if (!event.isPublished || getDynamicEventStatus(event) !== 'scheduled') return false;
                    const searchableContent = [
                        event.title,
                        event.description,
                        event.category,
                        event.venue,
                        event.organizer.name,
                        event.organizer.id,
                        event.organizer.contact?.location
                    ].join(' ');
                    return checkMatch(searchableContent);
                });

            return { teachers, courses, classes, quizzes, events };
        };

        // 1. First Pass: Exact Match
        const exactResults = performSearch(searchQuery, 'exact');
        const hasExact = Object.values(exactResults).some(arr => arr.length > 0);

        if (hasExact) {
            return { data: exactResults, isExact: true };
        }

        // 2. Second Pass: Fuzzy Match (fallback)
        // Only run if query has multiple words or is long enough to warrant it? 
        // For now, simple standard fuzzy.
        const fuzzyResults = performSearch(searchQuery, 'fuzzy');
        const hasFuzzy = Object.values(fuzzyResults).some(arr => arr.length > 0);

        return {
            data: hasFuzzy ? fuzzyResults : exactResults, // return empty exactResults if fuzzy also empty
            isExact: !hasFuzzy // If fuzzy found something, isExact is false. If fuzzy failed too, it doesn't matter (empty).
        };

    }, [searchQuery, approvedTeachers, tuitionInstitutes, now]);

    const hasSearchResults = useMemo(() => {
        if (!searchQuery.trim()) return false;
        const data = searchResults.data;
        return data.teachers.length > 0 || data.courses.length > 0 || data.classes.length > 0 || data.quizzes.length > 0 || data.events.length > 0;
    }, [searchQuery, searchResults]);
    const noResultsFound = useMemo(() => searchQuery.trim() !== '' && !hasSearchResults, [searchQuery, hasSearchResults]);


    const hasContent = useMemo(() =>
        featuredTeachers.length > 0 ||
        popularCourses.length > 0 ||
        upcomingClasses.length > 0 ||
        latestQuizzes.length > 0 ||
        upcomingEvents.length > 0,
        [featuredTeachers, popularCourses, upcomingClasses, latestQuizzes, upcomingEvents]
    );

    return (
        <div className="space-y-12">
            <SEOHead />
            {liveItems.length > 0 &&
                <OngoingClassesBar
                    items={liveItems}
                    onItemClick={handleLiveItemClick}
                    onBarClick={() => onViewAllClasses({ ongoingOnly: true })}
                />
            }

            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="lg:grid lg:grid-cols-3 lg:gap-8 items-stretch">
                    <div className="lg:col-span-2">
                        <div className="lg:col-span-2">
                            <AdvancedHeroFilter />
                        </div>
                    </div>
                    <div className="hidden lg:block lg:col-span-1 relative">
                        <div className="absolute inset-0 py-8">
                            <UpcomingExamsSection />
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
                <SearchBar searchQuery={localSearchQuery} setSearchQuery={setLocalSearchQuery} />
            </div>

            <div className="lg:hidden container mx-auto px-4 sm:px-6 lg:px-8">
                <MyExamsSection user={currentUser} />
            </div>



            <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-16 pb-16">
                {hasSearchResults ? (
                    <section>
                        <h2 className="text-3xl font-bold mb-6">Search Results for "{searchQuery}"</h2>

                        {!searchResults.isExact && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 mb-8 rounded-r-md">
                                <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                                    No exact matches found for "{searchQuery}". Showing similar results containing related terms.
                                </p>
                            </div>
                        )}

                        <div className="space-y-12">
                            {searchResults.data.teachers.length > 0 && <div><h3 className="text-2xl font-semibold mb-4">Teachers</h3><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8"><>{searchResults.data.teachers.map(teacher => <TeacherCard key={teacher.id} teacher={teacher} onViewProfile={(id) => handleNavigate({ name: 'teacher_profile', teacherId: id })} />)}</></div></div>}
                            {searchResults.data.courses.length > 0 && <div><h3 className="text-2xl font-semibold mb-4">Courses</h3><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8"><>{searchResults.data.courses.map(course => <CourseCard key={course.id} course={course} teacher={course.teacher} viewMode="public" onView={onViewCourse} />)}</></div></div>}
                            {searchResults.data.classes.length > 0 && <div><h3 className="text-2xl font-semibold mb-4">Classes</h3><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8"><>{searchResults.data.classes.map(classInfo => <ClassCard key={classInfo.id} classInfo={classInfo} teacher={classInfo.teacher} viewMode="public" onView={onViewClass} />)}</></div></div>}
                            {searchResults.data.quizzes.length > 0 && <div><h3 className="text-2xl font-semibold mb-4">Quizzes</h3><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"><>{searchResults.data.quizzes.map(quiz => <QuizCard key={quiz.id} quiz={quiz} teacher={quiz.teacher} viewMode="public" onView={onViewQuiz} currentUser={currentUser} />)}</></div></div>}
                            {searchResults.data.events.length > 0 && <div><h3 className="text-2xl font-semibold mb-4">Events</h3><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"><>{searchResults.data.events.map(event => <EventCard key={event.id} event={event} organizer={event.organizer} onView={onViewEvent} />)}</></div></div>}
                        </div>
                    </section>
                ) : noResultsFound ? (
                    <div className="text-center py-16 text-light-subtle dark:text-dark-subtle bg-light-surface dark:bg-dark-surface rounded-xl border border-light-border dark:border-dark-border">
                        <p className="text-xl font-semibold mb-2">No results found for "{searchQuery}"</p>
                        <p>Try checking your spelling or using more general terms.</p>
                    </div>
                ) : (
                    <>
                        {!hasContent && (
                            <div className="text-center py-16 text-light-subtle dark:text-dark-subtle">
                                <p className="text-xl font-semibold">No featured content available right now.</p>
                                <p>Try searching for specific teachers, courses, or classes.</p>
                            </div>
                        )}

                        {featuredTeachers.length > 0 && (
                            <section>
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-3xl font-bold">Featured Teachers</h2>
                                    <button onClick={onViewAllTeachers} className="text-sm font-medium text-primary hover:underline">View All</button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                                    {featuredTeachers.map(teacher => <TeacherCard key={teacher.id} teacher={teacher} onViewProfile={(id) => handleNavigate({ name: 'teacher_profile', teacherId: id })} />)}
                                </div>
                            </section>
                        )}

                        {popularCourses.length > 0 && (
                            <section>
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-3xl font-bold">Popular Courses</h2>
                                    <button onClick={onViewAllCourses} className="text-sm font-medium text-primary hover:underline">View All</button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                                    {popularCourses.map(({ course, teacher }) => <CourseCard key={course.id} course={course} teacher={teacher} viewMode="public" onView={onViewCourse} />)}
                                </div>
                            </section>
                        )}

                        {upcomingClasses.length > 0 && (
                            <section>
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-3xl font-bold">Upcoming Classes</h2>
                                    <button onClick={() => onViewAllClasses()} className="text-sm font-medium text-primary hover:underline">View All</button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                                    {upcomingClasses.map(({ classInfo, teacher }) => <ClassCard key={classInfo.id} classInfo={classInfo} teacher={teacher} viewMode="public" onView={onViewClass} />)}
                                </div>
                            </section>
                        )}

                        {latestQuizzes.length > 0 && (
                            <section>
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-3xl font-bold">Latest Quizzes</h2>
                                    <button onClick={onViewAllQuizzes} className="text-sm font-medium text-primary hover:underline">View All</button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {latestQuizzes.map(({ quiz, teacher }) => <QuizCard key={quiz.id} quiz={quiz} teacher={teacher} viewMode="public" onView={onViewQuiz} currentUser={currentUser} />)}
                                </div>
                            </section>
                        )}

                        {upcomingEvents.length > 0 && (
                            <section>
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-3xl font-bold">Upcoming Events</h2>
                                    <button onClick={onViewAllEvents} className="text-sm font-medium text-primary hover:underline">View All</button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {upcomingEvents.map(({ event, organizer }) => <EventCard key={event.id} event={event} organizer={organizer} onView={onViewEvent} />)}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </div>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-24 md:pb-8">
                <AndroidAppBanner />
            </div>
        </div>
    );
};

export default HomePage;
