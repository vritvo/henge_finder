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
let startDate = null; // The starting date for the year's worth of data
let endDate = null;   // The ending date for the year's worth of data

// Road filtering variables
let roadFilterEnabled = true;
let streetHighlightLayer = null;

// Loading indicator management functions
function showLoadingIndicators() {
    const loadingHenge = document.getElementById('loadingHenge');
    const mapLoadingOverlay = document.getElementById('mapLoadingOverlay');
    
    if (loadingHenge) {
        loadingHenge.style.display = 'block';
    }
    if (mapLoadingOverlay) {
        mapLoadingOverlay.style.display = 'flex';
    }
}

function hideLoadingIndicators() {
    const loadingHenge = document.getElementById('loadingHenge');
    const mapLoadingOverlay = document.getElementById('mapLoadingOverlay');
    
    if (loadingHenge) {
        loadingHenge.style.display = 'none';
    }
    if (mapLoadingOverlay) {
        mapLoadingOverlay.style.display = 'none';
    }
}

// Overpass API configuration
const OVERPASS_CONFIG = {
    url: 'https://overpass-api.de/api/interpreter',
    timeout: 60
};

// Popular cities for typeahead suggestions (now a fallback for when
// requests to OpenDataSoft fail)
const popularCities = [
    "Anchorage, AK, USA",
    "Juneau, AK, USA",
    "Birmingham, AL, USA",
    "Montgomery, AL, USA",
    "Little Rock, AR, USA",
    "Phoenix, AZ, USA",
    "Los Angeles, CA, USA",
    "Sacramento, CA, USA",
    "San Diego, CA, USA",
    "San Francisco, CA, USA",
    "San Jose, CA, USA",
    "Denver, CO, USA",
    "Bridgeport, CT, USA",
    "Hartford, CT, USA",
    "Washington, DC, USA",
    "Dover, DE, USA",
    "Wilmington, DE, USA",
    "Jacksonville, FL, USA",
    "Miami, FL, USA",
    "Orlando, FL, USA",
    "Tallahassee, FL, USA",
    "Atlanta, GA, USA",
    "Honolulu, HI, USA",
    "Des Moines, IA, USA",
    "Boise, ID, USA",
    "Chicago, IL, USA",
    "Springfield, IL, USA",
    "Indianapolis, IN, USA",
    "Topeka, KS, USA",
    "Wichita, KS, USA",
    "Frankfort, KY, USA",
    "Louisville, KY, USA",
    "Baton Rouge, LA, USA",
    "New Orleans, LA, USA",
    "Boston, MA, USA",
    "Annapolis, MD, USA",
    "Baltimore, MD, USA",
    "Augusta, ME, USA",
    "Detroit, MI, USA",
    "Lansing, MI, USA",
    "Minneapolis, MN, USA",
    "Saint Paul, MN, USA",
    "Jefferson City, MO, USA",
    "Kansas City, MO, USA",
    "St Louis, MO, USA",
    "Jackson, MS, USA",
    "Billings, MT, USA",
    "Helena, MT, USA",
    "Charlotte, NC, USA",
    "Raleigh, NC, USA",
    "Bismarck, ND, USA",
    "Fargo, ND, USA",
    "Lincoln, NE, USA",
    "Omaha, NE, USA",
    "Concord, NH, USA",
    "Manchester, NH, USA",
    "Newark, NJ, USA",
    "Trenton, NJ, USA",
    "Albuquerque, NM, USA",
    "Santa Fe, NM, USA",
    "Carson City, NV, USA",
    "Las Vegas, NV, USA",
    "Albany, NY, USA",
    "Buffalo, NY, USA",
    "New York, NY, USA",
    "Cleveland, OH, USA",
    "Columbus, OH, USA",
    "Toledo, OH, USA",
    "Oklahoma City, OK, USA",
    "Portland, OR, USA",
    "Salem, OR, USA",
    "Harrisburg, PA, USA",
    "Philadelphia, PA, USA",
    "Pittsburgh, PA, USA",
    "Providence, RI, USA",
    "Columbia, SC, USA",
    "Pierre, SD, USA",
    "Sioux Falls, SD, USA",
    "Memphis, TN, USA",
    "Nashville, TN, USA",
    "Austin, TX, USA",
    "Dallas, TX, USA",
    "Houston, TX, USA",
    "San Antonio, TX, USA",
    "Salt Lake City, UT, USA",
    "Richmond, VA, USA",
    "Virginia Beach, VA, USA",
    "Burlington, VT, USA",
    "Montpelier, VT, USA",
    "Olympia, WA, USA",
    "Seattle, WA, USA",
    "Madison, WI, USA",
    "Milwaukee, WI, USA",
    "Charleston, WV, USA",
    "Cheyenne, WY, USA",
    "Kabul, Afghanistan",
    "Tirana, Albania",
    "Tirane, Albania",
    "Algiers, Algeria",
    "Pago Pago, American Samoa",
    "Andorra la Vella, Andorra",
    "Luanda, Angola",
    "St. John's, Antigua and Barbuda",
    "Buenos Aires, Argentina",
    "Yerevan, Armenia",
    "Oranjestad, Aruba",
    "Adelaide, Australia",
    "Brisbane, Australia",
    "Canberra, Australia",
    "Darwin, Australia",
    "Hobart, Australia",
    "Melbourne, Australia",
    "Perth, Australia",
    "Sydney, Australia",
    "Vienna, Austria",
    "Baku, Azerbaijan",
    "Nassau, Bahamas",
    "Manama, Bahrain",
    "Dhaka, Bangladesh",
    "Bridgetown, Barbados",
    "Minsk, Belarus",
    "Brussels, Belgium",
    "Belmopan, Belize",
    "Cotonou, Benin",
    "Porto-Novo, Benin",
    "Thimphu, Bhutan",
    "La Paz, Bolivia",
    "Sucre, Bolivia",
    "Sarajevo, Bosnia and Herzegovina",
    "Gaborone, Botswana",
    "Brasilia, Brazil",
    "Rio de Janeiro, Brazil",
    "São Paulo, Brazil",
    "Road Town, British Virgin Islands",
    "Bandar Seri Begawan, Brunei",
    "Sofia, Bulgaria",
    "Ouagadougou, Burkina Faso",
    "Bujumbura, Burundi",
    "Phnom Penh, Cambodia",
    "Yaounde, Cameroon",
    "Calgary, Canada",
    "Charlottetown, Canada",
    "Edmonton, Canada",
    "Fredericton, Canada",
    "Halifax, Canada",
    "Iqaluit, Canada",
    "Montreal, Canada",
    "Ottawa, Canada",
    "Quebec, Canada",
    "Regina, Canada",
    "Saskatoon, Canada",
    "St. John's, Canada",
    "Toronto, Canada",
    "Vancouver, Canada",
    "Whitehorse, Canada",
    "Winnipeg, Canada",
    "Yellowknife, Canada",
    "Praia, Cape Verde",
    "George Town, Cayman Islands",
    "Bangui, Central African Republic",
    "N'Djamena, Chad",
    "Santiago, Chile",
    "Beijing, China",
    "Hong Kong, China",
    "Shanghai, China",
    "Bogota, Colombia",
    "Moroni, Comoros",
    "Avarua, Cook Islands",
    "San Jose, Costa Rica",
    "Yamoussoukro, Cote d'Ivoire",
    "Zagreb, Croatia",
    "Havana, Cuba",
    "Nicosia, Cyprus",
    "Prague, Czechia",
    "Kinshasa, Democratic Republic of the Congo",
    "Copenhagen, Denmark",
    "Djibouti, Djibouti",
    "Roseau, Dominica",
    "Santo Domingo, Dominican Republic",
    "Dili, East Timor",
    "Quito, Ecuador",
    "Cairo, Egypt",
    "San Salvador, El Salvador",
    "Barrow-In-Furness, England",
    "Birmingham, England",
    "Bolton, England",
    "Bradford, England",
    "Bristol, England",
    "Crawley, England",
    "Greenwich, England",
    "Leeds, England",
    "Leicester, England",
    "Liverpool, England",
    "London, England",
    "Manchester, England",
    "Newcastle, England",
    "Newcastle Upon Tyne, England",
    "Norwich, England",
    "Oxford, England",
    "Plymouth, England",
    "Portsmouth, England",
    "Reading, England",
    "Sheffield, England",
    "Southampton, England",
    "Swindon, England",
    "Wolverhampton, England",
    "Malabo, Equatorial Guinea",
    "Asmara, Eritrea",
    "Tallinn, Estonia",
    "Mbabane, Eswatini",
    "Addis Ababa, Ethiopia",
    "Stanley, Falkland Islands",
    "Torshavn, Faroe Islands",
    "Suva, Fiji",
    "Helsinki, Finland",
    "Paris, France",
    "Cayenne, French Guiana",
    "Papeete, French Polynesia",
    "Libreville, Gabon",
    "Banjul, Gambia",
    "T'bilisi, Georgia",
    "Tbilisi, Georgia",
    "Berlin, Germany",
    "Munich, Germany",
    "Accra, Ghana",
    "Gibraltar, Gibraltar",
    "Athens, Greece",
    "Nuuk, Greenland",
    "St. George's, Grenada",
    "Basse-Terre, Guadeloupe",
    "Guatemala City, Guatemala",
    "St. Peter Port, Guernsey",
    "Conakry, Guinea",
    "Bissau, Guinea-Bissau",
    "Georgetown, Guyana",
    "Port-au-Prince, Haiti",
    "Tegucigalpa, Honduras",
    "Budapest, Hungary",
    "Reykjavik, Iceland",
    "Bangalore, India",
    "Chennai, India",
    "Mumbai, India",
    "New Delhi, India",
    "Jakarta, Indonesia",
    "Tehran, Iran",
    "Baghdad, Iraq",
    "Dublin, Ireland",
    "Douglas, Isle Of Man",
    "Jerusalem, Israel",
    "Milan, Italy",
    "Rome, Italy",
    "Kingston, Jamaica",
    "Osaka, Japan",
    "Tokyo, Japan",
    "Saint Helier, Jersey",
    "Amman, Jordan",
    "Astana, Kazakhstan",
    "Nairobi, Kenya",
    "Tarawa, Kiribati",
    "Pristina, Kosovo",
    "Kuwait, Kuwait",
    "Bishkek, Kyrgyzstan",
    "Vientiane, Laos",
    "Riga, Latvia",
    "Beirut, Lebanon",
    "Maseru, Lesotho",
    "Monrovia, Liberia",
    "Tripoli, Libya",
    "Vaduz, Liechtenstein",
    "Vilnius, Lithuania",
    "Luxembourg, Luxembourg",
    "Macau, Macau",
    "Antananarivo, Madagascar",
    "Lilongwe, Malawi",
    "Kuala Lumpur, Malaysia",
    "Male, Maldives",
    "Bamako, Mali",
    "Valletta, Malta",
    "Majuro, Marshall Islands",
    "Fort-de-France, Martinique",
    "Nouakchott, Mauritania",
    "Port Louis, Mauritius",
    "Mamoudzou, Mayotte",
    "Guadalajara, Mexico",
    "Mexico City, Mexico",
    "Palikir, Micronesia",
    "Chisinau, Moldova",
    "Monaco, Monaco",
    "Ulaanbaatar, Mongolia",
    "Ulan Bator, Mongolia",
    "Podgorica, Montenegro",
    "El Aaiun, Morocco",
    "Rabat, Morocco",
    "Maputo, Mozambique",
    "Naypyidaw, Myanmar",
    "Yangon, Myanmar",
    "Windhoek, Namibia",
    "Yaren, Nauru",
    "Kathmandu, Nepal",
    "Amsterdam, Netherlands",
    "Noumea, New Caledonia",
    "Auckland, New Zealand",
    "Wellington, New Zealand",
    "Managua, Nicaragua",
    "Niamey, Niger",
    "Abuja, Nigeria",
    "Lagos, Nigeria",
    "Kingston, Norfolk Island",
    "P'yongyang, North Korea",
    "Skopje, North Macedonia",
    "Belfast, Northern Ireland",
    "Saipan, Northern Mariana Islands",
    "Oslo, Norway",
    "Masqat, Oman",
    "Muscat, Oman",
    "Islamabad, Pakistan",
    "Karachi, Pakistan",
    "Koror, Palau",
    "Ngerulmud, Palau",
    "Panama City, Panama",
    "Port Moresby, Papua New Guinea",
    "Asuncion, Paraguay",
    "Lima, Peru",
    "Manila, Philippines",
    "Warsaw, Poland",
    "Lisbon, Portugal",
    "San Juan, Puerto Rico",
    "Doha, Qatar",
    "Brazzaville, Republic of the Congo",
    "Bucharest, Romania",
    "Bucuresti, Romania",
    "Moscow, Russia",
    "St Petersburg, Russia",
    "Kigali, Rwanda",
    "Basseterre, Saint Kitts and Nevis",
    "Castries, Saint Lucia",
    "Saint Pierre, Saint Pierre and Miquelon",
    "Kingstown, Saint Vincent and the Grenadines",
    "Apia, Samoa",
    "San Marino, San Marino",
    "Sao Tome, Sao Tome and Principe",
    "Al Jubail, Saudi Arabia",
    "Dammam, Saudi Arabia",
    "Jubail, Saudi Arabia",
    "Madinah, Saudi Arabia",
    "Makkah, Saudi Arabia",
    "Mecca, Saudi Arabia",
    "Medina, Saudi Arabia",
    "Riyadh, Saudi Arabia",
    "Aberdeen, Scotland",
    "Edinburgh, Scotland",
    "Glasgow, Scotland",
    "Dakar, Senegal",
    "Belgrade, Serbia",
    "Freetown, Sierra Leone",
    "Singapore, Singapore",
    "Bratislava, Slovakia",
    "Ljubljana, Slovenia",
    "Honiara, Solomon Islands",
    "Mogadishu, Somalia",
    "Bloemfontein, South Africa",
    "Cape Town, South Africa",
    "Johannesburg, South Africa",
    "Pretoria, South Africa",
    "Busan, South Korea",
    "Seoul, South Korea",
    "Juba, South Sudan",
    "Barcelona, Spain",
    "Madrid, Spain",
    "Colombo, Sri Lanka",
    "Khartoum, Sudan",
    "Paramaribo, Suriname",
    "Stockholm, Sweden",
    "Bern, Switzerland",
    "Zurich, Switzerland",
    "Damascus, Syria",
    "Taipei, Taiwan",
    "Dushanbe, Tajikistan",
    "Dodoma, Tanzania",
    "Bangkok, Thailand",
    "Lome, Togo",
    "Nuku'alofa, Tonga",
    "Port of Spain, Trinidad and Tobago",
    "Tunis, Tunisia",
    "Ankara, Turkey",
    "Istanbul, Turkey",
    "Ashgabat, Turkmenistan",
    "Funafuti, Tuvalu",
    "Abu Dhabi, UAE",
    "Dubai, UAE",
    "Kampala, Uganda",
    "Kyiv, Ukraine",
    "Montevideo, Uruguay",
    "Charlotte Amalie, US Virgin Islands",
    "Tashkent, Uzbekistan",
    "Port-Vila, Vanuatu",
    "Caracas, Venezuela",
    "Hanoi, Vietnam",
    "Ho Chi Minh City, Vietnam",
    "Cardiff, Wales",
    "Swansea, Wales",
    "Sana, Yemen",
    "Sana'a, Yemen",
    "Lusaka, Zambia",
    "Harare, Zimbabwe",
];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    initializeCityInput();
    initializeDateSlider();
    initializeTimeToggle();
});

