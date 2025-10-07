// Mobile detection and blocking
function isMobileDevice() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;

    // Check for mobile user agents - this catches phones, tablets, etc.
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    const isMobileUserAgent = mobileRegex.test(userAgent.toLowerCase());

    // Check for touch-only devices (but exclude desktop touch screens)
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const hasMouseSupport = window.matchMedia('(pointer: fine)').matches;
    const isTouchOnly = isTouchDevice && !hasMouseSupport;

    // Block if mobile user agent OR touch-only device (excludes desktop touch screens)
    return isMobileUserAgent || isTouchOnly;
}

function initializeApp() {
    if (isMobileDevice()) {
        // Show mobile block, hide main content
        document.getElementById('mobileBlock').style.display = 'flex';
        document.getElementById('mainContainer').style.display = 'none';
        return;
    }

    // Hide mobile block, show main content
    document.getElementById('mobileBlock').style.display = 'none';
    document.getElementById('mainContainer').style.display = 'block';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeApp);

// Re-check on window resize (in case user rotates device or resizes browser)
window.addEventListener('resize', initializeApp);

let map = null;
let marker = null;
let currentAddress = null;
let currentCoordinates = null;
let originalBearing = 0;
let currentBearing = 0;
let originalZoom = 18;
let isInteractiveMode = false;
let isDragging = false;

// Unified arrow management
class ArrowManager {
    constructor(map) {
        this.map = map;
        this.arrowGroup = null;
        this.isInteractive = false;
    }

    createArrow(lat, lon, bearing, options = {}) {
        const {
            color = '#2A2B2A',
            weight = 4,
            opacity = 0.8,
            length = 100,
            interactive = false
        } = options;

        // Clear existing arrow
        this.clear();

        // Calculate arrow endpoint
        const start = [lon, lat];
        const destination = turf.destination(start, length, bearing, { units: 'meters' });
        const endLon = destination.geometry.coordinates[0];
        const endLat = destination.geometry.coordinates[1];

        // Create arrow line
        const arrowLine = L.polyline([[lat, lon], [endLat, endLon]], {
            color: color,
            weight: weight,
            opacity: opacity,
            className: interactive ? 'interactive-arrow' : ''
        });

        // Create arrowhead
        const arrowheadLines = this.createArrowhead(destination, bearing, color, weight, opacity);

        // Create handle if interactive
        let handle = null;
        if (interactive) {
            handle = L.marker([endLat, endLon], {
                icon: L.divIcon({
                    className: 'arrow-handle',
                    html: '<div style="background-color: #2A2B2A; width: 24px; height: 24px; border-radius: 50%; border: 3px solid #fff; cursor: grab;"></div>',
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                })
            });
        }

        // Group all elements
        this.arrowGroup = {
            line: arrowLine,
            arrowheads: arrowheadLines,
            handle: handle,
            center: [lat, lon],
            bearing: bearing,
            length: length
        };

        // Add to map
        arrowLine.addTo(this.map);
        arrowheadLines.forEach(line => line.addTo(this.map));
        if (handle) handle.addTo(this.map);

        this.isInteractive = interactive;
        return this.arrowGroup;
    }

    createArrowhead(destination, bearing, color, weight, opacity) {
        const arrowheadLength = 30;
        const arrowheadAngle = 30;

        const arrowhead1 = turf.destination(destination, arrowheadLength, bearing + 180 - arrowheadAngle, { units: 'meters' });
        const arrowhead2 = turf.destination(destination, arrowheadLength, bearing + 180 + arrowheadAngle, { units: 'meters' });

        const endLon = destination.geometry.coordinates[0];
        const endLat = destination.geometry.coordinates[1];

        const line1 = L.polyline([[endLat, endLon], [arrowhead1.geometry.coordinates[1], arrowhead1.geometry.coordinates[0]]], {
            color: color,
            weight: weight,
            opacity: opacity
        });

        const line2 = L.polyline([[endLat, endLon], [arrowhead2.geometry.coordinates[1], arrowhead2.geometry.coordinates[0]]], {
            color: color,
            weight: weight,
            opacity: opacity
        });

        return [line1, line2];
    }

    updateArrow(bearing, updateHandle = true) {
        if (!this.arrowGroup) return;

        const [lat, lon] = this.arrowGroup.center;
        const start = [lon, lat];
        const destination = turf.destination(start, this.arrowGroup.length, bearing, { units: 'meters' });
        const endLon = destination.geometry.coordinates[0];
        const endLat = destination.geometry.coordinates[1];

        // Update arrow line
        this.arrowGroup.line.setLatLngs([[lat, lon], [endLat, endLon]]);

        // Update arrowhead
        const newArrowheads = this.createArrowhead(destination, bearing,
            this.arrowGroup.line.options.color,
            this.arrowGroup.line.options.weight,
            this.arrowGroup.line.options.opacity);

        // Remove old arrowheads
        this.arrowGroup.arrowheads.forEach(line => this.map.removeLayer(line));

        // Add new arrowheads
        newArrowheads.forEach(line => line.addTo(this.map));
        this.arrowGroup.arrowheads = newArrowheads;

        // Update handle if not dragging
        if (updateHandle && this.arrowGroup.handle) {
            this.arrowGroup.handle.setLatLng([endLat, endLon]);
        }

        this.arrowGroup.bearing = bearing;
    }

    clear() {
        if (this.arrowGroup) {
            this.map.removeLayer(this.arrowGroup.line);
            this.arrowGroup.arrowheads.forEach(line => this.map.removeLayer(line));
            if (this.arrowGroup.handle) {
                this.map.removeLayer(this.arrowGroup.handle);
            }
            this.arrowGroup = null;
        }
    }

