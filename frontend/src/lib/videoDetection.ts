import { DetectionResult, DetectionResponse } from '../types/detection';

export async function detectFrame(imageData: string): Promise<DetectionResponse> {
  try {
    console.log('🔍 Starting detection...');
    console.log('📏 Image data length:', imageData.length);
    
    // Remove data URL prefix if present
    const base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData;
    console.log('📦 Sending base64 data length:', base64Data.length);
    
    // Increase timeout to 60 seconds for AI processing
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    console.log('🌐 Making request to backend...');
    const response = await fetch('http://localhost:8000/detect_frame', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: base64Data }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    console.log('📡 Response received! Status:', response.status);
    console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error response:', errorText);
      throw new Error(`Backend error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Backend response:', result);

    return {
      count: result.count || 0,
      detections: (result.detections || []).map((det: Omit<DetectionResult, 'id'>, index: number): DetectionResult => ({
        ...det,
        id: `detection-${Date.now()}-${index}`,
        class: det.class || 'fish',
      })),
    };

  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('⏰ Request timeout - backend took too long to respond (60s limit)');
        throw new Error('Detection timeout: Backend is taking too long to process the image. This might be due to model loading or large image size.');
      } else {
        console.error('❌ Detection failed:', error.message);
        throw new Error(`Detection failed: ${error.message}`);
      }
    } else {
      console.error('❌ Detection failed with unknown error:', error);
      throw new Error('Detection failed with unknown error');
    }
  }
}