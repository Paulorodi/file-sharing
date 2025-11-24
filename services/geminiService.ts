import { AIAnalysisData } from "../types";

// Replaced external API call with local metadata generation
// This ensures the app runs 100% offline.

export const analyzeImageContent = async (fileUrl: string, mimeType: string): Promise<AIAnalysisData> => {
  // Simulate a short processing delay for UX
  await new Promise(resolve => setTimeout(resolve, 300));

  const typeLabel = mimeType.split('/')[1]?.toUpperCase() || 'FILE';
  const category = mimeType.startsWith('image') ? 'Images' : 
                   mimeType.startsWith('video') ? 'Videos' : 
                   mimeType.startsWith('audio') ? 'Audio' : 'Documents';

  return {
    tags: ["Local", "Offline", typeLabel, category],
    description: `Local ${typeLabel} file stored on device.`,
    peopleCount: 0,
    categorySuggestion: category,
    isProcessed: true
  };
};

export const suggestOrganization = async (fileNames: string[]): Promise<any> => {
     return null;
}