    addSunArrow(lat, lon, bearing, color = '#DC816E', length = 70) {
        // Calculate arrow endpoint
        const start = [lon, lat];
        const destination = turf.destination(start, length, bearing, { units: 'meters' });
        const endLon = destination.geometry.coordinates[0];
        const endLat = destination.geometry.coordinates[1];

        // Create arrow line with transparency
        const arrowLine = L.polyline([[lat, lon], [endLat, endLon]], {
            color: color,
            weight: 4,
            opacity: 0.8
        });

        // Create arrowhead
        const arrowheadLines = this.createArrowhead(destination, bearing, color, 4, 0.8);

        // Add to map
        arrowLine.addTo(this.map);
        arrowheadLines.forEach(line => line.addTo(this.map));

        return {
            line: arrowLine,
            arrowheads: arrowheadLines
        };
    }
}

let arrowManager = null;

// Function to display address lookup results
function displayAddressLookup(data) {
    const addressResultDiv = document.getElementById('addressResult');

    let html = `
                <p><span class="highlight">Address:</span> ${data.address}</p>
                <div class="coordinates">
                    <strong>Coordinates:</strong> ${data.coordinates.lat.toFixed(6)}, ${data.coordinates.lon.toFixed(6)}
                </div>
            `;

    addressResultDiv.innerHTML = html;
    addressResultDiv.className = 'result address';
    addressResultDiv.style.display = 'block';

    // Display the map with interactive arrow
    displayMap(data.coordinates.lat, data.coordinates.lon, data.road_bearing);
}

// Function to create and display the map
function displayMap(lat, lon, roadBearing) {
    const mapContainer = document.getElementById('mapContainer');
    mapContainer.style.display = 'block';

    // Store current data
    currentAddress = document.getElementById('address').value;
    currentCoordinates = { lat, lon };
    originalBearing = roadBearing;
    currentBearing = roadBearing;
    originalZoom = 18;

    // Update bearing display
    document.getElementById('bearingValue').textContent = `${roadBearing.toFixed(1)}°`;

    // Initialize map if it doesn't exist
    if (!map) {
        map = L.map('map', {
            minZoom: 16,
            maxZoom: 18
        }).setView([lat, lon], originalZoom);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        arrowManager = new ArrowManager(map);

        // Add event listeners for map interaction
        map.on('mousedown', onMapMouseDown);
        map.on('mousemove', onMapMouseMove);
        map.on('mouseup', onMapMouseUp);
    } else {
        map.setView([lat, lon], originalZoom);
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker || layer instanceof L.Polyline || layer instanceof L.Circle) {
                map.removeLayer(layer);
            }
        });
    }

    // Add marker for the address
    marker = L.marker([lat, lon], {
        icon: L.divIcon({
            className: 'address-marker',
            html: '<svg width="24" height="36" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.383 0 0 5.383 0 12c0 9 12 24 12 24s12-15 12-24c0-6.617-5.383-12-12-12zm0 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" fill="#2A2B2A"/></svg>',
            iconSize: [24, 36],
            iconAnchor: [12, 36]
        })
    }).addTo(map);

    // Create interactive arrow
    arrowManager.createArrow(lat, lon, roadBearing, { interactive: true });
    isInteractiveMode = true;
    isDragging = false;
}

// Mouse event handlers for arrow interaction
function onMapMouseDown(e) {
    if (!arrowManager || !arrowManager.arrowGroup || !arrowManager.isInteractive) return;

    const handleLatLng = arrowManager.arrowGroup.handle.getLatLng();
    const distance = map.distance(e.latlng, handleLatLng);

    if (distance < 80) {
        isDragging = true;
        document.body.classList.add('grabbing');

        // Remove handle during dragging
        map.removeLayer(arrowManager.arrowGroup.handle);
        arrowManager.arrowGroup.handle = null;

        e.originalEvent.stopPropagation();
        e.originalEvent.preventDefault();
        map.dragging.disable();
    }
}

function onMapMouseMove(e) {
    if (!isDragging || !arrowManager || !arrowManager.arrowGroup) return;

    e.originalEvent.stopPropagation();
    e.originalEvent.preventDefault();

    const [centerLat, centerLon] = arrowManager.arrowGroup.center;
    const mouseLat = e.latlng.lat;
    const mouseLon = e.latlng.lng;

    const start = [centerLon, centerLat];
    const end = [mouseLon, mouseLat];

    const bearing = (turf.bearing(start, end) + 360) % 360;

    currentBearing = bearing;
    arrowManager.updateArrow(currentBearing, false);
    document.getElementById('bearingValue').textContent = `${bearing.toFixed(1)}°`;
}

function onMapMouseUp() {
    if (isDragging && arrowManager && arrowManager.arrowGroup) {
        isDragging = false;
        document.body.classList.remove('grabbing');

        // Recreate handle
        const [lat, lon] = arrowManager.arrowGroup.center;
        const start = [lon, lat];
        const destination = turf.destination(start, arrowManager.arrowGroup.length, currentBearing, { units: 'meters' });
        const endLon = destination.geometry.coordinates[0];
        const endLat = destination.geometry.coordinates[1];

        arrowManager.arrowGroup.handle = L.marker([endLat, endLon], {
            icon: L.divIcon({
                className: 'arrow-handle',
                html: '<div style="background-color: #2A2B2A; width: 24px; height: 24px; border-radius: 50%; border: 3px solid #fff; cursor: grab;"></div>',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            })
        }).addTo(map);

        map.dragging.enable();
    }
}

