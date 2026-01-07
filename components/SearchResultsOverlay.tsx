
import React, { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useNavigation } from '../contexts/NavigationContext';
import { getOptimizedImageUrl } from '../utils';
import { PageState } from '../types';

interface SearchResultsOverlayProps {
    query: string;
    onClose: () => void;
}

const SearchResultsOverlay: React.FC<SearchResultsOverlayProps> = ({ query, onClose }) => {
    const { teachers, tuitionInstitutes } = useData();
    const { handleNavigate, setSearchQuery } = useNavigation();

    const normalizedQuery = query.toLowerCase().trim();

    const extractPlainText = (input: string) => {
        if (!input) return '';

        let text = input;

        // 1. Try to parse as Draft.js JSON
        try {
            const parsed = JSON.parse(input);
            if (parsed && Array.isArray(parsed.blocks)) {
                text = parsed.blocks.map((block: any) => block.text || '').join(' ');
            }
        } catch (e) {
            // Not JSON, assume plain text or markdown
        }

        // 2. Strip Markdown
        return text
            .replace(/#+\s/g, '') // Headers
            .replace(/(\*\*|__)(.*?)\1/g, '$2') // Bold
            .replace(/(\*|_)(.*?)\1/g, '$2') // Italic
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Links
            .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1') // Images
            .replace(/`{3}[\s\S]*?`{3}/g, '') // Code blocks
            .replace(/`(.+?)`/g, '$1') // Inline code
            .replace(/^\s*[-+*]\s/gm, '') // Unordered lists
            .replace(/^\s*\d+\.\s/gm, '') // Ordered lists
            .replace(/>\s/g, '') // Blockquotes
            .replace(/<[^>]*>?/gm, '') // HTML tags just in case
            .replace(/\n+/g, ' ') // Newlines to spaces
            .trim();
    };

    const results = useMemo(() => {
        if (!normalizedQuery) return { teachers: [], courses: [], classes: [], quizzes: [], events: [], products: [] };

        const matchedTeachers = teachers.filter(t =>
            (t.name && t.name.toLowerCase().includes(normalizedQuery)) ||
            (t.username && t.username.toLowerCase().includes(normalizedQuery))
        );

        const matchedCourses = teachers.flatMap(t => t.courses || []).filter(c =>
            c.title.toLowerCase().includes(normalizedQuery) && c.isPublished
        );

        // Find teacher for class to show image if needed, or just iterate properties available on class
        // We'll map to include teacher info for the view
        const matchedClasses = teachers.flatMap(t => (t.individualClasses || []).map(c => ({ ...c, teacher: t }))).filter(c =>
            c.title.toLowerCase().includes(normalizedQuery) && c.isPublished
        );

        const matchedQuizzes = teachers.flatMap(t => t.quizzes || []).filter(q =>
            q.title.toLowerCase().includes(normalizedQuery) && q.isPublished && !(q as any).isDeleted
        );

        const teacherEvents = teachers.flatMap(t => t.events || []);
        const instituteEvents = tuitionInstitutes.flatMap(ti => ti.events || []);
        const allEvents = [...teacherEvents, ...instituteEvents];

        const matchedEvents = allEvents.filter(e =>
            e.title.toLowerCase().includes(normalizedQuery) && e.isPublished && e.status !== 'canceled'
        );

        const matchedProducts = teachers.flatMap(t => t.products || []).filter(p =>
            p.title.toLowerCase().includes(normalizedQuery) && p.isPublished
        );

        return {
            teachers: matchedTeachers,
            courses: matchedCourses,
            classes: matchedClasses,
            quizzes: matchedQuizzes,
            events: matchedEvents,
            products: matchedProducts
        };
    }, [teachers, tuitionInstitutes, normalizedQuery]);

    const handleItemClick = (page: PageState) => {
        handleNavigate(page);
        onClose(); // Close the overlay
        setSearchQuery(''); // Clear query
    };

    const hasResults = Object.values(results).some(arr => arr.length > 0);

    return (
        <div className="fixed inset-0 top-16 z-30 bg-light-background dark:bg-dark-background overflow-y-auto">
            <div className="container mx-auto px-4 py-8">
                {!hasResults && (
                    <div className="text-center text-light-subtle dark:text-dark-subtle mt-12">
                        <p className="text-lg">No results found for "{query}"</p>
                    </div>
                )}

                {hasResults && (
                    <div className="space-y-8 pb-20">
                        {/* Teachers */}
                        {results.teachers.length > 0 && (
                            <section>
                                <h3 className="text-lg font-bold mb-4 text-light-text dark:text-dark-text border-b pb-2 border-light-border dark:border-dark-border">Teachers</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {results.teachers.map(teacher => (
                                        <button
                                            key={teacher.id}
                                            onClick={() => handleItemClick({ name: 'teacher_profile', teacherId: teacher.id })}
                                            className="flex items-center p-3 rounded-lg border border-light-border dark:border-dark-border hover:border-primary dark:hover:border-primary transition-colors text-left"
                                        >
                                            <img
                                                src={getOptimizedImageUrl(teacher.profileImage || teacher.avatar, 50, 50)}
                                                alt={teacher.name}
                                                className="w-12 h-12 rounded-full object-cover mr-4"
                                            />
                                            <div>
                                                <p className="font-semibold text-light-text dark:text-dark-text">{teacher.name}</p>
                                                {/* Use alias for institute name if we can infer it, or just ignore for now */}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Courses */}
                        {results.courses.length > 0 && (
                            <section>
                                <h3 className="text-lg font-bold mb-4 text-light-text dark:text-dark-text border-b pb-2 border-light-border dark:border-dark-border">Courses</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {results.courses.map(course => (
                                        <button
                                            key={course.id}
                                            onClick={() => handleItemClick({ name: 'course_detail', courseId: course.id })}
                                            className="p-3 rounded-lg border border-light-border dark:border-dark-border hover:border-primary dark:hover:border-primary transition-colors text-left flex gap-4"
                                        >
                                            <div className="w-16 h-16 flex-shrink-0 bg-gray-200 dark:bg-gray-800 rounded-md overflow-hidden">
                                                <img src={getOptimizedImageUrl(course.coverImage, 64, 64)} alt={course.title} className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-light-text dark:text-dark-text line-clamp-1">{course.title}</p>
                                                <p className="text-sm text-light-subtle dark:text-dark-subtle line-clamp-2">{extractPlainText(course.description)}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Classes */}
                        {results.classes.length > 0 && (
                            <section>
                                <h3 className="text-lg font-bold mb-4 text-light-text dark:text-dark-text border-b pb-2 border-light-border dark:border-dark-border">Classes</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {results.classes.map(cls => (
                                        <button
                                            key={cls.id}
                                            onClick={() => handleItemClick({ name: 'class_detail', classId: cls.id })}
                                            className="p-3 rounded-lg border border-light-border dark:border-dark-border hover:border-primary dark:hover:border-primary transition-colors text-left flex gap-4"
                                        >
                                            <div className="w-16 h-16 flex-shrink-0 bg-gray-200 dark:bg-gray-800 rounded-md overflow-hidden">
                                                {/* Using teacher's profile image as fallback/primary image for class */}
                                                <img src={getOptimizedImageUrl(cls.teacher.profileImage || cls.teacher.avatar, 64, 64)} alt={cls.title} className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-light-text dark:text-dark-text line-clamp-1">{cls.title}</p>
                                                <p className="text-sm text-light-subtle dark:text-dark-subtle">{cls.subject} {cls.grade ? `- ${cls.grade}` : ''}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Events */}
                        {results.events.length > 0 && (
                            <section>
                                <h3 className="text-lg font-bold mb-4 text-light-text dark:text-dark-text border-b pb-2 border-light-border dark:border-dark-border">Events</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {results.events.map(event => (
                                        <button
                                            key={event.id}
                                            onClick={() => handleItemClick({ name: 'event_detail', eventId: event.id })}
                                            className="p-3 rounded-lg border border-light-border dark:border-dark-border hover:border-primary dark:hover:border-primary transition-colors text-left flex gap-4"
                                        >
                                            <div className="w-16 h-16 flex-shrink-0 bg-gray-200 dark:bg-gray-800 rounded-md overflow-hidden">
                                                <img src={getOptimizedImageUrl(event.flyerImage, 64, 64)} alt={event.title} className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-light-text dark:text-dark-text line-clamp-1">{event.title}</p>
                                                <p className="text-sm text-light-subtle dark:text-dark-subtle">{event.venue || 'No location'}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Products */}
                        {results.products.length > 0 && (
                            <section>
                                <h3 className="text-lg font-bold mb-4 text-light-text dark:text-dark-text border-b pb-2 border-light-border dark:border-dark-border">Store Products</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {results.products.map(product => (
                                        <button
                                            key={product.id}
                                            onClick={() => handleItemClick({ name: 'product_detail', productId: product.id })}
                                            className="p-3 rounded-lg border border-light-border dark:border-dark-border hover:border-primary dark:hover:border-primary transition-colors text-left flex gap-4"
                                        >
                                            <div className="w-16 h-16 flex-shrink-0 bg-gray-200 dark:bg-gray-800 rounded-md overflow-hidden">
                                                <img src={getOptimizedImageUrl(product.coverImages?.[0], 64, 64)} alt={product.title} className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-light-text dark:text-dark-text line-clamp-1">{product.title}</p>
                                                <p className="text-sm text-light-subtle dark:text-dark-subtle">{product.price > 0 ? `LKR ${product.price}` : 'Free'}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Quizzes */}
                        {results.quizzes.length > 0 && (
                            <section>
                                <h3 className="text-lg font-bold mb-4 text-light-text dark:text-dark-text border-b pb-2 border-light-border dark:border-dark-border">Quizzes</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {results.quizzes.map(quiz => (
                                        <button
                                            key={quiz.id}
                                            onClick={() => handleItemClick({ name: 'quiz_detail', quizId: quiz.id })}
                                            className="p-3 rounded-lg border border-light-border dark:border-dark-border hover:border-primary dark:hover:border-primary transition-colors text-left"
                                        >
                                            <p className="font-semibold text-light-text dark:text-dark-text">{quiz.title}</p>
                                            <p className="text-sm text-light-subtle dark:text-dark-subtle">{quiz.questions.length} Questions</p>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchResultsOverlay;
