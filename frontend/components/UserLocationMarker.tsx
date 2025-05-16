import React from 'react';
import { Marker } from 'react-native-maps';
import * as geohash from 'ngeohash';

interface UserLocationMarkerProps {
  latitude: number;
  longitude: number;
}

const UserLocationMarker: React.FC<UserLocationMarkerProps> = ({ latitude, longitude }) => {
  const hash = geohash.encode(latitude, longitude, 7);
  
  return (
    <Marker
      coordinate={{ latitude, longitude }}
      title="You"
      description={`Geohash: ${hash}`}
    />
  );
};

export default UserLocationMarker;