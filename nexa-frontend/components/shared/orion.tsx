"use client";

import React, { useState, useEffect, useRef } from 'react';
import { API } from '@/app/api';
import { getAuthFromStorage } from '@/utils/authStorage';
import { TripPlanCard, BookingResultCard, type TripPlanData, type BookingResultData } from './orion-cards';
// --------------- SVG Icons for Premium Look (Lucide-React Style) ---------------

const Compass = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10"></circle>
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
    </svg>
);

const Ticket = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M2 9a3 3 0 0 1 0 6v1a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-1a3 3 0 0 1 0-6V8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
        <path d="M13 5v2"/>
        <path d="M13 17v2"/>
        <path d="M13 11v2"/>
    </svg>
);


const SquarePen = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"></path>
    </svg>
);

const X = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

const Send = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m22 2-7 20-4-9-9-4Z"></path>
        <path d="M22 2 11 13"></path>
    </svg>
);

// --------------- Loading Bubble Component ---------------
const LoadingBubble = () => (
    <div className="flex items-end gap-2 justify-start">
        <Compass className="w-6 h-6 text-gray-400 flex-shrink-0" />
        <div className="max-w-[80%] p-3 rounded-2xl rounded-bl-lg bg-gray-200">
            <div className="flex items-center justify-center space-x-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
            </div>
        </div>
    </div>
);

// --------------- Message Bubble Component ---------------
type Message = {
    id: number;
    sender: 'user' | 'orion';
} & (
    | { type: 'text'; text: string }
    | { type: 'trip-plan'; data: TripPlanData }
    | { type: 'booking-result'; data: BookingResultData }
);

const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
    if (message.sender === 'user') {
        return (
            <div className="flex items-end gap-2 justify-end">
                <div className="max-w-[80%] p-3 rounded-2xl bg-blue-500 text-white rounded-br-lg">
                    <p className="text-sm leading-relaxed">{message.type === 'text' ? message.text : ''}</p>
                </div>
            </div>
        );
    }

    // Orion messages
    return (
        <div className="flex items-start gap-2 justify-start">
            <Compass className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" />
            <div className="max-w-[85%]">
                {message.type === 'text' && (
                    <div className="p-3 rounded-2xl bg-gray-100 text-gray-800 rounded-bl-lg">
                        <p className="text-sm leading-relaxed">{message.text}</p>
                    </div>
                )}
                {message.type === 'trip-plan' && <TripPlanCard data={message.data} />}
                {message.type === 'booking-result' && <BookingResultCard data={message.data} />}
            </div>
        </div>
    );
};

// --------------- Orion Agent Component ---------------