// Create .ics file for downloadable calendar event
async function addHengeToCalendar(data) {
    const start = new Date(data.result.henge_date);
    const end = new Date(start.getTime() + 30 * 60 * 1000); // 30 mins

    const formatDate = (date) =>
        date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    const title = "Henge Alignment";
    const description = [
        `A perfect henge alignment is set for ${data.result.henge_time_local_str}!`,
        `Exact location:\n${data.address}`
    ].join('\n\n');

    const safeDescription = description
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;')
        .replace(/\n/g, '\\n');

    const locationStr = data.concise_address;
    const safeLocation = locationStr
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');

    function dedent(str) {
        return str.replace(/^\s+/gm, '');
    }

    const icsContent = dedent(`
        BEGIN:VCALENDAR
        VERSION:2.0
        PRODID:-//HengeFinder//EN
        BEGIN:VEVENT
        UID:${Date.now()}@hengefinder
        DTSTAMP:${formatDate(new Date())}
        DTSTART:${formatDate(start)}
        DTEND:${formatDate(end)}
        SUMMARY:${title}
        DESCRIPTION:${safeDescription}
        LOCATION:${safeLocation}
        END:VEVENT
        END:VCALENDAR
    `).trim();

    // Automatically download .ics file 
    const blob = new Blob([icsContent], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "henge-event.ics";

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log("ICS content:\n", icsContent);
}

// Calculate henge function
async function calculateHenge() {
    const calculateBtn = document.getElementById('calculateHengeBtn');
    const loading = document.getElementById('loading');
    const hengeResult = document.getElementById('hengeResult');

    calculateBtn.disabled = true;
    loading.style.display = 'block';
    hengeResult.style.display = 'none';

    try {
        const response = await fetch('/lookup_address', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                address: currentAddress,
                road_bearing: currentBearing
            })
        });

        const data = await response.json();

        if (response.ok) {
            displayResult(data);

            // Generate calendar event to download
            const calendarButton = document.getElementById("add-to-calendar");
            if (calendarButton) {
                calendarButton.addEventListener("click", () => addHengeToCalendar(data));
            }

            // Replace interactive arrow with static arrows
            if (data.result.henge_found) {
                arrowManager.clear();
                arrowManager.createArrow(currentCoordinates.lat, currentCoordinates.lon, data.road_bearing);
                arrowManager.addSunArrow(currentCoordinates.lat, currentCoordinates.lon, data.result.sun_angle);

                // Update map legend
                document.querySelector('.map-info').innerHTML =
                    '<strong>Map Legend:</strong> Dark arrow shows road <span class="tooltip-term">bearing<span class="tooltip">Angle of a terrestrial object (e.g. a road) measured clockwise from True North</span></span>. Orange arrow shows sun <span class="tooltip-term">azimuth<span class="tooltip">Angle of a celestial object (e.g. the sun) measured clockwise from True North</span></span>.';
            } else {
                arrowManager.clear();
                arrowManager.createArrow(currentCoordinates.lat, currentCoordinates.lon, data.road_bearing);

                document.querySelector('.map-info').innerHTML =
                    '<strong>Map Legend:</strong> Dark arrow shows road <span class="tooltip-term">bearing<span class="tooltip">Angle of a terrestrial object (e.g. a road) measured clockwise from True North</span></span>.';
            }

            // Hide interactive elements
            hideInteractiveElements();
        } else {
            displayError(data.error);
        }
    } catch (error) {
        displayError('Network error. Please try again.');
    } finally {
        calculateBtn.disabled = false;
        loading.style.display = 'none';
    }
}

function hideInteractiveElements() {
    const calculateBtn = document.getElementById('calculateHengeBtn');
    const bearingControls = document.querySelector('.bearing-controls');
    const step2Header = document.querySelector('.map-container h3');
    const step3Header = document.querySelector('.main-action h3');

    calculateBtn.style.display = 'none';
    if (bearingControls) bearingControls.style.display = 'none';
    if (step2Header) step2Header.style.display = 'none';
    if (step3Header) step3Header.style.display = 'none';
}

// Event listeners
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('calculateHengeBtn').addEventListener('click', calculateHenge);

    document.getElementById('resetBtn').addEventListener('click', function () {
        currentBearing = originalBearing;
        arrowManager.updateArrow(originalBearing);
        document.getElementById('bearingValue').textContent = `${originalBearing.toFixed(1)}°`;

        // Reset zoom level to original
        if (map && currentCoordinates) {
            map.setView([currentCoordinates.lat, currentCoordinates.lon], originalZoom);
        }
    });
});

// Form submission
document.getElementById('hengeForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const address = document.getElementById('address').value;
    const submitBtn = document.getElementById('submitBtn');
    const loading = document.getElementById('loading');
    const addressResult = document.getElementById('addressResult');
    const hengeResult = document.getElementById('hengeResult');

    resetToInitialState();

    submitBtn.disabled = true;
    loading.style.display = 'block';
    addressResult.style.display = 'none';
    hengeResult.style.display = 'none';
    document.getElementById('mapContainer').style.display = 'none';

    try {
        const response = await fetch('/lookup_address', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ address: address })
        });

        const data = await response.json();

        if (response.ok) {
            displayAddressLookup(data);
        } else {
            displayError(data.error, 'addressResult');
        }
    } catch (error) {
        console.error('Error:', error);
        displayError('Network error. Please try again.', 'addressResult');
    } finally {
        submitBtn.disabled = false;
        loading.style.display = 'none';
    }
});

