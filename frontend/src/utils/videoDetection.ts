import { Detection } from '../types/detection';

interface RawFrameData {
  imageData: string;
  fishCount: number;
  detections: Detection[];
}

export const processVideoWithBackend = async (
  file: File,
  onProgress: (progress: number) => void,
  onFrameProcessed: (frameData: RawFrameData) => void,
  shouldStop: () => boolean
) => {
  return new Promise<void>((resolve, reject) => {
    const video = document.createElement("video");
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    video.addEventListener("loadeddata", () => {
      const duration = video.duration;
      const fps = 1; // One frame per second, adjust as needed
      const totalFrames = Math.floor(duration * fps);
      let currentFrame = 0;

      const captureNextFrame = () => {
        if (shouldStop()) {
          resolve();
          return;
        }
        if (currentFrame > totalFrames) {
          resolve();
          return;
        }
        video.currentTime = currentFrame / fps;
      };

      video.addEventListener("seeked", async () => {
        if (shouldStop()) {
          resolve();
          return;
        }
        if (!ctx) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageDataUrl = canvas.toDataURL("image/jpeg");

        try {
          const blob = await (await fetch(imageDataUrl)).blob();
          const formData = new FormData();
          formData.append("file", blob, "frame.jpg");

          const response = await fetch("http://localhost:8000/detect", {
            method: "POST",
            body: formData,
          });

          const result = await response.json();

          const frameData: RawFrameData = {
            imageData: result.imageData,
            fishCount: result.fishCount,
            detections: result.detections,
          };

          onFrameProcessed(frameData);

          currentFrame++;
          onProgress((currentFrame / totalFrames) * 100);

          setTimeout(captureNextFrame, 200);
        } catch (err) {
          reject(err);
        }
      });

      captureNextFrame();
    });

    video.addEventListener("error", (err) => {
      reject(err);
    });
  });
};

export const sendImageToBackend = async (file: File): Promise<RawFrameData> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("http://localhost:8000/detect", {
    method: "POST",
    body: formData,
  });

  const result = await response.json();

  return {
    imageData: result.imageData,
    fishCount: result.fishCount,
    detections: result.detections,
  };
};
