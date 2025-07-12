# 🌅 Henge Finder 

Finds when the sun aligns with your street for a perfect sunset view (like [Manhattanhenge](https://en.wikipedia.org/wiki/Manhattanhenge)).

- Enter an address to check for alignment with the sunset (or more specifically, alignment a little before sunset)
- Shows street bearing and sun alignment information
- Displays coordinates and next henge date (if there is one)

## Installing & Running

   ```bash
   pip install -r requirements.txt
   ```
That's it! Then just run with 

```
python hengefinder.py
```

Some sample addresses:

- `211 E 43rd St, NYC` (Manhattanhenge location)
- `493 Eastern Pkwy, Brooklyn, NY 11225`
- `601-615 E 76th St, Chicago, IL` 
- `3131 Market St, Philadelphia, PA 19104`

## How It Works

The app uses:
- **Geopy** for address geocoding
- **OSMnx** for street network analysis and road bearing calculation
- **Astral** for astronomical calculations (sun position)
- **TimezoneFinder** for timezone detection

The algorithm searches for dates when the sun's azimuth at 0.5 degrees elevation (shortly before sunset) aligns with the street's bearing.