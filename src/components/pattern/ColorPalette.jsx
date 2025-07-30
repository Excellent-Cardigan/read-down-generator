
import React, { useState, useRef, useCallback } from 'react';
import { debounce } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Label } from '@/components/ui/label';

const ColorPalette = React.memo(function ColorPalette({ colors, setColors }) {
  const [newColor, setNewColor] = useState('#aabbcc');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [openSwatchIndex, setOpenSwatchIndex] = useState(null); // Track which swatch popover is open
  const [editingColor, setEditingColor] = useState(''); // For editing swatch color

  const addColor = () => {
    if (colors.length < 8 && newColor && !colors.includes(newColor)) {
      setColors([...colors, newColor]);
      setIsPopoverOpen(false);
    }
  };

  const removeColor = (colorToRemove) => {
    setColors(colors.filter(color => color !== colorToRemove));
  };

  // Debounced color update
  const debouncedSetColors = useRef(debounce(setColors, 200)).current;

  const handleSwatchColorChange = useCallback((index, value) => {
    const updatedColors = [...colors];
    updatedColors[index] = value;
    debouncedSetColors(updatedColors);
    setEditingColor(value);
  }, [colors, debouncedSetColors]);

  return (
    <div className="pc-color-palette space-y-2">
      {colors.length < 8 && (
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="pc-color-add-btn h-8 px-3 text-xs hover:bg-[#756f66] hover:text-white">
              <Plus className="w-3 h-3 mr-1" />
              Add Color
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4 space-y-3" align="end">
            <Label className="text-sm font-medium text-gray-700">Add Custom Color</Label>
            <div className="flex gap-2 items-center">
              <Input 
                type="color" 
                value={newColor}
                onChange={(e) => {
                  setNewColor(e.target.value);
                  // Optionally debounce addColor preview logic here if needed
                }}
                className="p-0 h-10 w-10 rounded-md border-0 cursor-pointer"
              />
              <Input 
                type="text" 
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="flex-grow h-10 rounded-md border border-gray-200 w-28"
                placeholder="#RRGGBB"
              />
            </div>
            <Button onClick={addColor} size="sm" className="w-full hover:bg-[#756f66] hover:text-white">
              <Plus className="h-4 w-4 mr-1" /> Add Color
            </Button>
          </PopoverContent>
        </Popover>
      )}
      
      <div className="flex flex-wrap items-center gap-2 p-2 bg-card rounded-xl border border-border min-h-[56px]">
        <AnimatePresence>
          {colors.map((color, idx) => (
            <motion.div
              key={color}
              layout
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2 }}
              className="pc-color-swatch relative group"
            >
              <Popover open={openSwatchIndex === idx} onOpenChange={(open) => {
                setOpenSwatchIndex(open ? idx : null);
                setEditingColor(color);
              }}>
                <PopoverTrigger asChild>
                  <div
                    className="w-10 h-10 rounded-full border-2 border-white shadow-sm cursor-pointer"
                    style={{ backgroundColor: color }}
                    title={color}
                    onClick={() => {
                      setOpenSwatchIndex(idx);
                      setEditingColor(color);
                    }}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4 space-y-3" align="end">
                  <Label className="text-sm font-medium text-gray-700">Edit Color</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="color"
                      value={editingColor}
                      onChange={e => handleSwatchColorChange(idx, e.target.value)}
                      className="p-0 h-10 w-10 rounded-md border-0 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={editingColor}
                      onChange={e => handleSwatchColorChange(idx, e.target.value)}
                      className="flex-grow h-10 rounded-md border border-gray-200 w-28"
                      placeholder="#RRGGBB"
                    />
                  </div>
                </PopoverContent>
              </Popover>
              <button
                onClick={() => removeColor(color)}
                className="pc-color-remove-btn absolute -top-1 -right-1 bg-gray-700 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
});
export default ColorPalette;
