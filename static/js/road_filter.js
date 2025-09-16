// Road Filtering Module for Henge Finder
// Global state management for street highlighting functionality

const RoadFilter = {
    // State variables
    streetData: null,
    filteredStreets: [],
    streetHighlights: null,
    debounceTimer: null,
    currentBounds: null,
    azimuthRange: { min: 0, max: 360 },
    isEnabled: true,
    
    // Configuration
    config: {
        minStreetLength: 200, // meters
        maxStreetLength: 10000, // meters
        alignmentTolerance: .5, // degrees
        debounceDelay: 300, // milliseconds
        roadTypes: ['primary', 'secondary', 'tertiary', 'residential', 'trunk', 'motorway', 'unclassified', 'service'],
        overpassUrl: 'https://overpass-api.de/api/interpreter'
    },
    
    // Initialize road filtering for a city
    initializeForCity: function(coordinates, sunAnglesData) {
        console.log('Initializing road filter for city:', coordinates);
        this.currentBounds = this.calculateBounds(coordinates.lat, coordinates.lon, 25); // 25km radius
        this.showLoadingState();
        this.loadStreetData();
    },
    
    // Calculate bounding box for a city
    calculateBounds: function(lat, lon, radiusKm) {
        const latDelta = radiusKm / 111.0;
        const lonDelta = radiusKm / (111.0 * Math.cos(Math.PI * lat / 180));
        
        return {
            north: lat + latDelta,
            south: lat - latDelta,
            east: lon + lonDelta,
            west: lon - lonDelta
        };
    },
    
    // Load street data (try cached first, then Overpass API)
    loadStreetData: function() {
        const cityName = this.getCurrentCityName();
        
        // Try to load cached data first
        const cachedData = this.getCachedData(cityName);
        if (cachedData) {
            console.log('Using cached street data for', cityName);
            this.streetData = cachedData;
            this.hideLoadingState();
            this.updateStreetHighlights();
        } else {
            console.log('Fetching street data from Overpass API for', cityName);
            this.fetchStreetDataFromAPI();
        }
    },
    
    // Get current city name from global state
    getCurrentCityName: function() {
        return currentCityData ? currentCityData.address : 'Unknown City';
    },
    
    
    // Get cached data from localStorage
    getCachedData: function(cityName) {
        try {
            const cacheKey = `henge_streets_${cityName.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const data = JSON.parse(cached);
                // Check if cache is less than 7 days old
                const cacheAge = Date.now() - data.timestamp;
                if (cacheAge < 7 * 24 * 60 * 60 * 1000) {
                    return data.streets;
                }
            }
        } catch (e) {
            console.warn('Error reading cached data:', e);
        }
        return null;
    },
    
    // Cache data to localStorage
    cacheData: function(cityName, streets) {
        try {
            const cacheKey = `henge_streets_${cityName.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const data = {
                streets: streets,
                timestamp: Date.now()
            };
            localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch (e) {
            console.warn('Error caching data:', e);
        }
    },
    
    // Fetch street data from Overpass API
    fetchStreetDataFromAPI: function() {
        if (!this.currentBounds) return;
        
        const query = this.buildOverpassQuery();
        
        fetch(this.config.overpassUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `data=${encodeURIComponent(query)}`
        })
        .then(response => response.json())
        .then(data => {
            const processedStreets = this.processOverpassData(data);
            this.streetData = processedStreets;
            
            // Cache the data
            const cityName = this.getCurrentCityName();
            this.cacheData(cityName, processedStreets);
            
            this.hideLoadingState();
            this.updateStreetHighlights();
            this.updateStats();
        })
        .catch(error => {
            console.error('Error fetching street data:', error);
            this.hideLoadingState();
            this.showError('Failed to load street data. Please try again.');
        });
    },
    
    // Build Overpass API query
    buildOverpassQuery: function() {
        const bounds = this.currentBounds;
        return `
[out:json][timeout:60];
(
  way["highway"~"^(primary|secondary|tertiary|residential|trunk|motorway|unclassified|service)$"]
  ["name"]
  (${bounds.south},${bounds.west},${bounds.north},${bounds.east});
);
out geom;
        `.trim();
    },
    
    // Process Overpass API response
    processOverpassData: function(data) {
        const streets = [];
        
        if (!data.elements) return streets;
        
        data.elements.forEach(way => {
            const processed = this.processStreetGeometry(way);
            if (processed && processed.length > 100) { // Filter out very short streets
                streets.push(processed);
            }
        });
        
        console.log(`Processed ${streets.length} streets from Overpass API`);
        return streets;
    },
    
    // Process a single street way into our format
    processStreetGeometry: function(way) {
        const geometry = way.geometry || [];
        if (geometry.length < 2) return null;
        
        // Calculate bearing from first to last point
        const start = geometry[0];
        const end = geometry[geometry.length - 1];
        const bearing = this.calculateBearing(start.lat, start.lon, end.lat, end.lon);
        
        // Calculate total length
        let totalLength = 0;
        for (let i = 0; i < geometry.length - 1; i++) {
            const current = geometry[i];
            const next = geometry[i + 1];
            totalLength += this.calculateDistance(
                current.lat, current.lon,
                next.lat, next.lon
            );
        }
        
        return {
            id: `way_${way.id}`,
            name: way.tags?.name || 'Unnamed Street',
            type: way.tags?.highway || 'unknown',
            geometry: geometry.map(point => ({ lat: point.lat, lon: point.lon })),
            bearing: Math.round(bearing * 10) / 10,
            length: Math.round(totalLength * 10) / 10,
            osm_id: way.id
        };
    },
    
    // Calculate bearing between two points
    calculateBearing: function(lat1, lon1, lat2, lon2) {
        const lat1Rad = Math.PI * lat1 / 180;
        const lat2Rad = Math.PI * lat2 / 180;
        const deltaLon = Math.PI * (lon2 - lon1) / 180;
        
        const y = Math.sin(deltaLon) * Math.cos(lat2Rad);
        const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
                  Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLon);
        
        const bearing = Math.atan2(y, x);
        return (bearing * 180 / Math.PI + 360) % 360;
    },
    
    // Calculate distance between two points in meters
    calculateDistance: function(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Earth's radius in meters
        const lat1Rad = Math.PI * lat1 / 180;
        const lat2Rad = Math.PI * lat2 / 180;
        const deltaLat = Math.PI * (lat2 - lat1) / 180;
        const deltaLon = Math.PI * (lon2 - lon1) / 180;
        
        const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                  Math.cos(lat1Rad) * Math.cos(lat2Rad) *
                  Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        
        return R * c;
    },
    
    // Update street highlights based on current azimuth
    updateHighlightsForAzimuth: function(azimuth) {
        if (!this.isEnabled || !this.streetData) {
            console.log('Cannot update highlights: enabled=', this.isEnabled, 'streetData=', !!this.streetData);
            return;
        }
        
        console.log('Updating highlights for azimuth:', azimuth);
        
        this.azimuthRange = {
            min: azimuth - this.config.alignmentTolerance,
            max: azimuth + this.config.alignmentTolerance
        };
        
        this.updateStreetHighlights();
    },
    
    // Update street highlights
    updateStreetHighlights: function() {
        if (!this.isEnabled || !this.streetData || !map) {
            console.log('Cannot update street highlights:', {
                enabled: this.isEnabled,
                hasStreetData: !!this.streetData,
                hasMap: !!map
            });
            return;
        }
        
        console.log('Updating street highlights...', {
            totalStreets: this.streetData.length,
            azimuthRange: this.azimuthRange
        });
        
        // Clear existing highlights
        this.clearStreetHighlights();
        
        // Filter streets
        this.filteredStreets = this.filterStreets();
        
        console.log(`Filtered ${this.filteredStreets.length} streets for highlighting`);
        
        // Create new highlights
        this.createStreetHighlights();
        
        // Update stats
        this.updateStats();
    },
    
    // Filter streets based on current criteria
    filterStreets: function() {
        if (!this.streetData) return [];
        
        let filtered = this.streetData;
        
        // Filter by azimuth range
        filtered = this.filterStreetsByAzimuthRange(filtered);
        
        // Filter by length
        filtered = this.filterStreetsByLength(filtered);
        
        // Filter by road type
        filtered = this.filterStreetsByType(filtered);
        
        // Filter by current map bounds
        filtered = this.filterStreetsByBounds(filtered);
        
        return filtered;
    },
    
    // Filter streets by azimuth range (checking both directions of the street)
    filterStreetsByAzimuthRange: function(streets) {
        const filtered = streets.filter(street => {
            const bearing = street.bearing;
            const sunAzimuth = (this.azimuthRange.min + this.azimuthRange.max) / 2;
            const tolerance = this.config.alignmentTolerance;
            
            // Check if street bearing matches sun azimuth (same direction)
            const sameDirectionDiff = Math.abs(bearing - sunAzimuth);
            const sameDirectionAligned = Math.min(sameDirectionDiff, 360 - sameDirectionDiff) <= tolerance;
            
            // Check if opposite bearing matches sun azimuth (opposite direction of same street)
            const oppositeBearing = (bearing + 180) % 360;
            const oppositeDirectionDiff = Math.abs(oppositeBearing - sunAzimuth);
            const oppositeDirectionAligned = Math.min(oppositeDirectionDiff, 360 - oppositeDirectionDiff) <= tolerance;
            
            return sameDirectionAligned || oppositeDirectionAligned;
        });
        
        // Debug: Check Zach Scott Street azimuth filtering
        const zachScottStreets = streets.filter(street => 
            street.name.toLowerCase().includes('zach') && 
            street.name.toLowerCase().includes('scott')
        );
        if (zachScottStreets.length > 0) {
            const zachScott = zachScottStreets[0];
            const bearing = zachScott.bearing;
            const sunAzimuth = (this.azimuthRange.min + this.azimuthRange.max) / 2;
            const tolerance = this.config.alignmentTolerance;
            
            const sameDirectionDiff = Math.abs(bearing - sunAzimuth);
            const sameDirectionAligned = Math.min(sameDirectionDiff, 360 - sameDirectionDiff) <= tolerance;
            
            const oppositeBearing = (bearing + 180) % 360;
            const oppositeDirectionDiff = Math.abs(oppositeBearing - sunAzimuth);
            const oppositeDirectionAligned = Math.min(oppositeDirectionDiff, 360 - oppositeDirectionDiff) <= tolerance;
            
            console.log(`Zach Scott Street azimuth check: bearing=${bearing}°, opposite=${oppositeBearing}°, sunAzimuth=${sunAzimuth}°, sameDirection=${sameDirectionAligned}, oppositeDirection=${oppositeDirectionAligned}`);
        }
        
        return filtered;
    },
    
    // Filter streets by length
    filterStreetsByLength: function(streets) {
        return streets.filter(street => 
            street.length >= this.config.minStreetLength && 
            street.length <= this.config.maxStreetLength
        );
    },
    
    // Filter streets by road type
    filterStreetsByType: function(streets) {
        const selectedTypes = this.getSelectedRoadTypes();
        return streets.filter(street => selectedTypes.includes(street.type));
    },
    
    // Get selected road types (now always returns all configured types)
    getSelectedRoadTypes: function() {
        return this.config.roadTypes;
    },
    
    // Filter streets by current map bounds
    filterStreetsByBounds: function(streets) {
        if (!map) return streets;
        
        const bounds = map.getBounds();
        const filtered = streets.filter(street => this.isStreetInBounds(street, bounds));
        
        // Debug: Check if Zach Scott Street is in bounds
        const zachScottStreets = streets.filter(street => 
            street.name.toLowerCase().includes('zach') && 
            street.name.toLowerCase().includes('scott')
        );
        if (zachScottStreets.length > 0) {
            const zachScott = zachScottStreets[0];
            const inBounds = this.isStreetInBounds(zachScott, bounds);
            console.log(`Zach Scott Street (${zachScott.name}): bearing=${zachScott.bearing}°, inBounds=${inBounds}`);
        }
        
        // Limit to 2000 streets for performance (increased to catch more streets)
        if (filtered.length > 2000) {
            console.log(`Limiting to 2000 streets for performance (${filtered.length} total in bounds)`);
            // Prioritize streets that are more likely to be aligned
            const sunAzimuth = (this.azimuthRange.min + this.azimuthRange.max) / 2;
            const sorted = filtered.sort((a, b) => {
                const aDiff = Math.min(Math.abs(a.bearing - sunAzimuth), Math.abs((a.bearing + 180) % 360 - sunAzimuth));
                const bDiff = Math.min(Math.abs(b.bearing - sunAzimuth), Math.abs((b.bearing + 180) % 360 - sunAzimuth));
                return aDiff - bDiff;
            });
            return sorted.slice(0, 2000);
        }
        
        return filtered;
    },
    
    // Check if a street is within map bounds
    isStreetInBounds: function(street, bounds) {
        return street.geometry.some(point => 
            bounds.contains([point.lat, point.lon])
        );
    },
    
    // Create street highlights on the map
    createStreetHighlights: function() {
        if (!map || this.filteredStreets.length === 0) return;
        
        // Store polylines directly instead of using layer group
        this.streetHighlights = [];
        
        this.filteredStreets.forEach(street => {
            // Debug: Log Zach Scott Street coordinates
            if (street.name.toLowerCase().includes('zach') && street.name.toLowerCase().includes('scott')) {
                console.log(`Creating highlight for ${street.name}:`, {
                    geometry: street.geometry.slice(0, 3), // Show first 3 points
                    bearing: street.bearing,
                    length: street.length,
                    mapCenter: map.getCenter(),
                    mapZoom: map.getZoom()
                });
            }
            
            // Create polyline coordinates
            const coordinates = street.geometry.map(point => [point.lat, point.lon]);
            
            // Create a polyline with explicit styling
            const polyline = L.polyline(coordinates, {
                color: '#DC816E',
                weight: 3,
                opacity: 0.8,
                className: 'street-highlight',
                interactive: true
            });
            
            // Add popup with street info
            polyline.bindPopup(`
                <div style="font-family: Arial, sans-serif;">
                    <strong>${street.name}</strong><br>
                    Type: ${street.type}<br>
                    Length: ${Math.round(street.length)}m<br>
                    Bearing: ${street.bearing}°
                </div>
            `);
            
            // Add polyline directly to map instead of layer group
            polyline.addTo(map);
            this.streetHighlights.push(polyline);
        });
        
        console.log(`Added ${this.filteredStreets.length} street highlights to map`);
    },
    
    // Clear existing street highlights
    clearStreetHighlights: function() {
        if (this.streetHighlights && map) {
            console.log('Clearing existing street highlights...');
            // Remove each polyline individually since we're not using a layer group
            this.streetHighlights.forEach(polyline => {
                map.removeLayer(polyline);
            });
            this.streetHighlights = [];
        }
    },
    
    // Update statistics display
    updateStats: function() {
        const totalElement = document.getElementById('totalStreets');
        const alignedElement = document.getElementById('alignedStreets');
        
        if (totalElement) {
            const total = this.streetData ? this.streetData.length : 0;
            totalElement.textContent = total.toLocaleString();
            
            // Add animation for value updates
            totalElement.classList.add('value-update');
            setTimeout(() => {
                totalElement.classList.remove('value-update');
            }, 300);
        }
        
        if (alignedElement) {
            const aligned = this.filteredStreets.length;
            alignedElement.textContent = aligned.toLocaleString();
            
            // Add animation for value updates
            alignedElement.classList.add('value-update');
            setTimeout(() => {
                alignedElement.classList.remove('value-update');
            }, 300);
        }
    },
    
    // Debounce map update
    debounceMapUpdate: function() {
        clearTimeout(RoadFilter.debounceTimer);
        RoadFilter.debounceTimer = setTimeout(() => {
            RoadFilter.updateForCurrentView();
        }, RoadFilter.config.debounceDelay);
    },
    
    // Update for current map view
    updateForCurrentView: function() {
        if (this.isEnabled && this.streetData) {
            console.log('Map view changed, updating street highlights...');
            console.log('Current map center:', map.getCenter());
            console.log('Current map zoom:', map.getZoom());
            console.log('Current map bounds:', map.getBounds());
            this.updateStreetHighlights();
        }
    },
    
    // Toggle road filtering on/off
    toggleEnabled: function(enabled) {
        this.isEnabled = enabled;
        if (enabled) {
            this.updateStreetHighlights();
        } else {
            this.clearStreetHighlights();
        }
    },
    
    // Show loading state
    showLoadingState: function() {
        const roadControls = document.querySelector('.road-controls');
        if (roadControls) {
            roadControls.classList.add('loading');
        }
        
        // Update stats to show loading
        const totalElement = document.getElementById('totalStreets');
        const alignedElement = document.getElementById('alignedStreets');
        
        if (totalElement) totalElement.textContent = 'Loading...';
        if (alignedElement) alignedElement.textContent = '...';
    },
    
    // Hide loading state
    hideLoadingState: function() {
        const roadControls = document.querySelector('.road-controls');
        if (roadControls) {
            roadControls.classList.remove('loading');
        }
    },
    
    // Show error message
    showError: function(message) {
        console.error('RoadFilter Error:', message);
        
        // Show error state in UI
        const roadControls = document.querySelector('.road-controls');
        if (roadControls) {
            roadControls.classList.add('error');
            setTimeout(() => {
                roadControls.classList.remove('error');
            }, 3000);
        }
        
        // Update stats to show error
        const totalElement = document.getElementById('totalStreets');
        const alignedElement = document.getElementById('alignedStreets');
        
        if (totalElement) totalElement.textContent = 'Error';
        if (alignedElement) alignedElement.textContent = '0';
    },
    
    // Clean up resources
    cleanup: function() {
        this.clearStreetHighlights();
        clearTimeout(this.debounceTimer);
        this.streetData = null;
        this.filteredStreets = [];
        this.currentBounds = null;
    }
};

// Initialize road filter controls when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Road filter is now always enabled with default settings
    // No UI controls needed
});
