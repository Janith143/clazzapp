const { onDocumentDeleted, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const bucket = admin.storage().bucket();

const getPathFromUrl = (url) => {
  if (!url || !url.startsWith("https://firebasestorage.googleapis.com")) {
    return null;
  }
  try {
    const urlObject = new URL(url);
    const decodedPath = decodeURIComponent(urlObject.pathname);
    const prefix = `/v0/b/${bucket.name}/o/`;
    if (decodedPath.startsWith(prefix)) {
      return decodedPath.substring(prefix.length);
    }
  } catch (e) {
    logger.error("Invalid URL provided to getPathFromUrl:", url, e);
  }
  return null;
};

const deleteFileFromUrl = async (url) => {
  const filePath = getPathFromUrl(url);
  if (filePath) {
    if (filePath.startsWith("default-cover-images/")) {
      logger.log(`Skipping deletion of shared default image: ${filePath}`);
      return;
    }
    try {
      await bucket.file(filePath).delete();
      logger.log(`Successfully deleted: ${filePath}`);
    } catch (error) {
      if (error.code === 404) {
        logger.warn(`File not found, skipping deletion: ${filePath}`);
      } else {
        logger.error(`Failed to delete file: ${filePath}`, error);
      }
    }
  }
};

const getTeacherImageUrls = (teacherData) => {
  if (!teacherData) return [];
  const urls = new Set();
  if (teacherData.avatar) urls.add(teacherData.avatar);
  if (teacherData.profileImage) urls.add(teacherData.profileImage);
  if (Array.isArray(teacherData.coverImages)) {
    teacherData.coverImages.forEach((url) => { if (url) urls.add(url); });
  }
  if (teacherData.verification?.id?.imageUrl) urls.add(teacherData.verification.id.imageUrl);
  if (teacherData.verification?.bank?.imageUrl) urls.add(teacherData.verification.bank.imageUrl);
  return Array.from(urls);
};

// --- Deletion Triggers ---

exports.onTeacherDelete = onDocumentDeleted("teachers/{teacherId}", async (event) => {
  const deletedData = event.data.data();
  const urlsToDelete = getTeacherImageUrls(deletedData);
  await Promise.all(urlsToDelete.map(deleteFileFromUrl));
});

exports.onUserDelete = onDocumentDeleted("users/{userId}", async (event) => {
  const deletedData = event.data.data();
  if (deletedData?.avatar) {
    await deleteFileFromUrl(deletedData.avatar);
  }
});

exports.onTopUpRequestDelete = onDocumentDeleted("topUpRequests/{requestId}", async (event) => {
  const deletedData = event.data.data();
  if (deletedData?.imageUrl) {
    await deleteFileFromUrl(deletedData.imageUrl);
  }
});

// --- Update Triggers ---

exports.onTeacherUpdate = onDocumentUpdated("teachers/{teacherId}", async (event) => {
  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();

  const beforeUrls = new Set(getTeacherImageUrls(beforeData));
  const afterUrls = new Set(getTeacherImageUrls(afterData));

  const urlsToDelete = [];
  for (const url of beforeUrls) {
    if (!afterUrls.has(url)) {
      urlsToDelete.push(url);
    }
  }

  await Promise.all(urlsToDelete.map(deleteFileFromUrl));
});

exports.onUserUpdate = onDocumentUpdated("users/{userId}", async (event) => {
  const beforeAvatar = event.data.before.data()?.avatar;
  const afterAvatar = event.data.after.data()?.avatar;
  if (beforeAvatar && beforeAvatar !== afterAvatar) {
    await deleteFileFromUrl(beforeAvatar);
  }
});

exports.onTopUpRequestUpdate = onDocumentUpdated("topUpRequests/{requestId}", async (event) => {
  const beforeUrl = event.data.before.data()?.imageUrl;
  const afterUrl = event.data.after.data()?.imageUrl;
  if (beforeUrl && beforeUrl !== afterUrl) {
    await deleteFileFromUrl(beforeUrl);
  }
});

exports.onSettingsUpdate = onDocumentUpdated("settings/clientAppConfig", async (event) => {
  const beforeImages = new Set(event.data.before.data()?.defaultCoverImages || []);
  const afterImages = new Set(event.data.after.data()?.defaultCoverImages || []);

  const urlsToDelete = [];
  for (const url of beforeImages) {
    if (!afterImages.has(url)) {
      urlsToDelete.push(url);
    }
  }

  await Promise.all(urlsToDelete.map(async (url) => {
    const filePath = getPathFromUrl(url);
    if (filePath && filePath.startsWith("default-cover-images/")) {
      try {
        await bucket.file(filePath).delete();
        logger.log(`Admin action: Successfully deleted default image: ${filePath}`);
      } catch (error) {
        logger.error(`Failed to delete default image during settings update: ${filePath}`, error);
      }
    }
  }));
});
