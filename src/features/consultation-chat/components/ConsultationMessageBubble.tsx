import React from 'react';
import { CheckCheck } from 'lucide-react';
import { Message } from '../../../types';

interface ConsultationMessageBubbleProps {
  message: Message;
  ownSender: 'user' | 'astrologer';
}

function formatMessageTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(date);
}

export default function ConsultationMessageBubble({ message, ownSender }: ConsultationMessageBubbleProps) {
  if (message.sender === 'system') {
    return (
      <div className="my-3 flex w-full justify-center px-4">
        <div className="max-w-[92%] rounded-full border border-orange-100 bg-orange-50/80 px-4 py-2 text-center text-[10px] font-semibold text-neutral-600">
          {message.text}
        </div>
      </div>
    );
  }

  const isOwn = message.sender === ownSender;
  return (
    <div className={`mb-3 flex w-full ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[82%] px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.035)] ${
        isOwn
          ? 'rounded-[20px] rounded-tr-md bg-neutral-900 text-white'
          : 'rounded-[20px] rounded-tl-md border border-neutral-100 bg-white text-neutral-800'
      }`}>
        <p className="whitespace-pre-wrap break-words text-[13.5px] font-medium leading-relaxed">{message.text}</p>
        <div className={`mt-1.5 flex items-center justify-end gap-1 ${isOwn ? 'text-white/55' : 'text-neutral-400'}`}>
          <span className="text-[9px] font-semibold">{formatMessageTime(message.time)}</span>
          {isOwn && <CheckCheck size={11} className="text-[#FF8A00]" />}
        </div>
      </div>
    </div>
  );
}
