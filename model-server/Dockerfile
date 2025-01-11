FROM python:3.10-slim

WORKDIR /opt/src

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt \
	&& rm -rf /root/.cache/pip

COPY main.py .

CMD ["python", "main.py"]