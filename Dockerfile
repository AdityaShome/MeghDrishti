FROM python:3.11-slim

# libeccodes2 is needed at runtime by cfgrib/eccodes (ECMWF GRIB decoding,
# used by nowcast/ingestion/ecmwf_weather.py) - pip alone doesn't provide
# the native eccodes library.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libeccodes0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY nowcast ./nowcast

EXPOSE 8000

CMD ["uvicorn", "nowcast.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
