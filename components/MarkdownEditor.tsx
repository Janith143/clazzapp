import React, { useState, useRef, useEffect } from 'react';
import {
    Editor,
    EditorState,
    RichUtils,
    convertToRaw,
    convertFromRaw,
    ContentState
} from 'draft-js';
import { LinkIcon } from './Icons';

interface RichTextEditorProps {
    label: string;
    id: string;
    name: string;
    value: string;
    onChange: (e: { target: { name: string; value: string } }) => void;
    rows: number;
    placeholder?: string;
}

const ToolbarButton: React.FC<{ onMouseDown: (e: React.MouseEvent) => void, children: React.ReactNode, title: string, active?: boolean }> = ({ onMouseDown, children, title, active }) => (
    <button
        type="button"
        onMouseDown={onMouseDown}
        title={title}
        className={`px-2.5 py-1 text-sm rounded hover:bg-white/50 dark:hover:bg-black/20 text-light-text dark:text-dark-text ${active ? 'bg-primary/20' : ''}`}
    >
        {children}
    </button>
);

const DraftJSEditor: React.FC<RichTextEditorProps> = ({ label, id, name, value, onChange, rows, placeholder }) => {
    const [editorState, setEditorState] = useState(() => {
        try {
            if (value) {
                const rawContent = JSON.parse(value);
                if (typeof rawContent === 'object' && rawContent !== null) {
                    const contentState = convertFromRaw(rawContent);
                    return EditorState.createWithContent(contentState);
                }
            }
        } catch (e) {
            return EditorState.createWithContent(ContentState.createFromText(value || ''));
        }
        return EditorState.createEmpty();
    });

    // Track if the change originated from within this component (user typing)
    const isInternalChange = useRef(false);

    // Sync internal state with prop changes (e.g. when loading a saved class or resetting)
    useEffect(() => {
        // If the update was triggered by our own onChange, ignore it to prevent loop/cursor jump
        if (isInternalChange.current) {
            isInternalChange.current = false;
            return;
        }

        const currentContent = editorState.getCurrentContent();
        let newContentState: ContentState;

        try {
            if (value) {
                const raw = JSON.parse(value);
                if (typeof raw === 'object' && raw !== null) {
                    newContentState = convertFromRaw(raw);
                } else {
                     newContentState = ContentState.createFromText(value);
                }
            } else {
                newContentState = ContentState.createFromText('');
            }
        } catch {
            newContentState = ContentState.createFromText(value || '');
        }

        const currentText = currentContent.getPlainText();
        const newText = newContentState.getPlainText();
        
        // Check if content is actually different to avoid unnecessary re-renders
        // We compare plain text for simplicity, but could compare raw JSON for strictness.
        // If the prop value is different from current state, and it wasn't an internal change, update state.
        if (currentText !== newText) {
            const newEditorState = EditorState.createWithContent(newContentState);
            // We push the new state. Note: this might reset cursor position if it happens while typing,
            // but isInternalChange prevents that for normal typing.
            setEditorState(newEditorState);
        } else if (!value && currentText !== '') {
             // Handle explicit reset to empty
             setEditorState(EditorState.createEmpty());
        }

    }, [value]); 
    
    const editorRef = useRef<Editor>(null);
    const minHeight = rows * 24;

    const onEditorChange = (newState: EditorState) => {
        setEditorState(newState);
        
        const currentContent = editorState.getCurrentContent();
        const newContent = newState.getCurrentContent();
        
        if (currentContent !== newContent) {
            const rawContent = convertToRaw(newContent);
            const jsonString = JSON.stringify(rawContent);
            
            isInternalChange.current = true; // Mark this update as internal
            onChange({ target: { name, value: jsonString } });
        }
    };
    
    const focusEditor = () => {
        editorRef.current?.focus();
    };

    const handleKeyCommand = (command: string, state: EditorState) => {
        const newState = RichUtils.handleKeyCommand(state, command);
        if (newState) {
            onEditorChange(newState);
            return 'handled';
        }
        return 'not-handled';
    };

    const toggleInlineStyle = (e: React.MouseEvent, style: string) => {
        e.preventDefault();
        onEditorChange(RichUtils.toggleInlineStyle(editorState, style));
    };

    const promptForLink = (e: React.MouseEvent) => {
        e.preventDefault();
        const selection = editorState.getSelection();
        if (selection.isCollapsed()) {
            alert('Please select some text to apply a link.');
            return;
        }

        const url = window.prompt('Enter URL:', 'https://');
        if (!url) {
            onEditorChange(RichUtils.toggleLink(editorState, selection, null));
            return;
        }
        
        const contentState = editorState.getCurrentContent();
        const contentStateWithEntity = contentState.createEntity(
            'LINK',
            'MUTABLE',
            { url }
        );
        const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
        const newEditorState = EditorState.set(editorState, { currentContent: contentStateWithEntity });
        
        onEditorChange(
            RichUtils.toggleLink(newEditorState, selection, entityKey)
        );
    };

    const currentStyle = editorState.getCurrentInlineStyle();

    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                {label}
            </label>
            <div className="border border-light-border dark:border-dark-border rounded-md focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
                <div className="flex items-center space-x-1 p-1 bg-light-border dark:bg-dark-border rounded-t-md border-b border-light-border dark:border-dark-border">
                    <ToolbarButton
                        onMouseDown={(e) => toggleInlineStyle(e, 'BOLD')}
                        title="Bold (Ctrl+B)"
                        active={currentStyle.has('BOLD')}
                    >
                        <span className="font-bold w-6">B</span>
                    </ToolbarButton>
                     <ToolbarButton
                        onMouseDown={(e) => toggleInlineStyle(e, 'ITALIC')}
                        title="Italic (Ctrl+I)"
                        active={currentStyle.has('ITALIC')}
                    >
                        <span className="italic w-6">I</span>
                    </ToolbarButton>
                    <ToolbarButton
                        onMouseDown={promptForLink}
                        title="Insert Link"
                    >
                        <LinkIcon className="w-4 h-4 mx-1" />
                    </ToolbarButton>
                </div>
                <div
                    className="p-2 bg-light-background dark:bg-dark-background text-light-text dark:text-dark-text placeholder-light-subtle dark:placeholder-dark-subtle rounded-b-md"
                    style={{ minHeight: `${minHeight}px` }}
                    onClick={focusEditor}
                >
                    <Editor
                        ref={editorRef}
                        editorState={editorState}
                        onChange={onEditorChange}
                        handleKeyCommand={handleKeyCommand}
                        placeholder={placeholder}
                        spellCheck={true}
                    />
                </div>
            </div>
        </div>
    );
};

export default DraftJSEditor;