from flask import Flask, render_template, request, jsonify, send_from_directory
from config import TARGET_ALTITUDE_DEG
from hengefinder import search_for_henge
import datetime
from utils import get_location, get_coordinates, get_standardized_address, get_concise_address, get_road_bearing, GeocodingError, check_latitude, get_utc_start_date, normalize_bearing_to_180_360
import traceback
from astral import Observer, sun
from sunset_calculator import calculate_sun_azimuths_for_year
from zoneinfo import ZoneInfo
import os


app = Flask(__name__)

def make_observer():
    address = "251 W 42nd St, New York, NY"  # Fixed Manhattan address for demonstration
    # Get coordinates for the fixed address
    location = get_location(address)
    lat, lon = get_coordinates(location)
    return Observer(lat, lon)

demo_observer = make_observer()


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/henge_near_me')
def henge_near_me():
    return render_template('henge_near_me.html')

@app.route('/lookup_azimuth_altitude', methods=['POST'])
def lookup_azimuth_altitude():
    """Endpoint that handles azimuth and altitude lookup for visualization"""
    try:
        data = request.get_json()
        time_str = data.get('time')
        demo_road_bearing =299.5  # Default Manhattan bearing
        
        if not time_str:
            return jsonify({'error': 'Time parameter is required'}), 400
            
        # Parse the time string
        exact_time = datetime.datetime.fromisoformat(time_str.replace('Z', '+00:00'))
        
        graphic_az = sun.azimuth(demo_observer, exact_time) - demo_road_bearing 
        alt = sun.elevation(demo_observer, exact_time)
        
        return jsonify({
            'graphic_az': graphic_az,
            'altitude': alt,
        })
        
    except Exception as e:
        print(f"Unexpected error in lookup_azimuth_altitude: {e}")
        traceback.print_exc()
        return jsonify({'error': 'An unexpected error occurred while calculating sun position.'}), 500

@app.route('/lookup_address', methods=['POST'])
def lookup_address():
    """Endpoint that handles both address lookup and henge calculation"""
    try:
        data = request.get_json()
        address = data.get('address')
        user_road_bearing = data.get('road_bearing')  # Optional user-provided bearing
        
        if not address:
            return jsonify({'error': 'Please enter an address to search for henge alignments.'}), 400



        # Get coordinates and standardized address
        try:
            location = get_location(address)
            lat, lon = get_coordinates(location)

            standardized_address = get_standardized_address(location)
            concise_address = get_concise_address(location)
            try:
                check_latitude(lat)
            except ValueError as e:
                return jsonify({'error': str(e)}), 400
        except GeocodingError as e:
            print(f"Geocoding error: {e}")
            return jsonify({
                'error': f"Could not find the address '{address}'. Please check the spelling and try again."
            }), 400
        except Exception as e:
            print(f"Unexpected error getting coordinates: {e}")
            return jsonify({'error': f'Error processing address: {str(e)}'}), 400

        # Get road bearing (use user-provided if available, otherwise calculate)
        try:
            if user_road_bearing is not None:
                road_bearing = float(user_road_bearing)
                
                # Normalize to 180-360 range
                road_bearing = normalize_bearing_to_180_360(road_bearing)
            else:
                road_bearing = get_road_bearing(lat, lon)
        except (ValueError, TypeError) as e:
            print(f"Error with road bearing value: {e}")
            return jsonify({
                'error': "Invalid road bearing value provided. Please try adjusting the arrow again."
            }), 400
        except Exception as e:
            print(f"Error getting road angle: {e}")
            return jsonify({
                'error': "Could not determine the street direction at this location. This might happen if the address is not near a mapped road, or if the road data is incomplete. Try using a different address on the same street."
            }), 400

        # If user provided a bearing, calculate henge; otherwise just return address info
        if user_road_bearing is not None:
            # Calculate henge
            start_date = get_utc_start_date()
            result = search_for_henge(lat, lon, start_date, road_bearing=road_bearing)
            
            return jsonify({
                'address': standardized_address,
                'concise_address': concise_address,
                'coordinates': {'lat': lat, 'lon': lon},
                'road_bearing': round(road_bearing, 2),
                'result': result
            })
        else:
            # Just return address info for initial display
            return jsonify({
                'address': standardized_address,
                'concise_address': concise_address,
                'coordinates': {'lat': lat, 'lon': lon},
                'road_bearing': round(road_bearing, 2)
            })

    except Exception as e:
        print(f"Unexpected error: {e}")
        traceback.print_exc()
        return jsonify({
            'error': 'An unexpected error occurred while processing your request. Please try again or contact support if the problem persists.'
        }), 500


