import React, { useRef, useEffect, useState } from 'react';
import { Message, MessageRole } from '../types';

interface ChatMessageProps {
  message: Message;
  onPlayAudio?: (base64: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onPlayAudio }) => {
  const isUser = message.role === MessageRole.USER;
  
  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] md:max-w-[70%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
        
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
          isUser ? 'bg-slate-700 text-white' : 'bg-teal-600 text-white'
        }`}>
          {isUser ? 'ME' : 'A'}
        </div>

        {/* Bubble */}
        <div className={`relative px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
          isUser 
            ? 'bg-slate-800 text-slate-50 rounded-br-none' 
            : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
        }`}>
          <div className="whitespace-pre-wrap font-sans">{message.text}</div>
          
          {/* Grounding / Maps Links */}
          {message.groundingLinks && message.groundingLinks.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
               <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">References</span>
               <div className="flex flex-col gap-1">
                 {message.groundingLinks.map((link, i) => (
                   <a 
                    key={i} 
                    href={link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-teal-600 hover:underline flex items-center gap-1"
                   >
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                     View on Google Maps
                   </a>
                 ))}
               </div>
            </div>
          )}

          {/* Audio Player Control */}
          {!isUser && message.audioBase64 && (
            <button 
              onClick={() => onPlayAudio?.(message.audioBase64!)}
              className="mt-2 flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
              Play Voice
            </button>
          )}

          {/* Timestamp */}
          <div className={`text-[10px] mt-2 opacity-50 ${isUser ? 'text-slate-300' : 'text-slate-400'}`}>
            {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </div>
        </div>
      </div>
    </div>
  );
};