// City input with typeahead functionality
async function initializeCityInput() {
    const cityInput = document.getElementById('cityInput');
    const suggestions = document.getElementById('suggestions');

    // Fetch list of worldwide cities with a population of at least 100,000
    // from public OpenDataSoft dataset
    let cityList = popularCities;
    try {
        const minCitySize = 100_000;
        const params = new URLSearchParams({
            select: 'name,admin1_code,cou_name_en,country_code,population',
            where: `population >= ${minCitySize}`,
            order_by: 'name',
        });
        const citySearchBaseUrl = 
            `https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/geonames-all-cities-with-a-population-1000/exports/json`;
        const cityResponse = await fetch(`${citySearchBaseUrl}?${params.toString()}`);
        if (!cityResponse.ok) {
            throw new Error(`Failed to fetch city data: ${cityResponse.status} - ${cityResponse.statusText}`);
        }
        const cityData = await cityResponse.json();
        cityList = cityData.map(city => formatCityName(city));
    } catch (error) {
        // Naturally falls back to hard-coded list of popular cities above
        console.error('Error fetching city data:', error);
    }
    
    cityInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        
        if (query.length < 2) {
            suggestions.style.display = 'none';
            return;
        }
        
        const filteredCities = cityList.filter(city => 
            city.toLowerCase().includes(query)
        ).slice(0, 10); // Limit to 10 suggestions
        
        if (filteredCities.length > 0) {
            suggestions.innerHTML = filteredCities.map(city =>
                `<div class="suggestion-item">${city}</div>`
            ).join('');
            suggestions.querySelectorAll('.suggestion-item').forEach((el, i) => {
                el.addEventListener('click', () => selectCity(filteredCities[i]));
            });
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

function formatCityName(city) {
    const cityName = city.name;
    const admin1Code = city.admin1_code;
    const countryCode = city.country_code;
    const countryName = city.cou_name_en;

    if (countryCode === 'US') {
        return `${cityName}${admin1Code ? `, ${admin1Code}` : ''}, USA`;
    }
    return `${cityName}, ${countryName}`;
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
    const mapAndControls = document.getElementById('mapAndControls');
    
    showLoadingIndicators();
    mapAndControls.style.display = 'none';
    
    try {
        const today = new Date();
        const response = await fetch('/lookup_sun_angles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                address: cityName,
                start_date: today.toISOString().split('T')[0], // YYYY-MM-DD format
                time_of_day: currentTimeOfDay
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentCityData = data;
            sunAnglesData = data.sun_angles;
            
            // Set the date range for the slider
            startDate = new Date(data.start_date);
            endDate = new Date(data.end_date);
            
            // Set current day to 0 (first day of the range)
            currentDayOfYear = 0;
            
            // Update the date slider range
            updateDateSliderRange();
            
            // Clear canvas before initializing map for new city
            if (ctx && canvas) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            
            // Clean up existing road filter
            if (typeof RoadFilter !== 'undefined') {
                RoadFilter.cleanup();
            }
            
            // Initialize map
            initializeMap(data.coordinates.lat, data.coordinates.lon);
            
            // Show controls
            mapAndControls.style.display = 'block';
            
            // Update azimuth display
            updateAzimuthDisplay();
            
            // Fetch street data from Overpass API and then initialize road filtering
            try {
                console.log('Fetching street data from Overpass API...');
                const rawOverpassData = await fetchStreetDataFromOverpass(data.coordinates);
                
                // Initialize road filtering with the raw Overpass data for processing
                if (typeof RoadFilter !== 'undefined') {
                    RoadFilter.initializeWithOverpassData(data.coordinates, sunAnglesData, rawOverpassData);
                }
                
                // Hide loading indicator after Overpass API completes successfully
                updateDateDisplay();
                hideLoadingIndicators();
                
            } catch (error) {
                console.error('Error fetching street data:', error);
                updateDateDisplay();
                hideLoadingIndicators();
            }
            
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Network error. Please try again.');
    } finally {
        updateDateDisplay();
        hideLoadingIndicators();
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
    
    // Set slider to 0 (first day of the range)
    currentDayOfYear = 0;
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

function updateDateSliderRange() {
    if (!startDate || !endDate) return;
    
    const dateSlider = document.getElementById('dateSlider');
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    // Update slider attributes
    dateSlider.min = 0;
    dateSlider.max = daysDiff - 1;
    dateSlider.value = currentDayOfYear;
    
    // Update the date range labels
    const dateSliderContainer = document.querySelector('.date-slider-container');
    const startLabel = dateSliderContainer ? dateSliderContainer.querySelector('div[style*="justify-content: space-between"]') : null;
    if (startLabel) {
        const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
        const startDay = startDate.getDate();
        const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
        const endDay = endDate.getDate();
        const endYear = endDate.getFullYear();
        
        startLabel.innerHTML = `
            <span>${startMonth} ${startDay}</span>
            <span>Day of Year</span>
            <span>${endMonth} ${endDay}, ${endYear}</span>
        `;
    }
}

function updateDateDisplay() {
    const dateDisplay = document.getElementById('dateDisplay');
    const selectedDate = document.getElementById('selectedDate');
    
    if (!startDate) {
        dateDisplay.textContent = 'Select a city first';
        selectedDate.textContent = '-';
        return;
    }
    
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
    
    // Update road highlights for current azimuth
    if (typeof RoadFilter !== 'undefined') {
        RoadFilter.updateHighlightsForAzimuth(azimuth);
    }
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
        
        // Add road filter event listeners
        if (typeof RoadFilter !== 'undefined') {
            map.on('moveend', RoadFilter.debounceMapUpdate);
            map.on('zoomend', RoadFilter.debounceMapUpdate);
        }
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
    
    // Update road highlights for current azimuth
    if (typeof RoadFilter !== 'undefined') {
        RoadFilter.updateHighlightsForAzimuth(azimuth);
    }
    
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
    const iconDistance = 330; // pixels from center
    const iconX = centerX + Math.cos(azimuthRad) * iconDistance;
    const iconY = centerY + Math.sin(azimuthRad) * iconDistance;
    
    // Draw the icon
    ctx.save();
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = '#DC816E';
    ctx.strokeStyle = '#DC816E';
    ctx.lineWidth = 2;
    
    const iconSize = 20;
    
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
    if (!startDate) {
        return new Date(); // Fallback to today if no start date
    }
    
    const date = new Date(startDate);
    date.setDate(date.getDate() + dayOfYear); // Add the day offset to start date
    return date;
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

// Overpass API functions - only for fetching raw data
function calculateBounds(lat, lon, radiusKm) {
    const latDelta = radiusKm / 111.0;
    const lonDelta = radiusKm / (111.0 * Math.cos(Math.PI * lat / 180));
    
    return {
        north: lat + latDelta,
        south: lat - latDelta,
        east: lon + lonDelta,
        west: lon - lonDelta
    };
}

function buildOverpassQuery(bounds) {
    return `
[out:json][timeout:60];
(
  way["highway"~"^(primary|secondary|tertiary|residential|trunk|motorway|unclassified|service)$"]
  ["name"]
  (${bounds.south},${bounds.west},${bounds.north},${bounds.east});
);
out geom;
    `.trim();
}

async function fetchStreetDataFromOverpass(coordinates) {
    const bounds = calculateBounds(coordinates.lat, coordinates.lon, 25); // 25km radius
    const query = buildOverpassQuery(bounds);
    
    console.log('Fetching street data from Overpass API for', coordinates);
    
    const response = await fetch(OVERPASS_CONFIG.url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(query)}`
    });
    
    if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data; // Return raw Overpass data, let RoadFilter process it
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
