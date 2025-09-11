// Global variables
let map = null;
let currentCityData = null;
let sunsetAnglesData = null;
let currentDayOfYear = 0;
let azimuthLattice = null;
let canvas = null;
let canvasOverlay = null;
let ctx = null;

// Popular cities for typeahead suggestions
const popularCities = [
    "New York, NY, USA",
    "Los Angeles, CA, USA", 
    "Chicago, IL, USA",
    "Houston, TX, USA",
    "Phoenix, AZ, USA",
    "Philadelphia, PA, USA",
    "San Antonio, TX, USA",
    "San Diego, CA, USA",
    "Dallas, TX, USA",
    "San Jose, CA, USA",
    "Austin, TX, USA",
    "Jacksonville, FL, USA",
    "Fort Worth, TX, USA",
    "Columbus, OH, USA",
    "Charlotte, NC, USA",
    "San Francisco, CA, USA",
    "Indianapolis, IN, USA",
    "Seattle, WA, USA",
    "Denver, CO, USA",
    "Washington, DC, USA",
    "Boston, MA, USA",
    "El Paso, TX, USA",
    "Nashville, TN, USA",
    "Detroit, MI, USA",
    "Oklahoma City, OK, USA",
    "Portland, OR, USA",
    "Las Vegas, NV, USA",
    "Memphis, TN, USA",
    "Louisville, KY, USA",
    "Baltimore, MD, USA",
    "Milwaukee, WI, USA",
    "Albuquerque, NM, USA",
    "Tucson, AZ, USA",
    "Fresno, CA, USA",
    "Sacramento, CA, USA",
    "Mesa, AZ, USA",
    "Kansas City, MO, USA",
    "Atlanta, GA, USA",
    "Long Beach, CA, USA",
    "Colorado Springs, CO, USA",
    "Raleigh, NC, USA",
    "Miami, FL, USA",
    "Virginia Beach, VA, USA",
    "Omaha, NE, USA",
    "Oakland, CA, USA",
    "Minneapolis, MN, USA",
    "Tulsa, OK, USA",
    "Arlington, TX, USA",
    "Tampa, FL, USA",
    "New Orleans, LA, USA",
    "London, UK",
    "Paris, France",
    "Tokyo, Japan",
    "Sydney, Australia",
    "Toronto, Canada",
    "Berlin, Germany",
    "Madrid, Spain",
    "Rome, Italy",
    "Amsterdam, Netherlands",
    "Barcelona, Spain",
    "Vienna, Austria",
    "Prague, Czech Republic",
    "Stockholm, Sweden",
    "Copenhagen, Denmark",
    "Oslo, Norway",
    "Helsinki, Finland",
    "Dublin, Ireland",
    "Edinburgh, UK",
    "Manchester, UK",
    "Birmingham, UK",
    "Glasgow, UK",
    "Liverpool, UK",
    "Leeds, UK",
    "Sheffield, UK",
    "Bristol, UK",
    "Newcastle, UK",
    "Nottingham, UK",
    "Leicester, UK",
    "Coventry, UK",
    "Bradford, UK",
    "Cardiff, UK",
    "Belfast, UK",
    "Zurich, Switzerland",
    "Geneva, Switzerland",
    "Brussels, Belgium",
    "Antwerp, Belgium",
    "Ghent, Belgium",
    "Bruges, Belgium",
    "Rotterdam, Netherlands",
    "The Hague, Netherlands",
    "Utrecht, Netherlands",
    "Eindhoven, Netherlands",
    "Groningen, Netherlands",
    "Tilburg, Netherlands",
    "Almere, Netherlands",
    "Breda, Netherlands",
    "Nijmegen, Netherlands",
    "Enschede, Netherlands",
    "Haarlem, Netherlands",
    "Arnhem, Netherlands",
    "Zaanstad, Netherlands",
    "Amersfoort, Netherlands",
    "Apeldoorn, Netherlands",
    "Hoofddorp, Netherlands",
    "Maastricht, Netherlands",
    "Leiden, Netherlands",
    "Dordrecht, Netherlands",
    "Zoetermeer, Netherlands",
    "Zwolle, Netherlands",
    "Deventer, Netherlands",
    "Delft, Netherlands",
    "Vlaardingen, Netherlands",
    "Schiedam, Netherlands",
    "Katwijk, Netherlands",
    "Emmen, Netherlands",
    "Westland, Netherlands",
    "Venlo, Netherlands",
    "Leeuwarden, Netherlands",
    "Hilversum, Netherlands",
    "Amstelveen, Netherlands",
    "Purmerend, Netherlands",
    "Alkmaar, Netherlands",
    "Nieuwegein, Netherlands",
    "Capelle aan den IJssel, Netherlands",
    "Spijkenisse, Netherlands",
    "Helmond, Netherlands",
    "Velsen, Netherlands",
    "Hengelo, Netherlands",
    "Vlaardingen, Netherlands",
    "Roosendaal, Netherlands",
    "Diemen, Netherlands",
    "Krimpen aan den IJssel, Netherlands",
    "Oss, Netherlands",
    "Schagen, Netherlands",
    "Lelystad, Netherlands",
    "Alphen aan den Rijn, Netherlands",
    "Hoorn, Netherlands",
    "Vianen, Netherlands",
    "Woerden, Netherlands",
    "Heerhugowaard, Netherlands",
    "Rijswijk, Netherlands",
    "Middelburg, Netherlands",
    "Emmeloord, Netherlands",
    "Zwijndrecht, Netherlands",
    "Ridderkerk, Netherlands",
    "Soest, Netherlands",
    "Bergen op Zoom, Netherlands",
    "Kerkrade, Netherlands",
    "Hardinxveld-Giessendam, Netherlands",
    "Gouda, Netherlands",
    "Driebergen-Rijsenburg, Netherlands",
    "Heemstede, Netherlands",
    "Uithoorn, Netherlands",
    "Veghel, Netherlands",
    "Zeist, Netherlands",
    "Hardenberg, Netherlands",
    "Oosterhout, Netherlands",
    "Tiel, Netherlands",
    "Nijkerk, Netherlands",
    "Apeldoorn, Netherlands",
    "Ede, Netherlands",
    "Doetinchem, Netherlands",
    "Terneuzen, Netherlands",
    "Kampen, Netherlands",
    "Heerlen, Netherlands",
    "Sittard, Netherlands",
    "Venray, Netherlands",
    "Roermond, Netherlands",
    "Weert, Netherlands",
    "Sittard-Geleen, Netherlands",
    "Brunssum, Netherlands",
    "Landgraaf, Netherlands",
    "Kerkrade, Netherlands",
    "Heerlen, Netherlands",
    "Sittard, Netherlands",
    "Venlo, Netherlands",
    "Roermond, Netherlands",
    "Weert, Netherlands",
    "Sittard-Geleen, Netherlands",
    "Brunssum, Netherlands",
    "Landgraaf, Netherlands",
    "Kerkrade, Netherlands"
];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    initializeCityInput();
    initializeDateSlider();
    
    // Set today's date as default
    const today = new Date();
    currentDayOfYear = getDayOfYear(today);
    document.getElementById('dateSlider').value = currentDayOfYear;
    updateDateDisplay();
});