function displayResult(data) {
    const hengeResultDiv = document.getElementById('hengeResult');
    const result = data.result;

    let html = '';

    if (result.henge_found) {
        html = `
                    <h3>🎉 Henge Found!</h3>
                    <p><span class="highlight">Next Henge Date:</span> ${result.henge_time_local_str ? result.henge_time_local_str : formatDate(result.henge_date)}</p>
                    <p><span class="highlight">Street <span class="tooltip-term">Bearing<span class="tooltip">Angle of a terrestrial object (e.g. a road) measured clockwise from True North</span></span>:</span> ${data.road_bearing}° from North</p>
                    <p><span class="highlight">Sun <span class="tooltip-term">Azimuth<span class="tooltip">Angle of a celestial object (e.g. the sun) measured clockwise from True North</span></span>:</span> ${result.sun_angle}° from North</p>
                    <p><em>Perfect alignment! The sun will set directly down your street on this date.</em></p>
                    <div class="disclaimer">
                        <p><span class="topic">Note: These predictions are rough estimates calculations.</span> For official city-wide henge events (like Manhattanhenge), check official announcements. They use specific city reference points and spatial assumptions, which may differ from the street-to-street calculations and assumptions used here.</p>
                    </div>
                    <br/>
                        <button id="add-to-calendar">Add to Calendar</button>
                `;
        hengeResultDiv.className = 'result success';
    } else {
        html = `
                    <h3>🔍 No Henge Found</h3>
                    <p><span class="highlight">Street <span class="tooltip-term">Bearing<span class="tooltip">Angle of a terrestrial object (e.g. a road) measured clockwise from True North</span></span>:</span> ${data.road_bearing}° from North</p>
                    <p><em>No henge alignment found in the next ${result.days_searched} days. The sun's path doesn't align with your street's orientation at this location.</em></p>
                    <div class="disclaimer">
                        <p><span class="topic">Note: These predictions are rough calculations based on various assumptions.</span> For official city-wide henge events (like Manhattanhenge), check official announcements as they use specific reference points and may differ from street-to-street calculations here.</p>
                    </div>
                `;
        hengeResultDiv.className = 'result no-henge';
    }

    hengeResultDiv.innerHTML = html;
    hengeResultDiv.style.display = 'block';
}

function displayError(message, container = 'hengeResult') {
    const errorDiv = document.getElementById(container);

    errorDiv.innerHTML = `
                <h3>❌ Error</h3>
                <p>${message}</p>
            `;
    errorDiv.className = 'result error';
    errorDiv.style.display = 'block';

    // Hide other containers if showing address error
    if (container === 'addressResult') {
        document.getElementById('mapContainer').style.display = 'none';
        document.getElementById('hengeResult').style.display = 'none';
    }
}

function resetToInitialState() {
    if (arrowManager) {
        arrowManager.clear();
    }

    currentAddress = null;
    currentCoordinates = null;
    originalBearing = 0;
    currentBearing = 0;
    originalZoom = 18;
    isInteractiveMode = false;
    isDragging = false;

    // Show all interactive elements again
    const bearingControls = document.querySelector('.bearing-controls');
    if (bearingControls) bearingControls.style.display = 'flex';

    const bearingValue = document.getElementById('bearingValue');
    if (bearingValue) {
        bearingValue.style.display = 'inline';
        bearingValue.textContent = '0°';
    }

    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.style.display = 'inline-block';

    const calculateBtn = document.getElementById('calculateHengeBtn');
    if (calculateBtn) calculateBtn.style.display = 'block';

    const step2Header = document.querySelector('.map-container h3');
    if (step2Header) step2Header.style.display = 'block';

    const step3Header = document.querySelector('.main-action h3');
    if (step3Header) step3Header.style.display = 'block';

    document.querySelector('.map-info').innerHTML =
        '<strong>Map Legend:</strong> Dark arrow shows the road <span class="tooltip-term">bearing<span class="tooltip">Angle of a terrestrial object (e.g. a road) measured clockwise from True North</span></span> direction (drag to adjust).';

    if (map) {
        map.dragging.enable();
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Tab switching functionality
function showTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.remove('active'));

    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => button.classList.remove('active'));

    // Show selected tab content
    document.getElementById(tabName + '-tab').classList.add('active');

    // Add active class to clicked button
    event.target.classList.add('active');

    // Initialize street visualization if switching to learn tab
    if (tabName === 'learn' && !streetAnimationInitialized) {
        setTimeout(() => {
            initStreetVisualization();
        }, 100);

        if (!orbitalAnimationInitialized) {
            setTimeout(() => {
                initOrbitalVisualization();
            }, 150);
        }
    }
}

// Street Henge Visualization
let streetCanvas, streetCtx, streetNonHengeCanvas, streetNonHengeCtx;
let currentTimeMinutes = 255; // Start at 8:15 PM (4PM + 255 minutes) for henge view
let currentNonHengeTimeMinutes = 180; // Start at 7:00 PM for non-henge view
const MANHATTAN_BEARING = 299; // Manhattan street bearing
let streetAnimationInitialized = false;

function initStreetVisualization() {
    streetCanvas = document.getElementById('streetHengeCanvas');
    streetNonHengeCanvas = document.getElementById('streetNonHengeCanvas');
    if (!streetCanvas || !streetNonHengeCanvas) return;

    streetCtx = streetCanvas.getContext('2d');
    streetNonHengeCtx = streetNonHengeCanvas.getContext('2d');

    streetCanvas.width = streetCanvas.clientWidth;
    streetCanvas.height = streetCanvas.clientHeight;
    streetNonHengeCanvas.width = streetNonHengeCanvas.clientWidth;
    streetNonHengeCanvas.height = streetNonHengeCanvas.clientHeight;

    setupStreetControls();
    updateStreetScene();
    updateNonHengeScene();
    streetAnimationInitialized = true;
}

