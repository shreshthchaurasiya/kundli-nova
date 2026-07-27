const fs = require('fs');
const file = 'src/screens/NovaAIChatScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add Supabase import
if (!content.includes("import { supabase } from '../lib/supabase';")) {
  content = content.replace("import { NormalizedCompatibilityContext } from '../types/matchingAiContext';", "import { NormalizedCompatibilityContext } from '../types/matchingAiContext';\nimport { supabase } from '../lib/supabase';");
}

// 2. Add State variables
if (!content.includes("const [selectedImage, setSelectedImage]")) {
  content = content.replace(
    "const autoAnalysisTriggeredRef = useRef(false);",
    `const autoAnalysisTriggeredRef = useRef(false);

  // Image attachment state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5242880) {
        alert('File size exceeds the 5MB limit.');
        return;
      }
      setSelectedImage(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
    if (e.target) e.target.value = '';
  };

  const clearImageSelection = () => {
    setSelectedImage(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
  };`
  );
}

// 3. Update handleSendMessage
const oldSend = `  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isTyping) return;

    const userText = inputText.trim();
    setInputText('');

    const userMsg: Message = {
      id: \`msg-\${Date.now()}\`,
      text: userText,
      sender: 'user',
      time: getFormattedTime(),
      type: 'text'
    };

    const newMsgsList = [...messages, userMsg];
    setMessages(newMsgsList);
    saveToHistory(currentConvId, currentTopic, newMsgsList);`;

const newSend = `  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedImage) || isTyping || isUploading) return;

    let attachmentUrl: string | undefined = undefined;

    if (selectedImage) {
      setIsUploading(true);
      try {
        const fileExt = selectedImage.name.split('.').pop();
        const fileName = \`ai-chat-\${Date.now()}-\${Math.random().toString(36).substring(7)}.\${fileExt}\`;
        const { error } = await supabase.storage
          .from('chat-attachments')
          .upload(fileName, selectedImage);
          
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(fileName);
          
        attachmentUrl = publicUrl;
      } catch (err) {
        console.error('Image upload failed', err);
        alert('Image upload failed. Please try again.');
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const userText = inputText.trim();
    setInputText('');
    clearImageSelection();

    const userMsg: Message = {
      id: \`msg-\${Date.now()}\`,
      text: userText,
      sender: 'user',
      time: getFormattedTime(),
      type: attachmentUrl ? 'image' : 'text',
      attachmentUrl
    };

    const newMsgsList = [...messages, userMsg];
    setMessages(newMsgsList);
    saveToHistory(currentConvId, currentTopic, newMsgsList);`;

content = content.replace(oldSend, newSend);

// 4. Update Message Bubble rendering for Image
const bubbleText = `                    <div className="text-[13.5px] sm:text-[14px] leading-[1.6] whitespace-pre-wrap font-medium">
                      {msg.text}
                    </div>`;
const bubbleImage = `                    {msg.attachmentUrl && (
                      <div className="mb-2 rounded-xl overflow-hidden border border-[#F3F4F6]/20 bg-black/5">
                        <img src={msg.attachmentUrl} alt="Attachment" className="max-w-full h-auto object-cover max-h-[300px]" />
                      </div>
                    )}
                    {msg.text && (
                      <div className="text-[13.5px] sm:text-[14px] leading-[1.6] whitespace-pre-wrap font-medium">
                        {msg.text}
                      </div>
                    )}`;
content = content.replace(bubbleText, bubbleImage);

// 5. Update Input Bar
const inputBarRegex = /<div className="bg-\[#FFFFFF\] px-\[20px\] py-\[12px\].*?<\/div>/s;
const inputBarHTML = `<div className="relative bg-[#FFFFFF] px-[16px] py-[12px] pb-[max(20px,env(safe-area-inset-bottom))] border-t border-[#F3F4F6] z-20 flex flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.01)] shrink-0">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImageSelect} 
          accept="image/jpeg, image/png, image/webp" 
          className="hidden" 
        />
        
        {imagePreviewUrl && (
          <div className="mb-3 flex items-start gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-2">
            <div className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden border border-neutral-200">
              <img src={imagePreviewUrl} alt="Preview" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={clearImageSelection}
                className="absolute -right-1 -top-1 bg-white rounded-full p-0.5 shadow-sm border border-neutral-200 text-neutral-500 hover:text-red-500 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex flex-1 flex-col justify-center h-16 text-xs text-neutral-500">
              <span className="font-semibold text-neutral-700 truncate max-w-[200px]">{selectedImage?.name}</span>
              <span>{(selectedImage?.size ? (selectedImage.size / 1024 / 1024).toFixed(2) : '0')} MB</span>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-[12px]">
          <form onSubmit={handleSendMessage} className="flex-1 flex items-center bg-[#F9FAFB] border border-[#F3F4F6] rounded-[24px] pr-[6px] pl-[12px]">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isTyping || isUploading}
              className="text-neutral-400 mr-2 p-1.5 hover:text-[#FF8A00] hover:bg-[#FF8A00]/10 rounded-full transition-colors disabled:opacity-50"
            >
              <Paperclip size={18} strokeWidth={2} />
            </button>
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask Nova AI..." 
              className="flex-1 bg-transparent border-none focus:outline-none text-[13.5px] sm:text-[14px] font-medium text-[#111827] placeholder:text-[#9CA3AF] h-[48px]"
            />
            
            <button 
              type="submit"
              disabled={(!inputText.trim() && !selectedImage) || isTyping || isUploading}
              className={\`w-[36px] h-[36px] rounded-full flex items-center justify-center shrink-0 transition-all \${
                (inputText.trim() || selectedImage) && !isTyping && !isUploading
                  ? 'bg-[#FF8A00] text-[#FFFFFF] shadow-[0_2px_8px_rgba(255,138,0,0.3)] active:scale-[0.96]' 
                  : 'bg-[#F3F4F6] text-[#9CA3AF]'
              }\`}
            >
              <Send size={15} strokeWidth={2.5} className="ml-[2.5px]" />
            </button>
          </form>
        </div>
      </div>`;

content = content.replace(inputBarRegex, inputBarHTML);

fs.writeFileSync(file, content);
console.log('Patched');
