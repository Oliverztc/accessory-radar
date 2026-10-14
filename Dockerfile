FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html app.js style.css /usr/share/nginx/html/
COPY config /usr/share/nginx/html/config
COPY fonts /usr/share/nginx/html/fonts
COPY data /usr/share/nginx/html/data
EXPOSE 80