@app.route("/cities", methods=["GET"])
def cities():
    """Return list of cities for the UI dropdown"""
    popular_cities = [
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
        "Kerkrade, Netherlands",
    ]
    return jsonify(popular_cities)


@app.route("/lookup_sun_angles", methods=["POST"])
def lookup_sun_angles():
    """Endpoint that calculates sun azimuth for every day of the year at a given location"""
    try:
        data = request.get_json()
        address = data.get('address')
        start_date = data.get('start_date')  # Optional: start date in YYYY-MM-DD format
        time_of_day = data.get('time_of_day', 'sunrise')  # Optional: default to sunrise
        target_altitude_deg = data.get('target_altitude_deg', TARGET_ALTITUDE_DEG) # Optional: default to 0.5 degrees
        
        if not address:
            return jsonify({'error': 'Please enter an address to calculate sun angles.'}), 400

        # Validate time_of_day parameter
        if time_of_day not in ['sunrise', 'sunset']:
            return jsonify({'error': 'time_of_day must be either "sunrise" or "sunset"'}), 400

        # Get coordinates and standardized address
        try:
            location = get_location(address)
            lat, lon = get_coordinates(location)
            standardized_address = get_standardized_address(location)
            
            try:
                check_latitude(lat)
            except ValueError as e:
                return jsonify({'error': str(e)}), 400
                
        except GeocodingError as e:
            print(f"Geocoding error: {e}")
            return jsonify({
                'error': f"Could not find the address '{address}'. Please check the spelling and try again."
            }), 400
        except Exception as e:
            print(f"Unexpected error getting coordinates: {e}")
            return jsonify({'error': f'Error processing address: {str(e)}'}), 400

        # Parse start date if provided, otherwise use January 1 of current year
        if start_date:
            try:
                start_date_obj = datetime.datetime.strptime(start_date, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Invalid start date format. Use YYYY-MM-DD format.'}), 400
        else:
            # Default to January 1 of current year
            current_year = datetime.now(ZoneInfo("UTC")).year
            start_date_obj = datetime(current_year, 1, 1).date()

        # Calculate end date (one year later)
        end_date_obj = datetime.datetime(start_date_obj.year + 1, start_date_obj.month, start_date_obj.day).date()

        # Calculate sun angles with henge detection
        try:
            result = calculate_sun_azimuths_for_year(lat, lon, start_date=start_date_obj, target_altitude_deg=target_altitude_deg, time_of_day=time_of_day)
            
            # Add address and coordinate info to response
            response_data = {
                'address': standardized_address,
                'coordinates': {'lat': lat, 'lon': lon},
                'start_date': start_date_obj.isoformat(),
                'end_date': end_date_obj.isoformat(),
                'time_of_day': time_of_day,
                'sun_angles': result
            }
            
            return jsonify(response_data)
            
        except Exception as e:
            print(f"Error calculating sun angles: {e}")
            traceback.print_exc()
            return jsonify({
                'error': f'An error occurred while calculating {time_of_day} angles. Please try again.'
            }), 500
            
    except Exception as e:
        print(f"Unexpected error in lookup_sun_angles: {e}")
        traceback.print_exc()
        return jsonify({
            'error': 'An unexpected error occurred while processing your request. Please try again or contact support if the problem persists.'
        }), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)