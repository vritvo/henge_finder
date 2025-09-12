// Global variables
let map = null;
let currentCityData = null;
let sunAnglesData = null;
let currentDayOfYear = 0;
let currentTimeOfDay = 'sunset';
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
    initializeTimeToggle();
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
    
    // Load city data and sun angles
    loadCityData(cityName);
}

// Time toggle functionality
function initializeTimeToggle() {
    const timeToggleInputs = document.querySelectorAll('input[name="timeOfDay"]');
    
    timeToggleInputs.forEach(input => {
        input.addEventListener('change', function() {
            if (this.checked) {
                currentTimeOfDay = this.value;
                
                // If we have a city loaded, reload the data with new time of day
                if (currentCityData && currentCityData.address) {
                    loadCityData(currentCityData.address, true); // true indicates this is a toggle change
                }
            }
        });
    });
}

// Load city data and calculate sun angles
async function loadCityData(cityName, isToggleChange = false) {
    const loading = document.getElementById('loadingHenge');
    const mapAndControls = document.getElementById('mapAndControls');
    
    if (isToggleChange) {
        // For toggle changes, show overlay loading instead of hiding map
        showMapLoadingOverlay();
    } else {
        // For initial city selection, hide map and show full loading
        loading.style.display = 'block';
        mapAndControls.style.display = 'none';
    }
    
    try {
        const response = await fetch('/lookup_sun_angles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                address: cityName,
                year: new Date().getFullYear(),
                time_of_day: currentTimeOfDay
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentCityData = data;
            sunAnglesData = data.sun_angles;
            
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
        if (isToggleChange) {
            hideMapLoadingOverlay();
        } else {
            loading.style.display = 'none';
        }
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
                
                // Lines will only be redrawn when new sun angles are loaded
            }
        }, 100);
        
    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

// Date slider functionality
function initializeDateSlider() {
    const dateSlider = document.getElementById('dateSlider');
    
    // Set slider to today's date using the same calculation as getDayOfYear
    const today = new Date();
    currentDayOfYear = getDayOfYear(today);
    dateSlider.value = currentDayOfYear;
    
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
    if (!sunAnglesData || !sunAnglesData[currentDayOfYear]) {
        document.getElementById('azimuthValue').textContent = '-';
        return;
    }
    
    const azimuth = sunAnglesData[currentDayOfYear].azimuth;
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
    if (!map || !currentCityData || !sunAnglesData || !ctx) {
        return;
    }
    
    if (!sunAnglesData[currentDayOfYear]) {
        return;
    }
    
    // Clear the entire canvas first
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const azimuth = sunAnglesData[currentDayOfYear].azimuth;
    
    // Set up canvas drawing style
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.6;
    ctx.setLineDash([10, 5]);
    
    // Draw exactly 7 parallel lines with the 4th line centered
    drawSevenAzimuthLines(azimuth);
    
    // Draw direction indicator
    drawDirectionIndicatorOnCanvas(azimuth);
    
    // Reset canvas state
    ctx.setLineDash([]);
    ctx.globalAlpha = 1.0;
}

// Draw exactly 7 azimuth lines with the 4th line centered
function drawSevenAzimuthLines(azimuth) {
    // Convert azimuth to radians, treating top of page as north (0°)
    // Azimuth is measured clockwise from north
    const azimuthRad = (azimuth * Math.PI) / 180;
    
    // Calculate the center of the canvas
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // The lines should be perpendicular to the azimuth direction
    // So we use the perpendicular angle for the line direction
    const lineAngle = azimuthRad + Math.PI / 2;
    
    // Fixed spacing between lines (in pixels)
    const lineSpacing = 80; // pixels between lines
    
    // Draw 7 lines with the 4th line (index 3) centered
    for (let i = 0; i < 7; i++) {
        // Calculate offset from center (4th line is at offset 0)
        const offset = (i - 3) * lineSpacing;
        
        // Calculate the offset point from center in the azimuth direction
        const offsetX = centerX + Math.cos(azimuthRad) * offset;
        const offsetY = centerY + Math.sin(azimuthRad) * offset;
        
        // Draw a line through this point perpendicular to the azimuth direction
        drawLineAcrossCanvas(offsetX, offsetY, lineAngle);
    }
}

// Draw a line across the canvas through a given point at a given angle
function drawLineAcrossCanvas(centerX, centerY, angleRad) {
    // Calculate line length to cover the entire canvas
    const lineLength = Math.max(canvas.width, canvas.height) * 1.5;
    
    // Calculate start and end points of the line
    const startX = centerX - Math.cos(angleRad) * lineLength / 2;
    const startY = centerY - Math.sin(angleRad) * lineLength / 2;
    const endX = centerX + Math.cos(angleRad) * lineLength / 2;
    const endY = centerY + Math.sin(angleRad) * lineLength / 2;
    
    // Draw the line
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
}