// City input with typeahead functionality
function initializeCityInput() {
    const cityInput = document.getElementById('cityInput');
    const suggestions = document.getElementById('suggestions');
    
    cityInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        
        if (query.length < 2) {
            suggestions.style.display = 'none';
            return;
        }
        
        const filteredCities = popularCities.filter(city => 
            city.toLowerCase().includes(query)
        ).slice(0, 10); // Limit to 10 suggestions
        
        if (filteredCities.length > 0) {
            suggestions.innerHTML = filteredCities.map(city => 
                `<div class="suggestion-item" onclick="selectCity('${city}')">${city}</div>`
            ).join('');
            suggestions.style.display = 'block';
        } else {
            suggestions.style.display = 'none';
        }
    });
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (!cityInput.contains(e.target) && !suggestions.contains(e.target)) {
            suggestions.style.display = 'none';
        }
    });
    
    // Handle Enter key
    cityInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = this.value.trim();
            if (query) {
                selectCity(query);
            }
        }
    });
}

function selectCity(cityName) {
    document.getElementById('cityInput').value = cityName;
    document.getElementById('suggestions').style.display = 'none';
    
    // Load city data and sunset angles
    loadCityData(cityName);
}

// Load city data and calculate sunset angles
async function loadCityData(cityName) {
    const loading = document.getElementById('loadingHenge');
    const mapAndControls = document.getElementById('mapAndControls');
    
    loading.style.display = 'block';
    mapAndControls.style.display = 'none';
    
    try {
        const response = await fetch('/lookup_sunset_angles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                address: cityName,
                year: new Date().getFullYear()
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentCityData = data;
            sunsetAnglesData = data.sunset_angles;
            
            // Clear canvas before initializing map for new city
            if (ctx && canvas) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            
            // Initialize map
            initializeMap(data.coordinates.lat, data.coordinates.lon);
            
            // Show controls
            mapAndControls.style.display = 'block';
            
            // Update azimuth display
            updateAzimuthDisplay();
            
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Network error. Please try again.');
    } finally {
        loading.style.display = 'none';
    }
}

// Initialize the map
function initializeMap(lat, lon) {
    const mapContainer = document.getElementById('hengeMap');
    
    // Clear existing map
    if (map) {
        map.remove();
    }
    
    // Ensure the map container is visible and has dimensions
    mapContainer.style.height = '500px';
    mapContainer.style.width = '100%';
    
    try {
        // Create new map
        map = L.map('hengeMap', {
            minZoom: 10,
            maxZoom: 18
        }).setView([lat, lon], 12);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        // Add city marker
        L.marker([lat, lon], {
            icon: L.divIcon({
                className: 'city-marker',
                html: '<div style="background-color: #DC816E; width: 20px; height: 20px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            })
        }).addTo(map);
        
        // Force map to invalidate size and redraw
        setTimeout(() => {
            if (map) {
                map.invalidateSize();
                
                // Create canvas overlay
                createCanvasOverlay();
                
                // Draw initial azimuth lattice after map is properly sized
                drawAzimuthLattice();
                
                // Add event listeners for map movement to update lattice
                map.on('moveend', drawAzimuthLattice);
                map.on('zoomend', drawAzimuthLattice);
            }
        }, 100);
        
    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

// Date slider functionality
function initializeDateSlider() {
    const dateSlider = document.getElementById('dateSlider');
    
    // Set slider to today's date (0-based day of year)
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24));
    currentDayOfYear = dayOfYear;
    dateSlider.value = dayOfYear;
    
    // Update displays
    updateDateDisplay();
    updateAzimuthDisplay();
    
    dateSlider.addEventListener('input', function() {
        currentDayOfYear = parseInt(this.value);
        updateDateDisplay();
        updateAzimuthDisplay();
        
        // Clear canvas and redraw lattice for new date
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        drawAzimuthLattice();
    });
}

function updateDateDisplay() {
    const dateDisplay = document.getElementById('dateDisplay');
    const selectedDate = document.getElementById('selectedDate');
    
    const date = getDateFromDayOfYear(currentDayOfYear);
    const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    dateDisplay.textContent = formattedDate;
    selectedDate.textContent = formattedDate;
}

function updateAzimuthDisplay() {
    if (!sunsetAnglesData || !sunsetAnglesData[currentDayOfYear]) {
        document.getElementById('azimuthValue').textContent = '-';
        return;
    }
    
    const azimuth = sunsetAnglesData[currentDayOfYear].azimuth;
    document.getElementById('azimuthValue').textContent = azimuth.toFixed(1);
}

// Create canvas overlay for drawing azimuth lines
function createCanvasOverlay() {
    if (!map) return;
    
    // Remove existing canvas overlay if it exists
    if (canvasOverlay) {
        map.removeLayer(canvasOverlay);
    }
    
    // Create custom Leaflet layer for canvas overlay
    canvasOverlay = L.layerGroup().addTo(map);
    
    // Create canvas element
    canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none'; // Allow map interaction through canvas
    canvas.style.zIndex = '1000';
    
    // Get canvas context
    ctx = canvas.getContext('2d');
    
    // Add canvas to map container
    const mapContainer = map.getContainer();
    mapContainer.appendChild(canvas);
    
    // Update canvas size
    updateCanvasSize();
    
    // Add event listeners for map changes
    map.on('moveend', updateCanvasSize);
    map.on('zoomend', updateCanvasSize);
    map.on('resize', updateCanvasSize);
}

// Update canvas size to match map container
function updateCanvasSize() {
    if (!canvas || !map) return;
    
    const container = map.getContainer();
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
    
    // Redraw the lattice
    drawAzimuthLatticeOnCanvas();
}

// Draw azimuth lattice on canvas
function drawAzimuthLatticeOnCanvas() {
    if (!map || !currentCityData || !sunsetAnglesData || !ctx) {
        return;
    }
    
    if (!sunsetAnglesData[currentDayOfYear]) {
        return;
    }
    
    // Clear the entire canvas first
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const azimuth = sunsetAnglesData[currentDayOfYear].azimuth;
    const bounds = map.getBounds();
    const center = map.getCenter();
    
    // Set up canvas drawing style
    ctx.strokeStyle = '#FF8C00'; // Sunset orange color
    ctx.lineWidth = 3; // Slightly thinner lines
    ctx.globalAlpha = 0.6; // More transparent
    ctx.setLineDash([10, 5]); // Longer dashes for better visibility
    
    // Create a continuous lattice using parallel lines approach
    // Calculate spacing based on zoom level - much larger spacing
    const zoom = map.getZoom();
    const baseSpacing = 0.1; // Much larger base spacing in degrees
    const spacing = baseSpacing * Math.pow(2, 10 - zoom); // Adjust spacing based on zoom
    
    // Get map bounds and extend them for better coverage
    const extendedBounds = {
        north: bounds.getNorth() + spacing,
        south: bounds.getSouth() - spacing,
        east: bounds.getEast() + spacing,
        west: bounds.getWest() - spacing
    };
    
    // Create parallel lines across the entire visible area
    drawParallelLines(extendedBounds, azimuth, spacing);
    
    // Reset canvas state
    ctx.setLineDash([]);
    ctx.globalAlpha = 1.0;
}

// Draw parallel lines across the map bounds
function drawParallelLines(bounds, azimuth, spacing) {
    // Calculate the perpendicular direction to the azimuth
    const perpAzimuth = (azimuth + 90) % 360;
    
    // Calculate how many lines we need
    const latRange = bounds.north - bounds.south;
    const lonRange = bounds.east - bounds.west;
    const diagonal = Math.sqrt(latRange * latRange + lonRange * lonRange);
    const numLines = Math.ceil(diagonal / spacing) + 2;
    
    // Create lines perpendicular to the azimuth direction
    for (let i = 0; i < numLines; i++) {
        // Calculate a point along the perpendicular direction
        const centerLat = (bounds.north + bounds.south) / 2;
        const centerLon = (bounds.east + bounds.west) / 2;
        
        // Offset the line position
        const offset = (i - numLines / 2) * spacing;
        const offsetPoint = turf.destination([centerLon, centerLat], offset * 111000, perpAzimuth, { units: 'meters' });
        
        // Draw a long line through this point in the azimuth direction
        drawLongLine(offsetPoint.geometry.coordinates[1], offsetPoint.geometry.coordinates[0], azimuth, bounds);
    }
}

// Draw a long line through a point in the azimuth direction
function drawLongLine(lat, lon, azimuth, bounds) {
    // Calculate line length to cover the entire visible area
    const latRange = bounds.north - bounds.south;
    const lonRange = bounds.east - bounds.west;
    const maxRange = Math.max(latRange, lonRange);
    const lineLength = maxRange * 1.5; // Make line longer than needed
    
    // Calculate start and end points
    const start = [lon, lat];
    const end1 = turf.destination(start, lineLength * 111000, azimuth, { units: 'meters' });
    const end2 = turf.destination(start, lineLength * 111000, (azimuth + 180) % 360, { units: 'meters' });
    
    // Convert to pixel coordinates
    const startPoint = map.latLngToContainerPoint([lat, lon]);
    const end1Point = map.latLngToContainerPoint([end1.geometry.coordinates[1], end1.geometry.coordinates[0]]);
    const end2Point = map.latLngToContainerPoint([end2.geometry.coordinates[1], end2.geometry.coordinates[0]]);
    
    // Draw the line
    ctx.beginPath();
    ctx.moveTo(end2Point.x, end2Point.y);
    ctx.lineTo(end1Point.x, end1Point.y);
    ctx.stroke();
}


// Draw azimuth lattice overlay on the map (now just triggers canvas redraw)
function drawAzimuthLattice() {
    if (!map || !currentCityData || !sunsetAnglesData || !sunsetAnglesData[currentDayOfYear]) {
        return;
    }
    
    // Remove existing Leaflet lattice if it exists
    if (azimuthLattice) {
        map.removeLayer(azimuthLattice);
        azimuthLattice = null;
    }
    
    // Redraw canvas
    drawAzimuthLatticeOnCanvas();
}

// Utility functions
function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

function getDateFromDayOfYear(dayOfYear) {
    const year = new Date().getFullYear();
    const date = new Date(year, 0, 1); // January 1st
    date.setDate(date.getDate() + dayOfYear); // Add the day of year to January 1st
    return date;
}
