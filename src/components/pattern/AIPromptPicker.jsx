import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function AIPromptPicker({ open, onOpenChange, prompts, colors = [], onSelect, isGenerating }) {
  const [selectedPromptId, setSelectedPromptId] = useState(null);

  const handleGenerate = () => {
    if (selectedPromptId) {
      onSelect(selectedPromptId, 'firefly');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Generate AI Background
          </DialogTitle>
          <DialogDescription>
            Choose from 7 proven atmospheric background prompts
          </DialogDescription>
        </DialogHeader>

        {colors.length > 0 && (
          <div className="flex items-center gap-2 mt-4 p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600 font-medium">Colors to use:</span>
            {colors.map((color, i) => (
              <div
                key={i}
                className="w-7 h-7 rounded border-2 border-white shadow-sm"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        )}

        <div className="space-y-3 mt-4">
          {prompts.map((prompt) => (
            <button
              key={prompt.id}
              onClick={() => setSelectedPromptId(prompt.id)}
              disabled={isGenerating}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                selectedPromptId === prompt.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              } ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex gap-4">
                {prompt.preview && (
                  <img
                    src={prompt.preview}
                    alt={prompt.name}
                    className="w-20 h-28 object-cover rounded shadow-sm flex-shrink-0"
                  />
                )}
                <div className="flex-1">
                  <div className="font-semibold text-sm mb-1">{prompt.name}</div>
                  <div className="text-xs text-gray-600">{prompt.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-2 mt-6">
          <Button
            onClick={handleGenerate}
            disabled={!selectedPromptId || isGenerating}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Background
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancel
          </Button>
        </div>

        {isGenerating && (
          <div className="text-xs text-center text-gray-500 mt-2">
            This may take 10-15 seconds...
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
