<h1 align="center"> Real-Time Music Map </h1> <br>
<p align="center">
  <img alt="bbc-logo-app" title="bbc-logo-app" src="https://github.com/user-attachments/assets/cd753c9f-6531-4116-bb5a-5a7d21b9166d" width="450">
</p>

<p align="center">
  See the sound around you - live.
</p>

<p align="center">
  <a href="...">
    <img alt="Download on the App Store" title="App Store" src="http://i.imgur.com/0n2zqHD.png" width="140">
  </a>

  <a href="...">
    <img alt="Get it on Google Play" title="Google Play" src="http://i.imgur.com/mtGRPuM.png" width="140">
  </a>
</p>

<p align="center">
  <a href="#introduction">Introduction</a> •
  <a href="#features">Features</a> •
  <a href="#feedback">Feedback</a> •
  <a href="#build-process">Build Process</a> •
  <a href="#built-using">Built Using</a> •
  <a href="#contributors">Contributors</a> •
  <a href="#license">License</a>
</p>

## Introduction

Real-Time Music Map is a live geosocial platform that visualizes what people are listening to around you. Connect your Spotify account, see nearby listeners, explore local trends, and share your own music vibe — all in real-time.

**Available for both iOS and Android.**

<p align="center">
  <img src = "https://github.com/user-attachments/assets/38367c69-dd06-45f7-bd3c-0fa496e9ea3b" width=350>
</p>


## Features

### 🎵 Live Music Visualization
- **Real-time listener map**: See nearby users with their currently playing tracks.
- **Hotspots**: Identify areas with high musical activity (popular hangouts or public places).
- **Geohash precision**: Adjustable location granularity (pinpoint exact or general area).

### 🔐 Privacy & Sharing
- **Multi-mode visibility**:
  - 🌍 Public - visible to all users
  - 👥 Friends-only - share with connections
  - 👻 Ghost mode - hide location (shows only music data)
- **Proximity ghosts**: Animated indicators for nearby ghost-mode users.

### 🎧 Music Integration
- **Spotify sync**: Display your currently playing track automatically.
- **Listening history**: Recent plays with timestamps.
- **Top stats**: Favorite artists/albums/tracks.

### 📊 Local Music Analytics
- **Area trends**: See what's popular in specific zones (hotspots or draw custom areas).
- **Time filters**: Compare trends by hour/day/week.
- **Heatmaps**: Visualize musical activity density.

### 🤝 Social Features
- **Friend system**: Add users or auto-follow option.
- **Block list**: Manage unwanted interactions.
- **Playlist sharing**: Recommend tracks to others.

### ⚙️ Technical Features
- **Battery-optimized updates**: Smart location refresh intervals.
- **Cross-platform**: Works on iOS and Android.
- **Secure auth**: Spotify OAuth2 login with minimal permissions.

<p align="center">
  <img src = "https://github.com/user-attachments/assets/c33462e5-ad18-4d1e-944f-2c6a0f6cef06" width=750>
</p>


## Feedback

Feel free to send us feedback on [Discord](http://discord.com/users/859168656356933693) or [file an issue](https://github.com/gitpoint/git-point/issues/new). Feature requests are always welcome. If you wish to contribute, please take a quick look at the [guidelines](./CONTRIBUTING.md)!

## Documentation
- ### [Database](/database/README.md)


## Build Process

Install all dependencies:

```
cd real-time-music-map
npm run install:all
```

Setup environment variables

```
change .env_sample to .env and setup your API/private keys
```

Run server:

```
cd /backend
npm run dev
```

Run react native app

```
cd /frontend
npx expo start
```
## Built Using

- React Native (Expo)
- TailwindCSS
- Node.js + Express.js
- PostgreSQL + PostGIS
- Spotify OAuth2
- Docker

## Contributors

•  [Emilia Biros](https://github.com/emiliabiros) <br>
•  [Filip Jarzyna](https://github.com/filipjarzyna)<br>
•  [Jakub Steć](https://github.com/jakubstec) <br>
•  [Aleksander Wiśniewski](https://github.com/avvvis)

## License

MIT

---