// Draw direction indicator on canvas
function drawDirectionIndicatorOnCanvas(azimuth) {
    if (!map || !currentCityData) return;
    
    // Convert azimuth to radians, treating top of page as north
    const azimuthRad = ((azimuth - 90) * Math.PI) / 180;
    
    // Calculate the center of the canvas
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Position the icon at a fixed distance from center in the azimuth direction
    const iconDistance = 350; // pixels from center
    const iconX = centerX + Math.cos(azimuthRad) * iconDistance;
    const iconY = centerY + Math.sin(azimuthRad) * iconDistance;
    
    // Draw the icon
    ctx.save();
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = '#DC816E';
    ctx.strokeStyle = '#DC816E';
    ctx.lineWidth = 2;
    
    const iconSize = 12;
    
    if (currentTimeOfDay === 'sunrise') {
        // Draw sunrise icon (sun with rays)
        drawSunriseIcon(iconX, iconY, iconSize);
    } else {
        // Draw sunset icon (sun without rays, or different style)
        drawSunsetIcon(iconX, iconY, iconSize);
    }
    
    ctx.restore();
}


// Draw azimuth lattice overlay on the map (now just triggers canvas redraw)
function drawAzimuthLattice() {
    if (!map || !currentCityData || !sunAnglesData || !sunAnglesData[currentDayOfYear]) {
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
    const start = new Date(date.getFullYear(), 0, 1); // January 1st
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

// Map loading overlay functions
function showMapLoadingOverlay() {
    const overlay = document.getElementById('mapLoadingOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

function hideMapLoadingOverlay() {
    const overlay = document.getElementById('mapLoadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}



// Draw sunrise icon (sun with rays and directional pointer)
function drawSunriseIcon(x, y, size) {
    // Draw the main circle
    ctx.beginPath();
    ctx.arc(x, y, size, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw rays
    const rayLength = size * 1.5;
    const numRays = 8;
    for (let i = 0; i < numRays; i++) {
        const angle = (i * 2 * Math.PI) / numRays;
        const startX = x + Math.cos(angle) * size;
        const startY = y + Math.sin(angle) * size;
        const endX = x + Math.cos(angle) * rayLength;
        const endY = y + Math.sin(angle) * rayLength;
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }
    
    // Draw directional pointer in the azimuth direction
    const azimuth = sunAnglesData[currentDayOfYear].azimuth;
    const pointerAngle = (azimuth * Math.PI) / 180;
    const pointerLength = size * 1.2;
    
    // Calculate pointer tip position
    const tipX = x + Math.cos(pointerAngle) * pointerLength;
    const tipY = y + Math.sin(pointerAngle) * pointerLength;
    
    // Draw triangular pointer
    const pointerWidth = size * 0.3;
    const baseX1 = x + Math.cos(pointerAngle - Math.PI/2) * pointerWidth;
    const baseY1 = y + Math.sin(pointerAngle - Math.PI/2) * pointerWidth;
    const baseX2 = x + Math.cos(pointerAngle + Math.PI/2) * pointerWidth;
    const baseY2 = y + Math.sin(pointerAngle + Math.PI/2) * pointerWidth;
    
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(baseX1, baseY1);
    ctx.lineTo(baseX2, baseY2);
    ctx.closePath();
    ctx.fill();
}

// Draw sunset icon (sun with directional pointer)
function drawSunsetIcon(x, y, size) {
    // Draw the main circle
    ctx.beginPath();
    ctx.arc(x, y, size, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw inner circle
    ctx.beginPath();
    ctx.arc(x, y, size * 0.7, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Draw directional pointer in the azimuth direction
    // The pointer should point in the direction of the sun's movement
    const azimuth = sunAnglesData[currentDayOfYear].azimuth;
    const pointerAngle = (azimuth * Math.PI) / 180;
    const pointerLength = size * 1.2;
    
    // Calculate pointer tip position
    const tipX = x + Math.cos(pointerAngle) * pointerLength;
    const tipY = y + Math.sin(pointerAngle) * pointerLength;
    
    // Draw triangular pointer
    const pointerWidth = size * 0.3;
    const baseX1 = x + Math.cos(pointerAngle - Math.PI/2) * pointerWidth;
    const baseY1 = y + Math.sin(pointerAngle - Math.PI/2) * pointerWidth;
    const baseX2 = x + Math.cos(pointerAngle + Math.PI/2) * pointerWidth;
    const baseY2 = y + Math.sin(pointerAngle + Math.PI/2) * pointerWidth;
    
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(baseX1, baseY1);
    ctx.lineTo(baseX2, baseY2);
    ctx.closePath();
    ctx.fill();
}
