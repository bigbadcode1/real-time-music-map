/**
 * HotspotDTO - Data Transfer Object for hotspot data
 * Separates the database entity representation from the API response format.
 */
export class HotspotDTO {
  constructor({ geohash, longitude, latitude, count, last_updated }) {
    this.geohash = geohash;
    this.longitude = parseFloat(longitude);
    this.latitude = parseFloat(latitude);
    this.userCount = count;
    this.lastUpdated = last_updated ?? null;
  }

  static fromDbRow(row) {
    return new HotspotDTO(row);
  }

  static fromDbRows(rows) {
    return rows.map(HotspotDTO.fromDbRow);
  }
}
