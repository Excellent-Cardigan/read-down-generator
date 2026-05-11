import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExtractedColorsSuggestion({ colors, onUse, onAdd, onDismiss }) {
  if (!colors || colors.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-lg">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-sm">Colors Extracted</h3>
          <p className="text-xs text-gray-600">
            We found these dominant colors in your book covers
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {colors.map((color, index) => (
          <div
            key={index}
            className="w-12 h-12 rounded border border-gray-200 shadow-sm"
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={onUse} className="flex-1">
          Use These Colors
        </Button>
        <Button size="sm" variant="outline" onClick={onAdd} className="flex-1">
          Add to Palette
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          Ignore
        </Button>
      </div>
    </div>
  );
}
