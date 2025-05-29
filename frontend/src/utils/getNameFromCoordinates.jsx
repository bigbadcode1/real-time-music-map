import * as Location from 'expo-location';

export async function getNameFromCoordinates({ latitude, longitude }) {
    try {
        const address = await Location.reverseGeocodeAsync({ latitude, longitude });

        // The response is an array of address objects
        if (address.length > 0) {
            // sometimes name is weird like: 
            // name: "2" so then just return "Hotspot"
            return address[0].name.length < 5 ? "Hotspot" : address[0].name;
            
        }
        return "Hotspot";
    } catch (error) {
        console.error('[getNameFromCoordinates.js] Error:', error);
        return "Hotspot";
    }
}