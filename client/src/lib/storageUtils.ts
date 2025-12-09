import { ref, uploadBytesResumable, getDownloadURL, listAll, getMetadata } from 'firebase/storage';
import { storage } from './firebase';
import { useState } from 'react';

/**
 * Uploads a file to Firebase Storage and returns the download URL
 * @param file - The file to upload
 * @param path - The storage path where the file should be stored
 * @returns A promise that resolves to the download URL
 */
export const uploadFile = async (file: File, path: string): Promise<string> => {
  if (!file) {
    throw new Error('No file provided for upload');
  }

  // Create a unique filename to avoid collisions
  const timestamp = new Date().getTime();
  const fileExtension = file.name.split('.').pop();
  const fileName = `${timestamp}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;
  const fullPath = `${path}/${fileName}`;

  // Create storage reference
  const storageRef = ref(storage, fullPath);

  try {
    console.log(`Uploading file to ${fullPath}...`);
    
    // Upload the file
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    // Return a promise that resolves with the download URL
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Calculate and log upload progress if needed
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload progress: ${progress.toFixed(2)}%`);
        },
        (error) => {
          // Handle unsuccessful uploads
          console.error('Error uploading file:', error);
          reject(error);
        },
        async () => {
          // Handle successful uploads
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('File uploaded successfully, download URL:', downloadURL);
            resolve(downloadURL);
          } catch (error) {
            console.error('Error getting download URL:', error);
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    console.error('Error initiating upload:', error);
    throw error;
  }
};

/**
 * Uploads an image file to Firebase Storage and returns the download URL
 * Alias for uploadFile for backward compatibility
 */
export const uploadImage = uploadFile;

/**
 * Lists all files in a specific path in Firebase Storage
 * @param path - The storage path to list files from
 * @returns A promise that resolves to an array of file metadata
 */
export const listFiles = async (path: string) => {
  const storageRef = ref(storage, path);
  
  try {
    const result = await listAll(storageRef);
    const files = await Promise.all(
      result.items.map(async (itemRef) => {
        const metadata = await getMetadata(itemRef);
        const url = await getDownloadURL(itemRef);
        return {
          name: itemRef.name,
          fullPath: itemRef.fullPath,
          url,
          contentType: metadata.contentType,
          size: metadata.size,
          createdAt: metadata.timeCreated
        };
      })
    );
    
    return files;
  } catch (error) {
    console.error(`Error listing files in ${path}:`, error);
    throw error;
  }
};

/**
 * Custom hook for handling file uploads
 * @returns Upload-related functions and state
 */
export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const uploadTeamLogo = async (file: File): Promise<string> => {
    return uploadFile(file, 'team-logos');
  };

  // const uploadVerificationDocument = async (file: File): Promise<string> => {
  //   setIsUploading(true);
  //   setUploadProgress(0);
  //   setError(null);
    
  //   try {
  //     // Use the 'documents' folder for verification documents
  //     const url = await uploadFile(file, 'documents');
  //     setIsUploading(false);
  //     return url;
  //   } catch (err) {
  //     setError(err instanceof Error ? err : new Error('Unknown error during upload'));
  //     setIsUploading(false);
  //     throw err;
  //   }
  // };

  return {
    uploadTeamLogo,
    //uploadVerificationDocument,
    isUploading,
    uploadProgress,
    error
  };
};


// import { ref, uploadBytesResumable, getDownloadURL, listAll, getMetadata } from 'firebase/storage';
// import { storage } from './firebase';
// //import { useState } from 'react';


// /**
//  * Uploads an image file to Firebase Storage and returns the download URL
//  * @param file - The file to upload
//  * @param path - The storage path where the file should be stored
//  * @returns A promise that resolves to the download URL
//  */
// export const uploadImage = async (file: File, path: string): Promise<string> => {
// //export const uploadFile = async (file: File, path: string): Promise<string> => {
//   if (!file) {
//     throw new Error('No file provided for upload');
//   }

//   // Create a unique filename to avoid collisions
//   const timestamp = new Date().getTime();
//   const fileExtension = file.name.split('.').pop();
//   const fileName = `${timestamp}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;
//   const fullPath = `${path}/${fileName}`;

//   // Create storage reference
//   const storageRef = ref(storage, fullPath);

//   try {
//     console.log(`Uploading file to ${fullPath}...`);
    
//     // Upload the file
//     const uploadTask = uploadBytesResumable(storageRef, file);
    
//     // Return a promise that resolves with the download URL
//     return new Promise((resolve, reject) => {
//       uploadTask.on(
//         'state_changed',
//         (snapshot) => {
//           // Calculate and log upload progress if needed
//           const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
//           console.log(`Upload progress: ${progress.toFixed(2)}%`);
//         },
//         (error) => {
//           // Handle unsuccessful uploads
//           console.error('Error uploading file:', error);
//           reject(error);
//         },
//         async () => {
//           // Handle successful uploads
//           try {
//             const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
//             console.log('File uploaded successfully, download URL:', downloadURL);
//             resolve(downloadURL);
//           } catch (error) {
//             console.error('Error getting download URL:', error);
//             reject(error);
//           }
//         }
//       );
//     });
//   } catch (error) {
//     console.error('Error initiating upload:', error);
//     throw error;
//   }
// };

// /**
//  * Custom hook for handling file uploads
//  * @returns Upload-related functions and state
//  */
// export const useFileUpload = () => {
//   const uploadTeamLogo = async (file: File): Promise<string> => {
//     return uploadImage(file, 'team-logos');
//   };

//   return {
//     uploadTeamLogo
//   };
// };