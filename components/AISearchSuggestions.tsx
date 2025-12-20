import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import MarkdownDisplay from './MarkdownDisplay';
import { SpinnerIcon } from './Icons';

interface AISearchSuggestionsProps {
    searchQuery: string;
}

const AISearchSuggestions: React.FC<AISearchSuggestionsProps> = ({ searchQuery }) => {
    const [suggestions, setSuggestions] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setLoading(false);
            return;
        }

        const fetchSuggestions = async () => {
            setLoading(true);
            setError(null);
            setSuggestions('');

            try {
                // As per guidelines, the API_KEY is available in process.env
                const ai = new GoogleGenAI({apiKey: 'AIzaSyB7BZfezyOj30ga7-dqKPQSVW6EbTMZiiQ'});

                const prompt = `You are a helpful assistant for an online learning platform in Sri Lanka called clazz.lk. A user searched for "${searchQuery}" but found no direct results on our platform. 
                
                Please provide some helpful suggestions to guide the user. Your response should:
                1. Suggest alternative, broader, or related search terms that might exist on our platform (e.g., if they search "Quantum Mechanics," suggest "A/L Physics").
                2. Briefly explain related foundational topics they could search for.
                3. Keep the tone encouraging and helpful.
                4. Format the response in simple, clear Markdown. Use bullet points for suggestions. Do not use headings.
                
                Example for a search of "Astrophysics":
                * We couldn't find a specific course on Astrophysics, but you could try searching for "A/L Physics" which covers foundational concepts.
                * Explore topics like "Gravitation" or "Modern Physics" which are related to your search.
                * Consider searching for tutors who specialize in "Physics" as they may cover this topic in their classes.`;

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                });

                setSuggestions(response.text);

            } catch (e) {
                console.error("Gemini API Error:", e);
                setError("Sorry, we couldn't get AI suggestions at this time. Please try refining your search.");
            } finally {
                setLoading(false);
            }
        };

        fetchSuggestions();
    }, [searchQuery]);

    return (
        <section>
            <h2 className="text-3xl font-bold mb-6">No results for "{searchQuery}"</h2>
            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md border-l-4 border-primary">
                <h3 className="text-xl font-bold text-light-text dark:text-dark-text mb-4">AI-Powered Suggestions</h3>

                {loading && (
                    <div className="flex items-center justify-center py-8">
                        <SpinnerIcon className="w-8 h-8 text-primary" />
                        <p className="ml-4 text-light-subtle dark:text-dark-subtle">Thinking of some ideas for you...</p>
                    </div>
                )}
                
                {error && (
                    <p className="text-red-500">{error}</p>
                )}
                
                {!loading && !error && suggestions && (
                     <MarkdownDisplay content={suggestions} />
                )}
            </div>
        </section>
    );
};

export default AISearchSuggestions;