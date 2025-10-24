# Enhanced Weather App

This is an enhanced version of the Weather App (Assignment 8). It includes:

- 5-day forecast display (cards)
- Search history (last 5 searched cities stored in localStorage)
- Detect user's city using Geolocation API
- Toggle between Celsius and Fahrenheit
- Improved UI styling and simple animations

Live deployment: Instructions below show how to deploy to GitHub Pages.

Setup
1. Copy `js/config.example.js` to `js/config.js` and add your OpenWeatherMap API key:

   const CONFIG = { OPENWEATHER_API_KEY: "YOUR_REAL_KEY" };

2. Open `index.html` in a browser, or serve the folder with a local static server for CORS-safe fetches.

Local testing (recommended):

Windows (PowerShell):

```powershell
# from the project folder
python -m http.server 8000
# then open http://localhost:8000 in your browser
```

Notes
- Do NOT commit `js/config.js` with your real API key. Add it to `.gitignore` if desired.
- To deploy, create a GitHub repository named `enhanced-weather-app` and push this folder. Then enable GitHub Pages from the repository settings (branch `main` or `gh-pages`) and the site will be available at `https://<your-username>.github.io/enhanced-weather-app/`.

Deliverables checklist

- GitHub repository: create and push to `enhanced-weather-app` (you'll need to run the git commands below locally or in your environment)
- GitHub Pages URL: enable Pages and paste the URL here when ready

Helpful git commands

```powershell
git init
git add .
git commit -m "Enhanced weather app - assignment 8"
git branch -M main
# create repo on GitHub (web UI) and then:
git remote add origin https://github.com/<your-username>/enhanced-weather-app.git
git push -u origin main
```

If you want, I can prepare a small script to create the repository via the GitHub CLI if you have it installed and authenticated locally—tell me and I will add it.
