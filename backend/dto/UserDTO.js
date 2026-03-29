/**
 * UserDTO - Data Transfer Object for user data from hotspots.
 * Separates the database entity representation from the API response format,
 * and shapes the data for frontend consumption.
 */
export class UserDTO {
  constructor({ id, name, image, song_id, song_title, song_image, song_artist }) {
    this.id = id;
    this.name = name;
    this.avatar = image ?? null;
    this.song_id = song_id ?? null;
    this.song_title = song_title ?? null;
    this.song_artist = song_artist ?? null;
    this.song_image = song_image ?? null;
  }

  static fromDbRow(row) {
    return new UserDTO(row);
  }

  static fromDbRows(rows) {
    return rows.map(UserDTO.fromDbRow);
  }
}