function setupStreetControls() {
    const timeSlider = document.getElementById('streetTimeSlider');
    const timeDisplay = document.getElementById('streetTimeDisplay');
    const nonHengeTimeSlider = document.getElementById('streetNonHengeTimeSlider');
    const nonHengeTimeDisplay = document.getElementById('streetNonHengeTimeDisplay');

    if (!timeSlider || !timeDisplay || !nonHengeTimeSlider || !nonHengeTimeDisplay) return;

    // Henge date controls
    timeSlider.addEventListener('input', (e) => {
        currentTimeMinutes = parseInt(e.target.value);
        updateTimeDisplay();
        updateStreetScene();
    });

    // Non-henge date controls
    nonHengeTimeSlider.addEventListener('input', (e) => {
        currentNonHengeTimeMinutes = parseInt(e.target.value);
        updateNonHengeTimeDisplay();
        updateNonHengeScene();
    });

    updateTimeDisplay();
    updateNonHengeTimeDisplay();
}

function updateTimeDisplay() {
    const timeDisplay = document.getElementById('streetTimeDisplay');
    if (!timeDisplay) return;

    // Convert minutes since 4 PM to actual time
    const startHour = 16; // 4 PM
    const totalMinutes = currentTimeMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const actualHour = startHour + hours;

    const displayHour = actualHour > 12 ? actualHour - 12 : actualHour;
    const ampm = actualHour >= 12 ? 'PM' : 'AM';
    const timeString = `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;

    timeDisplay.textContent = timeString;
}

function updateNonHengeTimeDisplay() {
    const timeDisplay = document.getElementById('streetNonHengeTimeDisplay');
    if (!timeDisplay) return;

    // Convert minutes since 4 PM to actual time
    const startHour = 16; // 4 PM
    const totalMinutes = currentNonHengeTimeMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const actualHour = startHour + hours;

    const displayHour = actualHour > 12 ? actualHour - 12 : actualHour;
    const ampm = actualHour >= 12 ? 'PM' : 'AM';
    const timeString = `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;

    timeDisplay.textContent = timeString;
}

function updateStreetScene() {
    if (!streetCtx || !streetCanvas) return;

    // Get current time for API call - May 27, 2026 (henge date)
    const startHour = 16; // 4 PM
    const hours = Math.floor(currentTimeMinutes / 60);
    const minutes = currentTimeMinutes % 60;
    const targetTime = new Date(2026, 5, 28, startHour + hours, minutes); // December 27, 2026

    // Call API to get sun position
    fetch('/lookup_azimuth_altitude', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            time: targetTime.toISOString(),
            road_bearing: MANHATTAN_BEARING
        })
    })
        .then(response => response.json())
        .then(data => {
            drawStreetScene(streetCtx, streetCanvas, data.graphic_az, data.altitude, 'hengeIndicator');
        })
        .catch(error => {
            console.error('Error fetching sun position:', error);
            // Draw scene with default values if API fails
            drawStreetScene(streetCtx, streetCanvas, 0, 5, 'hengeIndicator');
        });
}

function updateNonHengeScene() {
    if (!streetNonHengeCtx || !streetNonHengeCanvas) return;

    // Get current time for API call - September 10, 2025 (non-henge date)
    const startHour = 16; // 4 PM
    const hours = Math.floor(currentNonHengeTimeMinutes / 60);
    const minutes = currentNonHengeTimeMinutes % 60;
    const targetTime = new Date(2025, 8, 10, startHour + hours, minutes); // September 10, 2025

    // Call API to get sun position
    fetch('/lookup_azimuth_altitude', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            time: targetTime.toISOString(),
            road_bearing: MANHATTAN_BEARING
        })
    })
        .then(response => response.json())
        .then(data => {
            drawStreetScene(streetNonHengeCtx, streetNonHengeCanvas, data.graphic_az, data.altitude, 'nonHengeIndicator');
        })
        .catch(error => {
            console.error('Error fetching sun position:', error);
            // Draw scene with default values if API fails
            drawStreetScene(streetNonHengeCtx, streetNonHengeCanvas, 15, 5, 'nonHengeIndicator');
        });
}

