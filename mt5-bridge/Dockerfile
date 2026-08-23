FROM --platform=linux/amd64 debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV WINEDEBUG=-all
ENV WINEPREFIX=/home/mt5/.wine
ENV DISPLAY=:99

RUN dpkg --add-architecture i386 && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
      ca-certificates wget gnupg && \
    mkdir -p /etc/apt/keyrings && \
    wget -qO- https://dl.winehq.org/wine-builds/winehq.key \
      | gpg --dearmor -o /etc/apt/keyrings/winehq-archive.gpg && \
    printf 'Types: deb\\nURIs: https://dl.winehq.org/wine-builds/debian\\nSuites: bookworm\\nComponents: main\\nArchitectures: amd64 i386\\nSigned-By: /etc/apt/keyrings/winehq-archive.gpg\\n' \
      > /etc/apt/sources.list.d/winehq-bookworm.sources && \
    apt-get update && \
    apt-get install -y --install-recommends winehq-stable && \
    apt-get install -y --no-install-recommends \
      xvfb winbind cabextract curl unzip procps tini && \
    wine --version && \
    rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash mt5

WORKDIR /app

COPY . /app/mt5-bridge

RUN chown -R mt5:mt5 /app /home/mt5

USER mt5

RUN mkdir -p \
    /home/mt5/downloads \
    /home/mt5/runtime/python311

# Portable Windows Python — no GUI installer
RUN wget -q \
    https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip \
    -O /home/mt5/downloads/python-embed.zip && \
    unzip -q /home/mt5/downloads/python-embed.zip \
      -d /home/mt5/runtime/python311

# Enable site-packages in embedded Python
RUN sed -i 's/^#import site/import site/' \
    /home/mt5/runtime/python311/python311._pth

# pip bootstrap
RUN wget -q \
    https://bootstrap.pypa.io/get-pip.py \
    -O /home/mt5/downloads/get-pip.py

# Official MetaTrader 5 installer
RUN wget -q \
    https://download.terminal.free/cdn/web/metaquotes.ltd/mt5/mt5setup.exe \
    -O /home/mt5/downloads/mt5setup.exe

COPY --chown=mt5:mt5 render-start.sh \
    /app/mt5-bridge/render-start.sh

RUN chmod +x /app/mt5-bridge/render-start.sh

EXPOSE 10000

ENTRYPOINT ["/usr/bin/tini","--"]
CMD ["/app/mt5-bridge/render-start.sh"]