const OrionAgent = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeMode, setActiveMode] = useState<'planner' | 'agent'>('planner');
    
    // Separate message histories for each mode
    const [plannerMessages, setPlannerMessages] = useState<Message[]>([
        { id: 1, type: 'text', text: "Hello! I'm Orion, your personal travel guide. How can I make your journey unforgettable today?", sender: 'orion' }
    ]);
    const [agentMessages, setAgentMessages] = useState<Message[]>([
        { id: 1, type: 'text', text: "Hello! I'm Orion, your booking agent. What can I book for you today?", sender: 'orion' }
    ]);
    
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Get current messages based on active mode
    const currentMessages = activeMode === 'planner' ? plannerMessages : agentMessages;
    const setCurrentMessages = activeMode === 'planner' ? setPlannerMessages : setAgentMessages;

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [currentMessages, isLoading, activeMode]);

    const toggleOpen = () => {
        if (isLoading) return;
        setIsOpen(!isOpen);
    };

    const handleModeChange = (mode: 'planner' | 'agent') => {
        if (isLoading || mode === activeMode) return;
        setActiveMode(mode);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim() === '' || isLoading) return;

        const newUserMessage: Message = {
            id: Date.now(),
            type: 'text',
            text: inputValue,
            sender: 'user'
        };

        setCurrentMessages((prev: Message[]) => [...prev, newUserMessage]);
        const query = inputValue;
        setInputValue('');
        setIsLoading(true);

        try {
            const auth = getAuthFromStorage();
            if (!auth || !auth.token) {
                throw new Error('Please log in to use Orion');
            }

            const apiUrl = activeMode === 'planner' ? API.TRIP_PLANNER : API.BOOKING_AGENT;

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'Authorization': `Token ${auth.token}`,
                'accept': 'application/json',
            };

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({ query }),
            });
            console.log("Orion API response status:", response);

            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                throw new Error(`API request failed with status ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log("Orion API response data:", result);
            if (activeMode === 'planner') {
                const newOrionMessage: Message = {
                    id: Date.now() + 1,
                    type: 'trip-plan',
                    data: result,
                    sender: 'orion'
                };
                setCurrentMessages((prev: Message[]) => [...prev, newOrionMessage]);
            } else {
                const newOrionMessage: Message = {
                    id: Date.now() + 1,
                    type: 'booking-result',
                    data: result,
                    sender: 'orion'
                };
                setCurrentMessages((prev: Message[]) => [...prev, newOrionMessage]);
            }

        } catch (error) {
            console.error("Error calling Orion API:", error);
            const errorMessage: Message = {
                id: Date.now() + 1,
                type: 'text',
                text: error instanceof Error ? error.message : "I'm sorry, I seem to be having trouble connecting. Please try again in a moment.",
                sender: 'orion'
            };
            setCurrentMessages((prev: Message[]) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleNewChat = () => {
        if (isLoading) return;
        
        // Reset both chat histories
        setPlannerMessages([
            { id: Date.now(), type: 'text', text: "Hello! I'm Orion, your personal travel guide. How can I make your journey unforgettable today?", sender: 'orion' }
        ]);
        setAgentMessages([
            { id: Date.now() + 1, type: 'text', text: "Hello! I'm Orion, your booking agent. What can I book for you today?", sender: 'orion' }
        ]);
    }

    return (
        <div className="fixed bottom-6 right-6 z-30 font-sans">
            {/* Chat Window */}
            {isOpen && (
                <div
                    className={`
                        w-[calc(100vw-48px)] max-w-md h-[100vh] max-h-[700px]
                        bg-white rounded-2xl shadow-2xl shadow-gray-900/10
                        flex flex-col
                        transition-all duration-500 ease-in-out
                        opacity-100 translate-y-0
                        ${isLoading ? 'cursor-wait' : ''}
                    `}
                >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-serif font-medium text-gray-800">Orion</h2>
                        <p className="text-xs text-gray-500">Your personal travel guide</p>
                    </div>
                    <div className="flex items-center space-x-1 text-gray-500">
                        <button onClick={handleNewChat} disabled={isLoading} className={`p-2 rounded-full hover:bg-gray-200/70 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 ${isLoading ? 'cursor-not-allowed opacity-50' : ''}`}>
                           <SquarePen className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Mode Switcher */}
                <div className="w-full p-2 bg-gray-100 border-b border-gray-200 flex-shrink-0">
                    <div className="relative flex w-full p-1 bg-gray-200 rounded-full">
                        <button
                            onClick={() => handleModeChange('planner')}
                            disabled={isLoading}
                            className={`relative flex-1 rounded-full py-1.5 text-sm font-medium transition-colors z-10 ${
                                activeMode === 'planner' ? 'text-white' : 'text-gray-500 hover:text-gray-700'
                            } ${isLoading ? 'cursor-not-allowed' : ''}`}
                        >
                            <span className="flex items-center justify-center space-x-2">
                                <Compass className="w-5 h-5" />
                                <span>Trip Planner</span>
                            </span>
                        </button>
                        <button
                            onClick={() => handleModeChange('agent')}
                            disabled={isLoading}
                            className={`relative flex-1 rounded-full py-1.5 text-sm font-medium transition-colors z-10 ${
                                activeMode === 'agent' ? 'text-white' : 'text-gray-500 hover:text-gray-700'
                            } ${isLoading ? 'cursor-not-allowed' : ''}`}
                        >
                            <span className="flex items-center justify-center space-x-2">
                                <Ticket className="w-5 h-5" />
                                <span>Booking Agent</span>
                            </span>
                        </button>
                        <div
                            className={`absolute top-1 left-1 h-[calc(100%-8px)] w-[calc(50%-4px)] bg-blue-500 rounded-full transition-transform duration-300 ease-in-out`}
                            style={{
                                transform: `translateX(${activeMode === 'planner' ? '0%' : '100%'})`,
                            }}
                        />
                    </div>
                </div>

                {/* Chat Body */}
                <div className="flex-grow p-4 overflow-y-auto space-y-4">
                    {currentMessages.map((msg: Message) => (
                        <MessageBubble key={msg.id} message={msg} />
                    ))}
                    {isLoading && <LoadingBubble />}
                    <div ref={chatEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-gray-200 flex-shrink-0">
                    <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={activeMode === 'planner' ? 'e.g., "Plan a trip to Agra"' : 'e.g., "Book a flight to HYD"'}
                            className="w-full bg-gray-100 border border-gray-200 rounded-full py-2.5 px-4 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                            disabled={isLoading}
                        />
                    </form>
                </div>
            </div>
            )}

            {/* Floating Toggle Button */}
            <button
                onClick={toggleOpen}
                disabled={isLoading}
                className={`
                    absolute bottom-0 right-0
                    w-16 h-16 bg-gradient-to-br from-white to-gray-100 rounded-full  
                    flex items-center justify-center text-gray-700
                    shadow-lg shadow-gray-400/30   
                    transition-all duration-300 ease-in-out transform
                    hover:scale-110 hover:shadow-xl focus:outline-none
                    focus:ring-4 focus:ring-blue-400/50
                    ${isLoading ? 'cursor-not-allowed opacity-50' : ''}
                `}
                aria-label="Toggle Orion Chat"
            >
                <div className="transition-transform duration-500 ease-in-out" style={{ transform: isOpen ? 'rotate(180deg) scale(0.75)' : 'rotate(0deg) scale(1)' }}>
                    {isOpen ? <X className="w-6 h-6" /> : <Compass className="w-7 h-7" />}
                </div>
            </button>
        </div>
    );
};
export default OrionAgent;