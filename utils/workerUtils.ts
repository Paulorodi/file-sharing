// Worker code as a string to avoid bundler configuration issues
const workerScript = `
  self.onmessage = async (e) => {
    const { id, file, task } = e.data;

    try {
      if (task === 'readAsBase64') {
        const reader = new FileReader();
        reader.onload = () => {
          // Remove 'data:*/*;base64,' prefix
          const result = reader.result;
          const base64 = typeof result === 'string' ? result.split(',')[1] : '';
          self.postMessage({ id, status: 'success', data: base64 });
        };
        reader.onerror = (err) => {
          self.postMessage({ id, status: 'error', error: 'Failed to read file' });
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      self.postMessage({ id, status: 'error', error: err.message });
    }
  };
`;

let workerInstance: Worker | null = null;
const pendingPromises = new Map<string, { resolve: (data: any) => void; reject: (err: any) => void }>();

export const getWorker = (): Worker => {
  if (!workerInstance) {
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    workerInstance = new Worker(URL.createObjectURL(blob));
    
    workerInstance.onmessage = (e) => {
      const { id, status, data, error } = e.data;
      const promise = pendingPromises.get(id);
      
      if (promise) {
        if (status === 'success') {
          promise.resolve(data);
        } else {
          promise.reject(new Error(error));
        }
        pendingPromises.delete(id);
      }
    };
  }
  return workerInstance;
};

export const readFileAsBase64InWorker = (fileUrl: string): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    try {
      // We need to fetch the blob from the object URL first because Workers can't access blob: URLs created on main thread directly in all browsers context
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      
      const id = Math.random().toString(36).substring(7);
      pendingPromises.set(id, { resolve, reject });
      
      getWorker().postMessage({ id, file: blob, task: 'readAsBase64' });
    } catch (e) {
      reject(e);
    }
  });
};