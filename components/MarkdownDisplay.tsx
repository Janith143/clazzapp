import React, { useMemo } from 'react';
import { Editor, EditorState, convertFromRaw, ContentState, CompositeDecorator } from 'draft-js';

// Declare globals from CDN scripts
declare var marked: {
    parse(markdown: string, options?: object): string;
};
declare var DOMPurify: {
    sanitize(dirty: string): string;
};

interface MarkdownDisplayProps {
    content: string;
    className?: string;
}

// Component to render LINK entities for Draft.js
const Link = (props: any) => {
    const { url } = props.contentState.getEntity(props.entityKey).getData();
    // Add protocol if missing for external links
    const href = (url && !url.startsWith('http')) ? `https://${url}` : url;
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            {props.children}
        </a>
    );
};

// Strategy to find LINK entities
const findLinkEntities = (contentBlock: any, callback: any, contentState: any) => {
    contentBlock.findEntityRanges(
        (character: any) => {
            const entityKey = character.getEntity();
            return (
                entityKey !== null &&
                contentState.getEntity(entityKey).getType() === 'LINK'
            );
        },
        callback
    );
};

const MarkdownDisplay: React.FC<MarkdownDisplayProps> = ({ content, className }) => {

    const isDraftJsContent = useMemo(() => {
        if (!content || typeof content !== 'string' || !content.startsWith('{')) return false;
        try {
            const parsed = JSON.parse(content);
            // A simple check for the Draft.js raw state structure
            return typeof parsed === 'object' && parsed !== null && Array.isArray(parsed.blocks) && 'entityMap' in parsed;
        } catch (e) {
            return false;
        }
    }, [content]);

    if (isDraftJsContent) {
        const editorState = useMemo(() => {
            try {
                // Decorator is needed to make links clickable in readOnly mode
                const decorator = new CompositeDecorator([{
                    strategy: findLinkEntities,
                    component: Link,
                }]);
                
                const rawContent = JSON.parse(content);
                const contentState = convertFromRaw(rawContent);
                return EditorState.createWithContent(contentState, decorator);
            } catch (e) {
                console.error("Error creating Draft.js state from raw content, falling back to plain text:", e);
                // Fallback for safety
                return EditorState.createWithContent(ContentState.createFromText(content));
            }
        }, [content]);

        const proseStyles = `prose prose-slate dark:prose-invert max-w-none prose-p:my-2`;

        return (
            <div className={`${proseStyles} ${className || ''}`}>
                <Editor
                    editorState={editorState}
                    onChange={() => {}} // onChange is required but a no-op for readOnly
                    readOnly={true}
                />
            </div>
        );
    }

    // Original Markdown rendering logic as a fallback for old content
    const sanitizedHtml = useMemo(() => {
        if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined' || !content) {
            const escapedContent = content ? String(content).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;') : '';
            return { __html: '<p>' + escapedContent.replace(/\\n/g, '<br />').replace(/\n/g, '<br />') + '</p>' };
        }
        
        // Process both literal and escaped newlines for markdown rendering
        const processedContent = content.replace(/\\n/g, '\n');
        // `breaks: true` tells marked to treat single newlines as <br> tags
        const rawHtml = marked.parse(processedContent, { gfm: true, breaks: true });
        
        const cleanHtml = DOMPurify.sanitize(rawHtml);
        return { __html: cleanHtml };
    }, [content]);

    const proseStyles = `
        prose 
        prose-slate 
        dark:prose-invert 
        max-w-none 
        prose-p:leading-relaxed 
        prose-p:my-2
        prose-headings:my-2 
        prose-a:text-primary 
        prose-a:no-underline 
        hover:prose-a:underline
    `;

    return (
        <div
            className={`${proseStyles} ${className || ''}`}
            dangerouslySetInnerHTML={sanitizedHtml}
        />
    );
};

export default MarkdownDisplay;
