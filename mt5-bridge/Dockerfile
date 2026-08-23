FROM --platform=linux/amd64 debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV WINEDEBUG=-all
ENV WINEPREFIX=/home/mt5/.wine
ENV DISPLAY=:99

RUN dpkg --add-architecture i386 && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
      wine \
      wine32 \
      wine64 \
      xvfb \
      winbind \
      cabextract \
      wget \
      curl \
      ca-certificates \
      unzip \
      procps \
      tini && \
    rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash mt5

WORKDIR /app

COPY mt5-bridge /app/mt5-bridge

RUN chown -R mt5:mt5 /app /home/mt5

USER mt5

RUN mkdir -p /home/mt5/downloads /home/mt5/runtime

# Windows Python 3.11
RUN wget -q \
    https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe \
    -O /home/mt5/downloads/python.exe

# Official MetaQuotes MT5 installer
RUN wget -q \
    https://download.terminal.free/cdn/web/metaquotes.ltd/mt5/mt5setup.exe \
    -O /home/mt5/downloads/mt5setup.exe

COPY --chown=mt5:mt5 mt5-bridge/render-start.sh /app/mt5-bridge/render-start.sh

RUN chmod +x /app/mt5-bridge/render-start.sh

EXPOSE 10000

ENTRYPOINT ["/usr/bin/tini","--"]
CMD ["/app/mt5-bridge/render-start.sh"]
