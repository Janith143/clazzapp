
import React, { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useNavigation } from '../contexts/NavigationContext';
import { Helmet } from 'react-helmet-async';
import { Teacher, IndividualClass, Course } from '../types';

// Assuming these components exist based on typical structure
const TeacherCard = React.lazy(() => import('../components/TeacherCard')); // Or verify path
const ClassCard = React.lazy(() => import('../components/ClassCard'));

interface Props {
    subjectSlug: string;
    locationSlug: string;
}

const unslugify = (slug: string) => {
    return slug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

const ProgrammaticLandingPage: React.FC<Props> = ({ subjectSlug, locationSlug }) => {
    const { teachers, loading } = useData();
    const { handleNavigate } = useNavigation();

    const city = useMemo(() => unslugify(locationSlug), [locationSlug]);
    const subject = useMemo(() => unslugify(subjectSlug), [subjectSlug]);

    const filteredData = useMemo(() => {
        if (!teachers) return { teachers: [], classes: [], courses: [] };

        const matchedTeachers: Teacher[] = [];
        const matchedClasses: IndividualClass[] = [];
        const matchedCourses: Course[] = [];

        teachers.forEach(teacher => {
            // 1. Check if teacher teaches the subject
            const hasSubject = teacher.subjects?.some(s => s.toLowerCase().includes(subject.toLowerCase())) ||
                teacher.teachingItems?.some(s => s.subject.toLowerCase().includes(subject.toLowerCase()));

            if (hasSubject) {
                // 2. Check location match (loosely)
                // Teacher location or Class location?
                // For "Classes in Colombo", we want classes happening in Colombo.
                // Or Teachers based in Colombo.

                const teacherLocationMatches = teacher.contact?.location?.toLowerCase().includes(city.toLowerCase());

                // Check Classes
                const teacherClasses = teacher.individualClasses || [];
                const validClasses = teacherClasses.filter(c =>
                    (c.town?.toLowerCase().includes(city.toLowerCase()) ||
                        c.district?.toLowerCase().includes(city.toLowerCase())) &&
                    c.subject.toLowerCase().includes(subject.toLowerCase())
                );

                if (teacherLocationMatches || validClasses.length > 0) {
                    matchedTeachers.push(teacher);
                    matchedClasses.push(...validClasses);
                }

                // Check Courses (Online courses might not be location bound, but we can show them as "Online Options")
                // If user searches "Colombo", maybe they want physical?
                // But we can show "Available Online" too.
                // Let's include courses if the teacher matches location OR if we frame it as "Also available online".
                // For now, simple logic: include courses if teacher is selected.
                if (teacherLocationMatches) {
                    if (teacher.courses) matchedCourses.push(...teacher.courses);
                }
            }
        });

        return { teachers: matchedTeachers, classes: matchedClasses, courses: matchedCourses };
    }, [teachers, city, subject]);

    if (loading) {
        return <div className="p-10 text-center">Loading best tutors for you...</div>;
    }

    // SEO Text Generation
    const title = `Best ${subject} Classes in ${city} | Top Tutors & Institutes`;
    const description = `Find the best ${subject} classes in ${city}. Compare top-rated tutors, check fees, and enroll online on Clazz.lk.`;

    return (
        <div className="container mx-auto px-4 py-8">
            <Helmet>
                <title>{title}</title>
                <meta name="description" content={description} />
                <meta property="og:title" content={title} />
                <meta property="og:description" content={description} />
            </Helmet>

            {/* Hero Section */}
            <div className="text-center mb-12 bg-white dark:bg-dark-surface p-8 rounded-xl shadow-sm">
                <h1 className="text-3xl md:text-4xl font-bold mb-4 text-primary">
                    Best <span className="text-secondary">{subject}</span> Classes in {city}
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                    Discover top-rated tutors and institutes for {subject} in the {city} area.
                    Compare profiles, fees, and reviews to find the perfect class for your success.
                </p>
            </div>

            {/* Teachers Section */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold mb-6">Top {subject} Tutors in {city}</h2>
                {filteredData.teachers.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                        {filteredData.teachers.map(t => (
                            <React.Suspense fallback={<div className="h-64 bg-gray-100 rounded animate-pulse"></div>} key={t.id}>
                                <TeacherCard
                                    teacher={t}
                                    onViewProfile={(id) => handleNavigate({ name: 'teacher_profile', teacherId: id })}
                                />
                            </React.Suspense>
                        ))}
                    </div>
                ) : (
                    <div className="bg-yellow-50 p-6 rounded-lg text-center">
                        <p className="text-lg text-yellow-800">
                            We are currently onboarding {subject} tutors in {city}.
                        </p>
                        <button onClick={() => handleNavigate({ name: 'all_teachers' })} className="mt-4 text-primary font-bold underline">
                            Browse All Teachers
                        </button>
                    </div>
                )}
            </section>

            {/* Classes Section */}
            {filteredData.classes.length > 0 && (
                <section className="mb-12">
                    <h2 className="text-2xl font-bold mb-6">Upcoming Classes</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredData.classes.map(c => (
                            <div key={c.id} className="bg-white dark:bg-dark-card p-4 rounded-lg shadow border-l-4 border-secondary">
                                <h4 className="font-bold">{c.title}</h4>
                                <p className="text-sm text-gray-600">{c.date} @ {c.startTime}</p>
                                <p className="text-sm font-semibold mt-2">{c.currency} {c.fee}</p>
                                <button
                                    onClick={() => handleNavigate({ name: 'class_detail', classId: c.id })}
                                    className="mt-3 w-full py-2 bg-primary text-white rounded text-sm hover:bg-primary-dark"
                                >
                                    View Details
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            )}

        </div>
    );
};

export default ProgrammaticLandingPage;
