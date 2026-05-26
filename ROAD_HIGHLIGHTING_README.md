# Road Highlighting Feature for Hengefinder

## Overview

The road highlighting feature allows users to visualize streets that align with the sun's azimuth angle on any given date and time. This helps identify potential "henge" locations where streets create dramatic sun alignment effects.

## Features

### Core Functionality
- **Street Highlighting**: Automatically highlights streets that align with the sun's azimuth within a configurable tolerance
- **Real-time Updates**: Street highlights update automatically as you change the date or time of day
- **Interactive Controls**: Adjustable alignment tolerance, minimum street length, and road type filters
- **Performance Optimized**: Uses cached data with fallback to Overpass API

### User Controls
- **Enable/Disable**: Toggle street highlighting on/off
- **Alignment Tolerance**: Adjust how closely streets must align with the sun (1-15 degrees)
- **Minimum Street Length**: Filter out short streets (100-2000 meters)
- **Road Types**: Select which types of roads to include (Primary, Secondary, Tertiary, Residential, Trunk)

### Data Management
- **Cached Data**: Street data is cached in browser localStorage for fast loading
- **Caching**: Street data is cached in browser localStorage for 7 days
- **API Fallback**: Falls back to Overpass API for cities without cached data

## Technical Implementation

### Files Added/Modified

#### New Files
- `static/js/road_filter.js` - Core road filtering logic
- `static/css/road_filter.css` - Styling for road controls

#### Modified Files
- `templates/henge_near_me.html` - Added road highlighting UI controls
- `static/js/henge_near_me.js` - Integrated road filtering with map events

### Architecture

#### RoadFilter Module
The `RoadFilter` object manages all street highlighting functionality:

```javascript
const RoadFilter = {
    // State management
    streetData: null,
    filteredStreets: [],
    streetHighlights: null,
    
    // Configuration
    config: {
        minStreetLength: 500,
        maxStreetLength: 10000,
        alignmentTolerance: 5,
        debounceDelay: 300,
        roadTypes: ['primary', 'secondary', 'tertiary', 'residential', 'trunk']
    }
};
```

#### Data Flow
1. **City Selection**: When a city is selected, `RoadFilter.initializeForCity()` is called
2. **Data Loading**: Tries to load cached data first, then Overpass API
3. **Filtering**: Streets are filtered by azimuth range, length, type, and map bounds
4. **Visualization**: Filtered streets are highlighted on the map using Leaflet polylines

#### Performance Optimizations
- **Debouncing**: Map interactions are debounced to prevent excessive API calls
- **Bounds Filtering**: Only processes streets visible in the current map view
- **Street Limiting**: Limits to 1000 streets maximum for performance
- **Caching**: localStorage caching for improved performance

## Usage

### For Users
1. Select a city using the city input
2. Choose a date and time of day
3. Use the "Step 3: Street Highlighting" controls to:
   - Enable/disable street highlighting
   - Adjust alignment tolerance
   - Set minimum street length
   - Select road types to include
4. Watch as aligned streets are highlighted in orange on the map

### For Developers


#### Adding New Road Types
To include additional road types, modify the `roadTypes` array in `road_filter.js`:

```javascript
config: {
    roadTypes: ['primary', 'secondary', 'tertiary', 'residential', 'trunk', 'motorway']
}
```

#### Customizing Styling
Street highlight colors and styles can be modified in the `createStreetHighlights()` function:

```javascript
const polyline = L.polyline(
    street.geometry.map(point => [point.lat, point.lon]),
    {
        color: '#DC816E',        // Highlight color
        weight: 4,               // Line thickness
        opacity: 0.8,            // Line opacity
        className: 'street-highlight'
    }
);
```

## Data Format

### Preprocessed City Data
Each city data file contains:

```json
{
  "city": "Austin, TX, USA",
  "state": "TX",
  "population": 978908,
  "bounds": {
    "north": 30.4924,
    "south": 30.0420,
    "east": -97.4823,
    "west": -98.0039
  },
  "streets": [
    {
      "id": "way_12345",
      "name": "Congress Avenue",
      "type": "primary",
      "geometry": [
        {"lat": 30.2672, "lon": -97.7431},
        {"lat": 30.2680, "lon": -97.7420}
      ],
      "bearing": 28.5,
      "length": 1250.3,
      "osm_id": 12345
    }
  ],
  "metadata": {
    "processed_date": "2024-01-15",
    "total_streets": 21597,
    "data_source": "overpass_api"
  }
}
```

## Error Handling

The system includes comprehensive error handling:

- **Network Errors**: Graceful fallback from API to cached data
- **Data Validation**: Validates street geometry and filters invalid data
- **User Feedback**: Loading states and error messages in the UI
- **Performance Limits**: Automatic limiting of processed streets for performance

## Future Enhancements

Potential improvements for future versions:

1. **More Cities**: Improve caching for international cities
2. **Advanced Filtering**: Add filters for street width, traffic volume, etc.
3. **Street Clustering**: Group nearby aligned streets for better visualization
4. **Export Functionality**: Allow users to export highlighted street data
5. **Historical Data**: Show how street alignments change over time
6. **Mobile Optimization**: Improve mobile experience and touch interactions

## Troubleshooting

### Common Issues

1. **No Streets Highlighted**: Check if alignment tolerance is too strict or if no streets meet the length/type criteria
2. **Slow Loading**: Large cities may take time to load; data is cached for faster subsequent loads
3. **Missing Streets**: Some areas may have incomplete OpenStreetMap data
4. **Performance Issues**: Reduce the number of visible streets by increasing minimum length or limiting road types

### Debug Mode
Enable debug logging by opening browser console and looking for `RoadFilter` messages.
