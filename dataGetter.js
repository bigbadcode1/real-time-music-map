import {getCurrentlyPlayingTrack} from "./spotifyPlayer.js";
import req from "express/lib/request.js";


export async function getCurrentUserData(accessToken){

    const track = await getCurrentlyPlayingTrack(accessToken);
    const location = {"lat" : "123", "lon" : "321"}; // implement fetching from frontend later

    let result = {}; // result data to return
    result["location"] = location;
    result["track_name"] = track.name;
    result["artist_name"] = track.artist_name;
    result["album_name"] = track.album_name;
    result["album_cover"] = track.albumArt;


    return result;
}

