import React from 'react';
import { Question, Answer } from '../types.ts';
import { TrashIcon, PlusIcon, XIcon } from './Icons.tsx';
import ImageUploadInput from './ImageUploadInput.tsx';

interface QuestionEditorCardProps {
    question: Question;
    questionNumber: number;
    onChange: (question: Question) => void;
    onDelete: () => void;
}

const QuestionEditorCard: React.FC<QuestionEditorCardProps> = ({ question, questionNumber, onChange, onDelete }) => {

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange({ ...question, text: e.target.value });
    };
    
    const handleImageChange = (base64: string) => {
        onChange({ ...question, imageUrl: base64 });
    };
    
    const removeImage = () => {
        const { imageUrl, ...restOfQuestion } = question;
        onChange(restOfQuestion);
    };

    const handleAnswerTextChange = (answerId: string, text: string) => {
        const newAnswers = question.answers.map(a => a.id === answerId ? { ...a, text } : a);
        onChange({ ...question, answers: newAnswers });
    };

    const handleCorrectChange = (answerId: string, isCorrect: boolean) => {
        const newAnswers = question.answers.map(a => a.id === answerId ? { ...a, isCorrect } : a);
        onChange({ ...question, answers: newAnswers });
    };

    const addAnswer = () => {
        if (question.answers.length >= 6) return;
        const newAnswer: Answer = {
            id: `a_${Date.now()}`,
            text: '',
            isCorrect: false
        };
        onChange({ ...question, answers: [...question.answers, newAnswer] });
    };

    const deleteAnswer = (answerId: string) => {
        if (question.answers.length <= 2) return; // Must have at least 2 answers
        const newAnswers = question.answers.filter(a => a.id !== answerId);
        onChange({ ...question, answers: newAnswers });
    };

    return (
        <div className="bg-light-background dark:bg-dark-background p-4 rounded-lg border border-light-border dark:border-dark-border">
            <div className="flex justify-between items-start mb-4">
                <label className="font-bold text-lg text-light-text dark:text-dark-text">Question {questionNumber}</label>
                <button type="button" onClick={onDelete} className="p-1 text-red-500 hover:text-red-700 dark:hover:text-red-400">
                    <TrashIcon className="w-5 h-5"/>
                </button>
            </div>
            
            <ImageUploadInput
                label="Question Image (Optional)"
                currentImage={question.imageUrl || null}
                onImageChange={handleImageChange}
                aspectRatio="aspect-video"
            />
            {question.imageUrl && (
                <button type="button" onClick={removeImage} className="text-xs text-red-500 hover:underline mt-1">
                    Remove Image
                </button>
            )}

            <div className="mt-4">
                <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Question Text</label>
                <textarea
                    value={question.text}
                    onChange={handleTextChange}
                    placeholder="Type your question here..."
                    rows={3}
                    className="w-full p-2 border border-light-border dark:border-dark-border rounded-md bg-light-surface dark:bg-dark-surface focus:outline-none focus:ring-primary focus:border-primary"
                />
            </div>

            <div className="mt-4 space-y-3">
                <label className="block text-sm font-medium">Answers (check the correct one/s)</label>
                {question.answers.map((answer, index) => (
                    <div key={answer.id} className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={answer.isCorrect}
                            onChange={(e) => handleCorrectChange(answer.id, e.target.checked)}
                            className="h-5 w-5 text-primary focus:ring-primary border-light-border dark:border-dark-border rounded"
                        />
                        <input
                            type="text"
                            value={answer.text}
                            onChange={(e) => handleAnswerTextChange(answer.id, e.target.value)}
                            placeholder={`Answer ${index + 1}`}
                            className="flex-grow p-2 border border-light-border dark:border-dark-border rounded-md bg-light-surface dark:bg-dark-surface focus:outline-none focus:ring-primary focus:border-primary"
                        />
                        {question.answers.length > 2 && (
                             <button type="button" onClick={() => deleteAnswer(answer.id)} className="p-1 text-light-subtle dark:text-dark-subtle hover:text-red-500">
                                <XIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
            {question.answers.length < 6 && (
                <div className="mt-4">
                     <button type="button" onClick={addAnswer} className="flex items-center space-x-2 text-sm text-primary hover:text-primary-dark">
                        <PlusIcon className="w-4 h-4" />
                        <span>Add Answer</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default QuestionEditorCard;