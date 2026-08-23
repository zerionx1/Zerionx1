FROM --platform=linux/amd64 debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV WINEDEBUG=-all
ENV WINEPREFIX=/home/mt5/.wine
ENV WINEARCH=win64
ENV DISPLAY=:99
ENV XDG_RUNTIME_DIR=/home/mt5/.xdg-runtime
ENV WINEDLLOVERRIDES=mscoree,mshtml=
ENV WINE_SKIP_MONO_INSTALLATION=1
ENV WINE_SKIP_GECKO_INSTALLATION=1

RUN dpkg --add-architecture i386 && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
      ca-certificates wget gnupg && \
    mkdir -p /etc/apt/keyrings && \
    wget -qO- https://dl.winehq.org/wine-builds/winehq.key \
      | gpg --dearmor -o /etc/apt/keyrings/winehq-archive.gpg && \
    echo 'deb [arch=amd64,i386 signed-by=/etc/apt/keyrings/winehq-archive.gpg] https://dl.winehq.org/wine-builds/debian/ bookworm main' \
      > /etc/apt/sources.list.d/winehq-bookworm.list && \
    apt-get update && \
    apt-get install -y --install-recommends winehq-stable && \
    apt-get install -y --no-install-recommends \
      xvfb \
      winbind \
      cabextract \
      curl \
      unzip \
      procps \
      tini && \
    wine --version && \
    rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash mt5

WORKDIR /app

COPY . /app/mt5-bridge

RUN chown -R mt5:mt5 /app /home/mt5

USER mt5

RUN mkdir -p \
    /home/mt5/downloads \
    /home/mt5/runtime/python311 \
    /home/mt5/.xdg-runtime && \
    chmod 700 /home/mt5/.xdg-runtime

RUN wget -q \
    https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip \
    -O /home/mt5/downloads/python-embed.zip && \
    unzip -q /home/mt5/downloads/python-embed.zip \
      -d /home/mt5/runtime/python311

RUN sed -i 's/^#import site/import site/' \
    /home/mt5/runtime/python311/python311._pth

RUN wget -q \
    https://bootstrap.pypa.io/get-pip.py \
    -O /home/mt5/downloads/get-pip.py

# Build the Wine prefix now, not during Render startup.
# Mono/Gecko prompts are disabled for headless operation.
RUN set -eux; \
    Xvfb "$DISPLAY" -screen 0 1280x720x24 >/tmp/xvfb-build.log 2>&1 & \
    xvfb_pid=$!; \
    sleep 2; \
    timeout 180s wineboot -u; \
    timeout 30s wineserver -w || true; \
    test -f "$WINEPREFIX/drive_c/windows/system32/kernel32.dll"; \
    wine /home/mt5/runtime/python311/python.exe --version; \
    wine /home/mt5/runtime/python311/python.exe \
      /home/mt5/downloads/get-pip.py; \
    wine /home/mt5/runtime/python311/python.exe -m pip install \
      --disable-pip-version-check \
      --no-warn-script-location \
      fastapi==0.116.1 \
      uvicorn==0.35.0 \
      pydantic==2.11.7 \
      numpy==1.26.4 \
      MetaTrader5; \
    wine /home/mt5/runtime/python311/python.exe -c \
      "import MetaTrader5, fastapi, uvicorn, numpy; print('MT5 Python packages OK')"; \
    wineserver -k || true; \
    kill "$xvfb_pid" 2>/dev/null || true

RUN wget -q \
    https://download.terminal.free/cdn/web/metaquotes.ltd/mt5/mt5setup.exe \
    -O /home/mt5/downloads/mt5setup.exe

# Install MetaTrader 5 during image build so Render's 512 MiB
# runtime does not have to run the heavy installer.
RUN set -eux; \
    Xvfb "$DISPLAY" -screen 0 1280x720x24 >/tmp/xvfb-mt5.log 2>&1 & \
    xvfb_pid=$!; \
    sleep 2; \
    timeout 180s wine /home/mt5/downloads/mt5setup.exe /auto \
      >/tmp/mt5-installer.log 2>&1 || true; \
    sleep 10; \
    MT5_EXE="$(find "$WINEPREFIX/drive_c" -type f -iname 'terminal64.exe' | head -1 || true)"; \
    if [ -z "$MT5_EXE" ]; then \
      echo "===== MT5 INSTALLER LOG ====="; \
      cat /tmp/mt5-installer.log || true; \
      echo "===== EXE AUDIT ====="; \
      find "$WINEPREFIX/drive_c" -maxdepth 7 -type f -iname '*.exe' | tail -80 || true; \
      exit 1; \
    fi; \
    echo "MT5 installed at: $MT5_EXE"; \
    wineserver -k || true; \
    kill "$xvfb_pid" 2>/dev/null || true

COPY --chown=mt5:mt5 render-start.sh \
    /app/mt5-bridge/render-start.sh

RUN chmod +x /app/mt5-bridge/render-start.sh

EXPOSE 10000

ENTRYPOINT ["/usr/bin/tini","--"]
CMD ["/app/mt5-bridge/render-start.sh"]
