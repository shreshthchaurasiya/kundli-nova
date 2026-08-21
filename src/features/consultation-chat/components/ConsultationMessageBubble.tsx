import React from 'react';
import { CheckCheck } from 'lucide-react';
import { Message } from '../../../types';
import { supabase } from '../../../lib/supabase';

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

function ImageAttachment({ path }: { path: string }) {
  const [url, setUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    const fetchUrl = async () => {
      const now = Date.now();
      const cached = signedUrlCache.get(path);
      
      // Use cache if it's not expiring within the next 2 minutes
      if (cached && cached.expiresAt > now + 120000) {
        setUrl(cached.url);
        return;
      }
      
      try {
        // 15-minute short-lived signed URL
        const { data, error: err } = await supabase.storage.from('chat-attachments').createSignedUrl(path, 900);
        if (err || !data) throw err;
        
        if (active) {
          signedUrlCache.set(path, { url: data.signedUrl, expiresAt: now + 900 * 1000 });
          setUrl(data.signedUrl);
        }
      } catch (err) {
        if (active) setError(true);
      }
    };
    
    void fetchUrl();
    return () => { active = false; };
  }, [path]);

  if (error) {
    return (
      <div className="my-1 flex h-32 items-center justify-center rounded-lg bg-neutral-200 text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
        Image failed to load
      </div>
    );
  }
  
  if (!url) {
    return <div className="my-1 h-40 w-full animate-pulse rounded-lg bg-neutral-200/50 dark:bg-neutral-800" />;
  }
  
  return <img src={url} alt="Attachment" className="my-1 max-w-full rounded-lg object-cover" />;
}

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
        {message.type === 'image' && message.attachmentUrl && (
          <ImageAttachment path={message.attachmentUrl} />
        )}
        {message.text && (
          <p className="whitespace-pre-wrap break-words text-[13.5px] font-medium leading-relaxed">{message.text}</p>
        )}
        <div className={`mt-1.5 flex items-center justify-end gap-1 ${isOwn ? 'text-white/55' : 'text-neutral-400'}`}>
          <span className="text-[9px] font-semibold">{formatMessageTime(message.time)}</span>
          {isOwn && <CheckCheck size={11} className="text-[#FF8A00]" />}
        </div>
      </div>
    </div>
  );
}
