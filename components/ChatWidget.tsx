
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useFirebase } from '../contexts/FirebaseContext';
import { useUI } from '../contexts/UIContext';
import { XIcon, ChevronDownIcon, ChevronUpIcon, PhoneIcon } from './Icons';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, doc, setDoc, updateDoc, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { ChatMessage } from '../types';

// Enhanced Icons specific to this component
const MessageSquareIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
);

const SendIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
    </svg>
);

type ChatState = 'minimised' | 'language_select' | 'type_select' | 'request_call' | 'live_chat';
type Language = 'en' | 'si';

const ChatWidget: React.FC = () => {
    const { supportSettings } = useNavigation();
    const { currentUser } = useAuth();
    const { fcmToken } = useFirebase();
    const { isChatWidgetOpen, setChatWidgetOpen } = useUI();
    const [viewState, setViewState] = useState<ChatState>('minimised');
    const [language, setLanguage] = useState<Language>('en');
    const [isExpanded, setIsExpanded] = useState(true);

    // Form States
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [requestSent, setRequestSent] = useState(false);

    // Live Chat States
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [chatId, setChatId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Listen to global open trigger
    useEffect(() => {
        if (isChatWidgetOpen) {
            initLiveChat();
            setIsExpanded(true);
        }
    }, [isChatWidgetOpen]);

    // Persistence Logic
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlChatId = params.get('chatId');

        if (urlChatId) {

            setChatId(urlChatId);
            localStorage.setItem('supportChatId', urlChatId);
        } else {
            const storedChatId = localStorage.getItem('supportChatId');
            if (storedChatId) setChatId(storedChatId);
        }
    }, []);

    // Persistence Logic (Backup for old session storage users - migration)
    useEffect(() => {
        const oldSessionId = sessionStorage.getItem('supportChatId');
        if (oldSessionId && !localStorage.getItem('supportChatId')) {
            localStorage.setItem('supportChatId', oldSessionId);
            setChatId(oldSessionId);
        }
    }, []);

    // Ensure token is linked to chat if available later
    useEffect(() => {
        if (chatId && fcmToken) {
            // Update the chat document with the latest FCM token to ensure push notifications work
            updateDoc(doc(db, 'supportChats', chatId), { fcmToken }).catch(err => { });
        }
    }, [chatId, fcmToken]);

    // Firebase Listener
    useEffect(() => {
        if (viewState === 'live_chat' && chatId) {
            const q = query(collection(db, 'supportChats', chatId, 'messages'), orderBy('timestamp', 'asc'));
            const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
                const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
                setMessages(msgs);
            });
            return () => unsubscribe();
        }
    }, [viewState, chatId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleClose = () => {
        setViewState('minimised');
        setIsExpanded(true);
        setChatWidgetOpen(false); // Reset global state
    };

    const handleLanguageSelect = (lang: Language) => {
        setLanguage(lang);
        setViewState('type_select');
    };

    const handleRequestCallSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, 'supportRequests'), {
                name,
                phone,
                language,
                timestamp: new Date().toISOString(),
                status: 'pending',
                userId: currentUser?.id || 'guest'
            });
            setRequestSent(true);
            setTimeout(() => handleClose(), 3000);
        } catch (error) {
            console.error("Error submitting request", error);
        }
    };

    const initLiveChat = async () => {
        let currentChatId = chatId;

        // Fallback: Check storage if state is empty (Race condition fix)
        if (!currentChatId) {
            currentChatId = localStorage.getItem('supportChatId');
            if (currentChatId) {
                setChatId(currentChatId);
                sessionStorage.setItem('supportChatId', currentChatId); // Keep session synced just in case
            }
        }

        if (!currentChatId) {
            currentChatId = uuidv4();
            setChatId(currentChatId);
            localStorage.setItem('supportChatId', currentChatId);

            await setDoc(doc(db, 'supportChats', currentChatId), {
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                status: 'active',
                language,
                userId: currentUser?.id || 'guest',
                fcmToken: fcmToken // Store token for push notifications
            });

            // Send initial greeting from Agent
            const greeting = language === 'si'
                ? "ආයුබෝවන්! මට ඔබට උදව් කළ හැක්කේ කෙසේද?"
                : "Hello! How can I help you today?";

            await addDoc(collection(db, 'supportChats', currentChatId, 'messages'), {
                text: greeting,
                sender: 'agent',
                timestamp: new Date().toISOString()
            });

        } else if (fcmToken) {
            // If chat exists, make sure token is updated
            updateDoc(doc(db, 'supportChats', currentChatId), { fcmToken }).catch(e => { });
        }
        setViewState('live_chat');
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !chatId) return;

        const messageText = inputText;
        setInputText('');

        try {
            await addDoc(collection(db, 'supportChats', chatId, 'messages'), {
                text: messageText,
                sender: 'user',
                timestamp: new Date().toISOString()
            });

            const TELEGRAM_BOT_URL = 'https://telegrambot-gde2vv2rxa-el.a.run.app/sendMessageToTelegram';
            await fetch(TELEGRAM_BOT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: chatId,
                    text: messageText,
                    userLanguage: language,
                    userId: currentUser?.id || 'Guest'
                })
            });
        } catch (error) {
            console.error("Error sending message", error);
        }
    };

    const translations = {
        en: {
            header: "Support", welcome: "How can we help you today?", reqCall: "Request a Call",
            liveChat: "Live Chat", name: "Name", phone: "Phone Number", submit: "Submit",
            sent: "Request sent! We will call you shortly.", typePlaceholder: "Type a message...",
            waiting: "An agent will be with you shortly."
        },
        si: {
            header: "සහාය", welcome: "අපට ඔබට කෙසේද උදව් කළ හැක්කේ?", reqCall: "ඇමතුමක් ඉල්ලන්න",
            liveChat: "සජීවී කතාබහ", name: "නම", phone: "දුරකථන අංකය", submit: "යවන්න",
            sent: "ඉල්ලීම යැව්වා! අපි ළඟදීම ඔබට කතා කරන්නෙමු.", typePlaceholder: "පණිවිඩයක් ලියන්න...",
            waiting: "නියෝජිතයෙකු ළඟදීම සම්බන්ධ වනු ඇත."
        }
    };

    const t = translations[language];

    if (!supportSettings.isEnabled) return null;

    // --- RENDER MINIMISED STATE ---
    if (viewState === 'minimised') {
        return (
            <div className="fixed bottom-20 md:bottom-8 right-6 z-[60] flex flex-col items-end group">
                {/* Notification Badge */}
                <span className="absolute flex h-4 w-4 -top-1 -right-1 z-[61]">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white"></span>
                </span>

                <button
                    onClick={() => setViewState('language_select')}
                    className="flex items-center p-4 bg-gradient-to-tr from-primary to-blue-500 text-white rounded-2xl shadow-xl hover:shadow-primary/40 transition-all duration-300 transform hover:scale-110 active:scale-95"
                    aria-label="Chat Now"
                >
                    <MessageSquareIcon className="w-8 h-8 group-hover:rotate-12 transition-transform duration-300" />
                    <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-3 transition-all duration-500 ease-in-out whitespace-nowrap font-bold">
                        Chat with us
                    </span>
                </button>
            </div>
        );
    }

    // --- RENDER EXPANDED WINDOW ---
    const windowClasses = isExpanded ? "w-[90vw] sm:w-96 h-[550px]" : "w-72 h-16";

    return (
        <div className={`fixed bottom-20 md:bottom-8 right-6 z-[60] bg-white dark:bg-dark-surface rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-200 dark:border-dark-border flex flex-col transition-all duration-500 ease-in-out ${windowClasses}`}>

            {/* Window Header */}
            <div
                className="flex items-center justify-between p-4 bg-gradient-to-r from-primary to-primary-dark text-white rounded-t-2xl flex-shrink-0 cursor-pointer shadow-md"
                onClick={() => !isExpanded && setIsExpanded(true)}
            >
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                        <MessageSquareIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm leading-tight">{t.header}</h3>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                            <span className="text-[10px] text-white/80 uppercase tracking-widest font-bold">Online</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                        {isExpanded ? <ChevronDownIcon className="w-5 h-5" /> : <ChevronUpIcon className="w-5 h-5" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleClose(); }} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Window Body */}
            {isExpanded && (
                <div className="flex-1 overflow-y-auto p-5 flex flex-col bg-slate-50/30 dark:bg-transparent">
                    {viewState === 'language_select' && (
                        <div className="flex flex-col gap-4 h-full justify-center">
                            <p className="text-center font-bold text-slate-600 dark:text-slate-300 mb-2">Select Language / භාෂාව තෝරන්න</p>
                            <button onClick={() => handleLanguageSelect('en')} className="p-4 bg-white dark:bg-dark-background border border-slate-200 dark:border-dark-border rounded-xl font-bold hover:border-primary hover:text-primary hover:shadow-md transition-all">English</button>
                            <button onClick={() => handleLanguageSelect('si')} className="p-4 bg-white dark:bg-dark-background border border-slate-200 dark:border-dark-border rounded-xl font-bold hover:border-primary hover:text-primary hover:shadow-md transition-all text-lg">සිංහල</button>
                        </div>
                    )}

                    {viewState === 'type_select' && (
                        <div className="flex flex-col gap-4 h-full justify-center">
                            <p className="text-center font-bold text-xl text-slate-800 dark:text-white mb-4">{t.welcome}</p>
                            <button onClick={() => setViewState('request_call')} className="group flex items-center gap-4 p-5 bg-white dark:bg-dark-background border border-slate-200 dark:border-dark-border rounded-2xl hover:border-primary hover:shadow-lg transition-all">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-primary rounded-xl group-hover:bg-primary group-hover:text-white transition-all">
                                    <PhoneIcon className="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold">{t.reqCall}</p>
                                    <p className="text-xs text-slate-500">Fast callback support</p>
                                </div>
                            </button>
                            <button onClick={initLiveChat} className="group flex items-center gap-4 p-5 bg-white dark:bg-dark-background border border-slate-200 dark:border-dark-border rounded-2xl hover:border-primary hover:shadow-lg transition-all">
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-xl group-hover:bg-green-600 group-hover:text-white transition-all">
                                    <MessageSquareIcon className="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold">{t.liveChat}</p>
                                    <p className="text-xs text-slate-500">Chat with an agent</p>
                                </div>
                            </button>
                        </div>
                    )}

                    {viewState === 'request_call' && (
                        <div className="h-full flex flex-col justify-center">
                            {requestSent ? (
                                <div className="text-center space-y-3 p-6 bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-900/30">
                                    <div className="inline-flex items-center justify-center w-12 h-12 bg-green-500 text-white rounded-full text-2xl">✓</div>
                                    <p className="font-bold text-green-700 dark:text-green-400">{t.sent}</p>
                                </div>
                            ) : (
                                <form onSubmit={handleRequestCallSubmit} className="space-y-4">
                                    <h4 className="font-bold text-center text-lg mb-2">{t.reqCall}</h4>
                                    <input
                                        type="text" placeholder={t.name} value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="w-full p-3 border rounded-xl dark:bg-dark-background dark:border-dark-border focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        required
                                    />
                                    <input
                                        type="tel" placeholder={t.phone} value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        className="w-full p-3 border rounded-xl dark:bg-dark-background dark:border-dark-border focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        required
                                    />
                                    <button type="submit" className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all transform active:scale-95">{t.submit}</button>
                                </form>
                            )}
                        </div>
                    )}

                    {viewState === 'live_chat' && (
                        <div className="flex flex-col h-full">
                            <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-1">
                                {messages.length === 0 && (
                                    <div className="text-center text-[12px] text-slate-400 dark:text-slate-500 mt-4 bg-slate-100/50 dark:bg-slate-800/50 p-2 rounded-lg italic">
                                        {t.waiting}
                                    </div>
                                )}
                                {messages.map((msg) => (
                                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm shadow-sm ${msg.sender === 'user'
                                            ? 'bg-primary text-white rounded-tr-none'
                                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-700'
                                            }`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                            <form onSubmit={handleSendMessage} className="flex gap-2 p-2 bg-white dark:bg-dark-background border border-slate-200 dark:border-dark-border rounded-2xl shadow-inner focus-within:border-primary transition-all">
                                <input
                                    type="text" value={inputText} onChange={e => setInputText(e.target.value)}
                                    placeholder={t.typePlaceholder}
                                    className="flex-1 bg-transparent px-2 py-1 focus:outline-none text-sm"
                                />
                                <button type="submit" disabled={!inputText.trim()} className="p-2.5 bg-primary text-white rounded-xl disabled:opacity-40 hover:scale-105 active:scale-95 transition-all">
                                    <SendIcon className="w-5 h-5" />
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ChatWidget;
