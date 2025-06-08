import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI('AIzaSyBxspH--NA3YUE_XmU9IXv-LIlhm8NzNs4');

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function checkApiConnection(): Promise<boolean> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent('Hello, are you working?');
    const response = await result.response;

    return !!response;
  } catch (error) {
    console.error('API connection check failed:', error);
    throw new Error('Failed to connect to the Gemini API');
  }
}

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 5,
  initialDelay: number = 2000
): Promise<T> {
  let retries = 0;
  let lastError: Error | null = null;

  while (retries < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      if (error instanceof Error &&
        (error.message.includes('503') || error.message.includes('overloaded'))) {
        const waitTime = initialDelay * Math.pow(2, retries) + Math.random() * 1000;
        console.log(`Retrying after ${Math.round(waitTime)}ms (attempt ${retries + 1}/${maxRetries})`);
        await delay(waitTime);
        retries++;
        continue;
      }

      throw error;
    }
  }

  throw new Error('Maximum retries reached. The service is currently unavailable. Please try again later.');
}

export async function analyzeXrayImage(imageUrl: string, prompt: string, language: string = 'english'): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    if (!imageUrl && language !== 'english') {
      const generateContent = async () => {
        const result = await model.generateContent([
          {
            text: `You are a medical professional. ${prompt} Provide the response in ${language} language.`
          }
        ]);

        const response_text = await result.response;
        if (!response_text) {
          throw new Error('No response from Gemini API');
        }

        return response_text.text();
      };

      return await retryWithBackoff(generateContent);
    }

    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch image');
    }

    const imageBlob = await response.blob();
    const base64Image = await blobToBase64(imageBlob);

    let languagePrompt = '';

    if (language === 'hindi') {
      languagePrompt = 'Provide the analysis in Hindi language.';
    } else if (language === 'marathi') {
      languagePrompt = 'Provide the analysis in Marathi language.';
    }

    const generateContent = async () => {
      const result = await model.generateContent([
        {
          text: `You are a medical professional analyzing an X-ray image. Please provide a detailed analysis based on the following prompt: ${prompt}. ${languagePrompt}`
        },
        {
          inlineData: {
            mimeType: imageBlob.type,
            data: base64Image
          }
        }
      ]);

      const response_text = await result.response;
      if (!response_text) {
        throw new Error('No response from Gemini API');
      }

      return response_text.text();
    };

    return await retryWithBackoff(generateContent);
  } catch (error) {
    console.error('Analysis error:', error);
    if (error instanceof Error) {
      if (error.message.includes('503') || error.message.includes('overloaded')) {
        throw new Error('The AI service is temporarily unavailable. We tried multiple times but the service is experiencing high load. Please try again in a few minutes.');
      }
      throw new Error(error.message);
    }

    throw new Error('An unexpected error occurred while analyzing the image');
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64WithoutPrefix = base64String.split(',')[1];
      if (!base64WithoutPrefix) {
        reject(new Error('Failed to convert image to base64'));
        return;
      }
      resolve(base64WithoutPrefix);
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(blob);
  });
}