function drawStreetScene(ctx, canvas, graphicAz, altitude, indicatorId) {
    if (!ctx || !canvas) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Define perspective parameters
    const vanishingPointX = width / 2;
    const vanishingPointY = height * 0.4;
    const horizonY = vanishingPointY;

    // Draw sky gradient (only above horizon)
    const skyGradient = ctx.createLinearGradient(0, 0, 0, horizonY);
    skyGradient.addColorStop(0, '#E6F3FF'); // Very light blue
    skyGradient.addColorStop(0.5, '#FFE6CC'); // Very light peach
    skyGradient.addColorStop(1, '#FFD6B3'); // Light warm beige

    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, horizonY);

    // Draw ground/landscape below horizon using variations of #5E4955
    const groundGradient = ctx.createLinearGradient(0, horizonY, 0, height);
    groundGradient.addColorStop(0, '#7A5F73'); // Lighter version of #5E4955
    groundGradient.addColorStop(1, '#5E4955'); // Original color

    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, horizonY, width, height - horizonY);

    // Draw street (perspective view) - extends to bottom of canvas
    const streetWidthBottom = width * 0.6;
    const streetWidthTop = 20; // Width at vanishing point

    // Street surface
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.moveTo((width - streetWidthBottom) / 2, height);
    ctx.lineTo((width + streetWidthBottom) / 2, height);
    ctx.lineTo(vanishingPointX + streetWidthTop / 2, vanishingPointY);
    ctx.lineTo(vanishingPointX - streetWidthTop / 2, vanishingPointY);
    ctx.closePath();
    ctx.fill();

    // Draw center line on street
    ctx.strokeStyle = '#FFFF99';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(width / 2, height);
    ctx.lineTo(vanishingPointX, vanishingPointY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw street edge lines
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Left edge
    ctx.moveTo((width - streetWidthBottom) / 2, height);
    ctx.lineTo(vanishingPointX - streetWidthTop / 2, vanishingPointY);
    ctx.stroke();
    // Right edge
    ctx.beginPath();
    ctx.moveTo((width + streetWidthBottom) / 2, height);
    ctx.lineTo(vanishingPointX + streetWidthTop / 2, vanishingPointY);
    ctx.stroke();

    // Draw sun
    drawSun(ctx, graphicAz, altitude, width, height, vanishingPointX, vanishingPointY);

    // Check if it's a henge (sun aligned with street)
    const hengeIndicator = document.getElementById(indicatorId);
    if (hengeIndicator) {
        if (Math.abs(graphicAz) < 5 && altitude > 0) { // Close to alignment
            hengeIndicator.classList.add('visible');
        } else {
            hengeIndicator.classList.remove('visible');
        }
    }
}

function drawSun(ctx, graphicAz, altitude, width, height, vanishingPointX, vanishingPointY) {
    if (altitude <= 0) return; // Sun is below horizon

    // Convert graphic azimuth to screen position
    // graphicAz = 0 means perfectly aligned with street
    // Negative values = sun is to the left, positive = to the right
    const sunX = vanishingPointX + (graphicAz * 3); // Scale the azimuth for visual effect
    const sunY = vanishingPointY - (altitude * 8); // Higher altitude = higher on screen

    // Check if sun is outside visible bounds - if so, don't draw it
    const sunRadius = 18;
    if (sunY + sunRadius < 0) return; // Sun is above canvas
    if (sunY - sunRadius > height) return; // Sun is below canvas
    if (sunX + sunRadius < 0) return; // Sun is to the left of canvas
    if (sunX - sunRadius > width) return; // Sun is to the right of canvas

    // Draw sun at actual position (no clamping)
    const sunGradient = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius);
    sunGradient.addColorStop(0, '#FFFFFF'); // Bright white center
    sunGradient.addColorStop(0.6, '#FFFFFF'); // More white
    sunGradient.addColorStop(0.8, '#DC816E'); // DC816E
    sunGradient.addColorStop(1, '#DC816E'); // DC816E edge

    ctx.fillStyle = sunGradient;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw sun rays (brighter and more prominent)
    ctx.strokeStyle = '#DC816E'; // DC816E rays
    ctx.lineWidth = 3; // Thicker rays
    ctx.shadowColor = '#DC816E';
    ctx.shadowBlur = 5;
    for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI * 2) / 8;
        const rayLength = 15; // Longer rays for better visibility
        ctx.beginPath();
        ctx.moveTo(
            sunX + Math.cos(angle) * (sunRadius + 3),
            sunY + Math.sin(angle) * (sunRadius + 3)
        );
        ctx.lineTo(
            sunX + Math.cos(angle) * (sunRadius + rayLength),
            sunY + Math.sin(angle) * (sunRadius + rayLength)
        );
        ctx.stroke();
    }
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
}

// Orbital Visualization Variables
let orbitalCanvas, orbitalCtx, tiltCanvas, tiltCtx;
let orbitalCurrentDay = 0;
let orbitalAnimationInitialized = false;

function initOrbitalVisualization() {
    orbitalCanvas = document.getElementById('orbitalCanvas');
    tiltCanvas = document.getElementById('tiltCanvas');

    if (!orbitalCanvas || !tiltCanvas) return;

    orbitalCtx = orbitalCanvas.getContext('2d');
    tiltCtx = tiltCanvas.getContext('2d');

    // Set canvas dimensions
    orbitalCanvas.width = orbitalCanvas.clientWidth;
    orbitalCanvas.height = orbitalCanvas.clientHeight;
    tiltCanvas.width = tiltCanvas.clientWidth;
    tiltCanvas.height = tiltCanvas.clientHeight;

    setupOrbitalControls();
    updateOrbitalVisualization();
    orbitalAnimationInitialized = true;
}

function setupOrbitalControls() {
    const timeSlider = document.getElementById('orbitalTimeSlider');
    const timeDisplay = document.getElementById('orbitalTimeDisplay');
    const equinoxIndicator = document.getElementById('orbitalEquinoxIndicator');

    if (!timeSlider || !timeDisplay) return;

    timeSlider.addEventListener('input', (e) => {
        orbitalCurrentDay = parseInt(e.target.value);
        updateOrbitalTimeDisplay();
        updateOrbitalVisualization();
    });

    updateOrbitalTimeDisplay();
}

function updateOrbitalTimeDisplay() {
    const timeDisplay = document.getElementById('orbitalTimeDisplay');
    if (!timeDisplay) return;

    timeDisplay.textContent = `Day ${orbitalCurrentDay + 1}`;

    // Equinox indicator removed as requested
}

function updateOrbitalVisualization() {
    drawOrbitalView();
    drawTiltView();
}

