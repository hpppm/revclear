export default function ThinkingIndicator({ message = "AI is thinking..." }) {
    return (
        <div className="flex flex-col items-center justify-center p-6 space-y-4 bg-blue-50/50 rounded-lg border border-blue-100">
            <div className="relative">
                <div className="absolute inset-0 bg-blue-400 rounded-full blur-xl opacity-20 animate-pulse-glow"></div>
                <div className="relative text-4xl animate-bounce">
                    🤖
                </div>
            </div>
            <div className="flex flex-col items-center space-y-2">
                <p className="text-sm font-medium text-blue-900 animate-pulse">
                    {message}
                </p>
                <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                </div>
            </div>
        </div>
    );
}
