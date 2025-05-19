FROM postgis/postgis:16-3.5

# Install required dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    postgresql-server-dev-15 \
    git \
    cpanminus \
    make \
    libv8-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Perl dependencies for pgTAP
RUN cpanm TAP::Parser::SourceHandler::pgTAP

# Clone and install pgTAP
RUN git clone https://github.com/theory/pgtap.git \
    && cd pgtap \
    && make \
    && make install

# Clean up
RUN apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* /pgtap