function drawOrbitalView() {
    if (!orbitalCtx || !orbitalCanvas) return;

    const width = orbitalCanvas.width;
    const height = orbitalCanvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Clear canvas
    orbitalCtx.clearRect(0, 0, width, height);

    // Draw orbital path
    orbitalCtx.strokeStyle = '#444';
    orbitalCtx.lineWidth = 2;
    orbitalCtx.beginPath();
    orbitalCtx.arc(centerX, centerY, 80, 0, Math.PI * 2);
    orbitalCtx.stroke();

    // Draw Sun at center
    const sunGradient = orbitalCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 15);
    sunGradient.addColorStop(0, '#FFF');
    sunGradient.addColorStop(0.3, '#FFFF99');
    sunGradient.addColorStop(1, '#FFD700');

    orbitalCtx.fillStyle = sunGradient;
    orbitalCtx.beginPath();
    orbitalCtx.arc(centerX, centerY, 15, 0, Math.PI * 2);
    orbitalCtx.fill();

    // Add sun label
    orbitalCtx.fillStyle = '#FFF';
    orbitalCtx.font = '12px Arial';
    orbitalCtx.textAlign = 'center';
    orbitalCtx.fillText('Sun', centerX, centerY + 35);

    // Calculate Earth position based on day of year
    const angle = (orbitalCurrentDay / 365) * Math.PI * 2 - Math.PI / 2; // Start from top
    const earthX = centerX + Math.cos(angle) * 80;
    const earthY = centerY + Math.sin(angle) * 80;

    // Draw Earth
    const earthGradient = orbitalCtx.createRadialGradient(earthX, earthY, 0, earthX, earthY, 8);
    earthGradient.addColorStop(0, '#6B9BD2');
    earthGradient.addColorStop(1, '#4A7BA7');

    orbitalCtx.fillStyle = earthGradient;
    orbitalCtx.beginPath();
    orbitalCtx.arc(earthX, earthY, 8, 0, Math.PI * 2);
    orbitalCtx.fill();

    // Draw Earth's rotational axis (to show tilt isn't visible from top)
    orbitalCtx.strokeStyle = '#90EE90';
    orbitalCtx.lineWidth = 2;
    orbitalCtx.beginPath();
    axisLength = 12;
    offsetY = axisLength * Math.cos(23.5 * Math.PI / 180);
    offsetX = axisLength * Math.sin(23.5 * Math.PI / 180);

    orbitalCtx.moveTo(earthX - offsetX, earthY - offsetY);
    orbitalCtx.lineTo(earthX + offsetX, earthY + offsetY);
    orbitalCtx.stroke();

    // Add Earth label
    orbitalCtx.fillStyle = '#FFF';
    orbitalCtx.font = '12px Arial';
    orbitalCtx.textAlign = 'center';
    orbitalCtx.fillText('Earth', earthX, earthY + 25);

    // Add directional labels
    orbitalCtx.fillStyle = '#CCC';
    orbitalCtx.font = '12px Arial';
    orbitalCtx.textAlign = 'center';

    // Spring Equinox (top)
    orbitalCtx.fillText('Spring', centerX, centerY - 115);
    orbitalCtx.fillText('Equinox', centerX, centerY - 102);

    // Fall Equinox (bottom)
    orbitalCtx.fillText('Fall', centerX, centerY + 125);
    orbitalCtx.fillText('Equinox', centerX, centerY + 138);

    // Summer Solstice (right)
    orbitalCtx.textAlign = 'left';
    orbitalCtx.fillText('Summer', centerX + 90, centerY - 5);
    orbitalCtx.fillText('Solstice', centerX + 90, centerY + 8);

    // Winter Solstice (left)
    orbitalCtx.textAlign = 'right';
    orbitalCtx.fillText('Winter', centerX - 90, centerY - 5);
    orbitalCtx.fillText('Solstice', centerX - 90, centerY + 8);
}

