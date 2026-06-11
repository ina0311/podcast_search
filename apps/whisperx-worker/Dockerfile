FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg curl git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

# whisperx の依存解決で CUDA torch が引き込まれるため、インストール後に CPU 版で上書き
# その後 CUDA/triton 系パッケージをアンインストールしてイメージを軽量化
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir --force-reinstall \
        torch torchaudio \
        --index-url https://download.pytorch.org/whl/cpu \
    && pip uninstall -y triton \
        nvidia-cublas-cu12 nvidia-cuda-cupti-cu12 nvidia-cuda-nvrtc-cu12 \
        nvidia-cuda-runtime-cu12 nvidia-cudnn-cu12 nvidia-cufft-cu12 \
        nvidia-cufile-cu12 nvidia-curand-cu12 nvidia-cusolver-cu12 \
        nvidia-cusparse-cu12 nvidia-cusparselt-cu12 nvidia-nccl-cu12 \
        nvidia-nvjitlink-cu12 nvidia-nvtx-cu12 \
        2>/dev/null || true

COPY . .

EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
