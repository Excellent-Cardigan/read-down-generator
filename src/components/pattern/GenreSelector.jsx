import PropTypes from 'prop-types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function GenreSelector({ selectedGenre, onGenreChange, genreColors }) {
  return (
    <Select value={selectedGenre} onValueChange={onGenreChange}>
      <SelectTrigger className="pc-genre-selector w-full h-12 rounded-xl bg-card border border-border hover:bg-muted/50 focus:ring-2 focus:ring-muted-foreground focus:border-muted-foreground">
        <SelectValue placeholder="Select a genre" />
      </SelectTrigger>
      <SelectContent className="bg-card rounded-xl border border-border shadow-lg max-h-60">
        {Object.keys(genreColors).map((genre) => (
          <SelectItem 
            key={genre} 
            value={genre} 
            className="pc-genre-option rounded-lg hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground data-[state=checked]:bg-muted-foreground data-[state=checked]:text-background"
          >
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {genreColors[genre].slice(0, 3).map((color, i) => (
                  <div 
                    key={i} 
                    className="pc-genre-swatch w-3 h-3 rounded-full border" 
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span>{genre}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

GenreSelector.propTypes = {
  selectedGenre: PropTypes.string.isRequired,
  onGenreChange: PropTypes.func.isRequired,
  genreColors: PropTypes.objectOf(PropTypes.arrayOf(PropTypes.string)).isRequired,
};