function drawTiltView() {
    if (!tiltCtx || !tiltCanvas) return;

    const width = tiltCanvas.width;
    const height = tiltCanvas.height;
    const centerX = width * 0.7; // Move Earth to the right (70% across)
    const centerY = height / 2;

    // Clear canvas
    tiltCtx.clearRect(0, 0, width, height);

    // Draw Sun on the left
    const sunGradient = tiltCtx.createRadialGradient(50, centerY, 0, 50, centerY, 20);
    sunGradient.addColorStop(0, '#FFF');
    sunGradient.addColorStop(0.3, '#FFFF99');
    sunGradient.addColorStop(1, '#FFD700');

    tiltCtx.fillStyle = sunGradient;
    tiltCtx.beginPath();
    tiltCtx.arc(50, centerY, 20, 0, Math.PI * 2);
    tiltCtx.fill();

    // Add sun label
    tiltCtx.fillStyle = '#FFF';
    tiltCtx.font = '12px Arial';
    tiltCtx.textAlign = 'center';
    tiltCtx.fillText('Sun', 50, centerY + 40);

    // Draw Earth
    const earthGradient = tiltCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 25);
    earthGradient.addColorStop(0, '#6B9BD2');
    earthGradient.addColorStop(1, '#4A7BA7');

    tiltCtx.fillStyle = earthGradient;
    tiltCtx.beginPath();
    tiltCtx.arc(centerX, centerY, 25, 0, Math.PI * 2);
    tiltCtx.fill();

    // Draw shaded half-circle on the right side (away from sun)
    // This represents the dark side of Earth that's not facing the sun
    tiltCtx.fillStyle = 'rgba(0, 0, 0, 0.6)'; // Semi-transparent black
    tiltCtx.beginPath();
    tiltCtx.arc(centerX, centerY, 25, -Math.PI / 2, Math.PI / 2); // Right half of circle
    tiltCtx.fill();

    // Calculate tilt angle based on day of year
    const axisLength = 40;
    const seasonalAngle = (orbitalCurrentDay / 365) * Math.PI * 2;
    const tiltDegrees = 23.5 * Math.sin(seasonalAngle);
    const maxX = Math.sin(23.5 * Math.PI / 180) * axisLength;
    const offsetY = Math.cos(23.5 * Math.PI / 180) * axisLength;

    // Draw rotational axis showing tilt
    const axisEndX = centerX - Math.sin(seasonalAngle) * maxX;
    const axisEndY = centerY - offsetY;
    const axisStartX = centerX + Math.sin(seasonalAngle) * maxX;
    const axisStartY = centerY + offsetY;

    tiltCtx.strokeStyle = '#90EE90';
    tiltCtx.lineWidth = 3;
    tiltCtx.beginPath();
    tiltCtx.moveTo(axisStartX, axisStartY);
    tiltCtx.lineTo(axisEndX, axisEndY);
    tiltCtx.stroke();

    // Draw latitude line at the equator (orthogonal to the N-S pole line)
    // Calculate the perpendicular direction to the pole line
    const poleVectorX = axisEndX - axisStartX;
    const poleVectorY = axisEndY - axisStartY;

    // Perpendicular vector (rotated 90 degrees)
    const latVectorX = -poleVectorY;
    const latVectorY = poleVectorX;

    // Normalize and scale to reach earth's edge
    const latVectorLength = Math.sqrt(latVectorX * latVectorX + latVectorY * latVectorY);
    const latLineLength = 25; // Same as earth radius
    const normalizedLatX = (latVectorX / latVectorLength) * latLineLength;
    const normalizedLatY = (latVectorY / latVectorLength) * latLineLength;

    // Draw latitude line through center
    const latStartX = centerX - normalizedLatX;
    const latStartY = centerY - normalizedLatY;
    const latEndX = centerX + normalizedLatX;
    const latEndY = centerY + normalizedLatY;

    tiltCtx.strokeStyle = '#FFB347'; // Orange color for latitude line
    tiltCtx.lineWidth = 3;
    tiltCtx.beginPath();
    tiltCtx.moveTo(latStartX, latStartY);
    tiltCtx.lineTo(latEndX, latEndY);
    tiltCtx.stroke();

    // Draw North Pole marker
    tiltCtx.fillStyle = '#FFF';
    tiltCtx.beginPath();
    tiltCtx.arc(axisEndX, axisEndY, 5, 0, Math.PI * 2);
    tiltCtx.fill();

    // Add North Pole label
    tiltCtx.fillStyle = '#FFF';
    tiltCtx.font = '12px Arial';
    tiltCtx.textAlign = 'center';
    tiltCtx.fillText('North Pole', axisEndX, axisEndY - 15);

    // Draw South Pole marker
    tiltCtx.fillStyle = '#FFF';
    tiltCtx.beginPath();
    tiltCtx.arc(axisStartX, axisStartY, 5, 0, Math.PI * 2);
    tiltCtx.fill();

    // Add South Pole label
    tiltCtx.fillText('South Pole', axisStartX, axisStartY + 25);

    // Add Earth label
    tiltCtx.fillStyle = '#FFF';
    tiltCtx.fillText('Earth', centerX, centerY + 45);

    // Show tilt angle
    tiltCtx.fillStyle = '#FFFF99';
    tiltCtx.font = '14px Arial';
    tiltCtx.textAlign = 'center';
    tiltCtx.fillText(`Tilt: ${tiltDegrees.toFixed(1)}°`, centerX, height - 20);

    // Draw reference line (vertical) to show tilt
    tiltCtx.strokeStyle = '#666';
    tiltCtx.lineWidth = 1;
    tiltCtx.setLineDash([5, 5]);
    tiltCtx.beginPath();
    tiltCtx.moveTo(centerX, centerY - 50);
    tiltCtx.lineTo(centerX, centerY + 50);
    tiltCtx.stroke();

    // Check if we're in a henge condition (tilt within ±0.5 degrees)
    const isHengeCondition = Math.abs(tiltDegrees) <= 0.5;

    // Draw horizontal sunlight line from edge of sun to earth
    // Change color to match equator line when in henge condition
    tiltCtx.strokeStyle = isHengeCondition ? '#FFB347' : '#666'; // Orange if henge, grey otherwise
    tiltCtx.lineWidth = isHengeCondition ? 3 : 1; // Thicker line if henge
    tiltCtx.beginPath();
    tiltCtx.moveTo(70, centerY); // Start from edge of sun (sun radius is 20, center at 50, so edge at 70)
    tiltCtx.lineTo(centerX - 25, centerY); // End at left edge of earth (earth radius is 25)
    tiltCtx.stroke();

    tiltCtx.setLineDash([]);

    // Update the henge message display below the canvas
    updateHengeMessage(isHengeCondition);
}

function updateHengeMessage(isHengeCondition) {
    const hengeMessage = document.getElementById('hengeMessage');
    if (hengeMessage) {
        hengeMessage.style.opacity = isHengeCondition ? '1' : '0';
    }
}

// Update the showTab function to initialize all visualizations
const originalShowTab = showTab;
showTab = function (tabName) {
    originalShowTab.call(this, tabName);

    // Initialize visualizations if switching to learn tab
    if (tabName === 'learn') {
        if (!streetAnimationInitialized) {
            setTimeout(() => {
                initStreetVisualization();
            }, 100);
        }
        if (!orbitalAnimationInitialized) {
            setTimeout(() => {
                initOrbitalVisualization();
            }, 150);
        }
    }
};