const axios = require('axios');

exports.geocodePincode = async (pincode) => {
    try {
        if (!pincode) return null;
        
        const url = `https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=india&format=json&limit=1`;
        const response = await axios.get(url, { 
            headers: { 'User-Agent': 'FarmConnectPlatform/1.0' } 
        });
        
        if (response.data && response.data.length > 0) {
            return {
                lat: parseFloat(response.data[0].lat),
                lng: parseFloat(response.data[0].lon) // Nominatim returns 'lon'
            };
        }
        return null;
    } catch (error) {
        console.error("Geocoding failed silently:", error.message);
        return null;
    }
};
