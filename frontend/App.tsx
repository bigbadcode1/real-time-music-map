import React from 'react';
import MapScreen from './src/screens/MapScreen';
import {SafeAreaView} from 'react-native'

export default function App() {
  return (
    <SafeAreaView style= {{ flex: 1}}>
      <MapScreen/>
    </SafeAreaView>
  )
}