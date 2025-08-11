import PropTypes from 'prop-types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SizeSelector({ sizes, collections, selectedSizeKey, setSelectedSizeKey }) {
  return (
    <Select value={selectedSizeKey} onValueChange={setSelectedSizeKey}>
      <SelectTrigger id="size-selector" className="pc-size-selector w-full h-12 rounded-xl bg-card border border-border hover:bg-muted/50 focus:ring-2 focus:ring-muted-foreground focus:border-muted-foreground">
        <SelectValue placeholder="Select a size" />
      </SelectTrigger>
      <SelectContent className="bg-card rounded-xl border border-border shadow-lg">
        <div className="p-2 text-xs font-medium text-muted-foreground">Collections</div>
        {Object.entries(collections).map(([key, collection]) => (
          <SelectItem 
            key={key} 
            value={key} 
            className="pc-size-option rounded-lg hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground data-[state=checked]:bg-muted-foreground data-[state=checked]:text-background"
          >
            {collection.name}
          </SelectItem>
        ))}
        <div className="p-2 mt-2 border-t border-border text-xs font-medium text-muted-foreground">Individual Sizes</div>
        {Object.entries(sizes).map(([key, size]) => (
          <SelectItem 
            key={key} 
            value={key} 
            className="pc-size-option rounded-lg hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground data-[state=checked]:bg-muted-foreground data-[state=checked]:text-background"
          >
            {size.name} ({size.width}x{size.height})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

SizeSelector.propTypes = {
  sizes: PropTypes.object.isRequired,
  collections: PropTypes.object.isRequired,
  selectedSizeKey: PropTypes.string.isRequired,
  setSelectedSizeKey: PropTypes.func.isRequired,
};