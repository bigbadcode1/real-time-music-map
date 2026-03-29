/**
 * TrackDTO - Data Transfer Object for currently playing track data.
 * Transforms the raw Spotify API track object into a standardized
 * format used across the application.
 */
export class TrackDTO {
  constructor({ name, artist, album_name, image, duration, progress, uri, id }) {
    this.id = id;
    this.name = name;
    this.artist = artist;
    this.album_name = album_name;
    this.image = image ?? null;
    this.duration = duration;
    this.progress = progress;
    this.uri = uri;
  }

  static fromSpotifyTrack(track) {
    if (!track) return null;
    return new TrackDTO(track);
  }
}

/**
 * CurrentlyPlayingDTO - wraps TrackDTO with playback state.
 */
export class CurrentlyPlayingDTO {
  constructor(isPlaying, track) {
    this.isPlaying = isPlaying;
    this.track = track ? TrackDTO.fromSpotifyTrack(track) : null;
  }

  static from({ isPlaying, track }) {
    return new CurrentlyPlayingDTO(isPlaying, track);
  }
}
