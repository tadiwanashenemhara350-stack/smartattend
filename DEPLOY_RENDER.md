# Deploy SmartAttend on Render

## What is already prepared

- `render.yaml` provisions:
  - a Docker-based web service named `smartattend`
  - a Render Postgres database named `smartattend-db`
- `Dockerfile` builds the React frontend and serves it through FastAPI
- the backend reads `DATABASE_URL` and `SECRET_KEY` from environment variables
- `robots.txt` and `sitemap.xml` are generated dynamically for the live domain

## Deploy steps

1. Push this project to a GitHub, GitLab, or Bitbucket repository.
2. In Render, choose `New` -> `Blueprint`.
3. Connect the repository that contains this project.
4. Render will detect `render.yaml`.
5. Review the generated resources:
   - web service: `smartattend`
   - Postgres database: `smartattend-db`
6. Create the Blueprint and wait for the first deploy to finish.
7. Open the generated `onrender.com` URL and complete the first admin initialization from `/login`.

## Recommended Render settings

- Keep the web service on a paid plan such as `starter` if you want the app available without free-tier sleep behavior.
- Keep the database on Render Postgres instead of SQLite for real production use.

## Make it discoverable on Google

1. After the site is live, copy the public site URL.
2. In Google Search Console, add that URL as a property.
3. Submit `/sitemap.xml`.
4. Use the URL inspection tool to request indexing for `/` and `/login`.

## Important note

- Google indexing is not instant. The app can be publicly reachable right away, but appearing in Google Search can still take time after submission.
