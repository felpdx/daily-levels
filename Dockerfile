# Used by Easypanel. Only the public files go in, the same ones GitHub Pages publishes.
FROM nginx:stable-alpine
COPY index.html /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets
COPY data /usr/share/nginx/html/data
