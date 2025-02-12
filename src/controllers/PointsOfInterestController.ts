import dotenv from 'dotenv';
dotenv.config();

import * as pointOfInterestDataSource from '../dataSources/pointOfInterestDataSource';
import DataBaseService from '../services/dataBaseService';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!GOOGLE_PLACES_API_KEY) {
  console.error('Missing GOOGLE_PLACES_API_KEY environment variable.');
  process.exit(1);
}

const getPointsOfInterest = async (dataBaseService:DataBaseService, latitude:number, longitude:number, radius:number ) => {
    
    const dbData = await pointOfInterestDataSource.getPointsOfInterest(dataBaseService, latitude, longitude, radius);
    if(dbData && dbData.length >= 20){
        console.log('Returning data from database');
        return dbData;
    }
    const googleData = await getPointsOfInterestFromGoogle(latitude, longitude, radius);   
    if(!googleData || googleData["error"] || !googleData.places){
        return googleData;
    }
    const pointsOfInterest = googleData.places.map((result:any) => {
        const { latitude, longitude } = result.location;
        const rating = result.rating ? result.rating : 0;
        const name = result.displayName.text;
        const url = result.websiteUri;
        const address = result.formattedAddress;
        const type = result.primaryType || 'Unknown';
        const opening_hours = result.regularOpeningHours ? result.regularOpeningHours.weekdayDescriptions.join() : "Unknown";
        const reviews = result.reviews?.map((review:any) => ({review: review?.text?.text})) || [];
        return { latitude, longitude, name, url, address, type, opening_hours, rating, reviews };
    });
    await pointOfInterestDataSource.addPointsOfInterest(dataBaseService, pointsOfInterest);
    if(dbData && dbData.length > 0){
        console.log('Returning data from database and google');
        return [...dbData, ...pointsOfInterest];
    }
    console.log('Returning data from google');
    return pointsOfInterest;
}

export default getPointsOfInterest;

const getPointsOfInterestFromGoogle = async (latitude:number, longitude:number, radius:number ) => {
    try {
        // Define the Google Places API endpoint URL.
        const googleUrl = 'https://places.googleapis.com/v1/places:searchText';
  
        // Build the request body as required by the API.
        const requestBody = {
            textQuery: `Gyms, Yoga Studios and Fitness Centers`,
            "locationBias": {
                "circle": {
                    "center": {
                        "latitude": latitude,
                        "longitude": longitude
                    },
                    "radius": radius 
                }
            }
        };
  
        // Make a POST request to the Google Places API using fetch.
        const response = await fetch(googleUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
            'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.rating,places.regularOpeningHours.weekdayDescriptions,places.websiteUri,places.primaryType,places.reviews'
          },
          body: JSON.stringify(requestBody)
        });
  
        if (!response.ok) {
          // If the response isn't OK, forward the status code and error.
          return { error: `HTTP error! status: ${response.status}` };
        }
  
        const data = await response.json();
        return data;
      } catch (error: any) {
        return{ error: 'Error fetching data from Google Places API.' };
      }
}