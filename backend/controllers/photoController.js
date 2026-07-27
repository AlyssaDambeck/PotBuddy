const path = require("path");

const {
  ObjectId,
  GridFSBucket,
} = require("mongodb");

const {
  client,
} = require("../config/db");

const MAX_PHOTO_SIZE =
  10 * 1024 * 1024;

/*
 * Multipart requests contain a little
 * extra data around the actual image,
 * so allow 1 MB for multipart headers.
 */
const MAX_MULTIPART_BODY_SIZE =
  MAX_PHOTO_SIZE +
  1024 * 1024;

class UploadError extends Error {
  constructor(status, message) {
    super(message);

    this.name = "UploadError";
    this.status = status;
  }
}

function getDatabase() {
  return client.db();
}

function getPlantsCollection() {
  return getDatabase().collection(
    "userPlants",
  );
}

function getPhotoBucket() {
  return new GridFSBucket(
    getDatabase(),
    {
      bucketName: "plantPhotos",
    },
  );
}

function sendError(
  res,
  status,
  message,
) {
  return res.status(status).json({
    success: false,
    message,
  });
}

function getOwnerId(req, res) {
  if (
    !ObjectId.isValid(req.userId)
  ) {
    sendError(
      res,
      401,
      "Invalid authentication token.",
    );

    return null;
  }

  return new ObjectId(
    req.userId,
  );
}

function getPlantId(req, res) {
  if (
    !ObjectId.isValid(
      req.params.id,
    )
  ) {
    sendError(
      res,
      400,
      "Invalid plant ID.",
    );

    return null;
  }

  return new ObjectId(
    req.params.id,
  );
}

/*
 * Supports both the correct ObjectId
 * ownerId and older string owner IDs.
 */
function ownerFilter(ownerId) {
  return {
    $in: [
      ownerId,
      ownerId.toString(),
    ],
  };
}

/*
 * Reads the incoming multipart request
 * without Multer or another package.
 */
function readRequestBody(
  req,
  maximumBytes,
) {
  return new Promise(
    (resolve, reject) => {
      const chunks = [];

      let totalBytes = 0;
      let settled = false;

      function cleanup() {
        req.off(
          "data",
          handleData,
        );

        req.off(
          "end",
          handleEnd,
        );

        req.off(
          "error",
          handleError,
        );

        req.off(
          "aborted",
          handleAborted,
        );
      }

      function fail(error) {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();

        /*
         * Continue draining the request
         * without saving more data.
         */
        req.resume();

        reject(error);
      }

      function handleData(chunk) {
        totalBytes += chunk.length;

        if (
          totalBytes >
          maximumBytes
        ) {
          fail(
            new UploadError(
              413,
              "Please choose an image smaller than 10 MB.",
            ),
          );

          return;
        }

        chunks.push(chunk);
      }

      function handleEnd() {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();

        resolve(
          Buffer.concat(
            chunks,
            totalBytes,
          ),
        );
      }

      function handleError(error) {
        fail(error);
      }

      function handleAborted() {
        fail(
          new UploadError(
            400,
            "The upload was interrupted.",
          ),
        );
      }

      req.on(
        "data",
        handleData,
      );

      req.on(
        "end",
        handleEnd,
      );

      req.on(
        "error",
        handleError,
      );

      req.on(
        "aborted",
        handleAborted,
      );
    },
  );
}

function getMultipartBoundary(
  contentType,
) {
  if (
    typeof contentType !==
      "string" ||
    !contentType
      .toLowerCase()
      .startsWith(
        "multipart/form-data",
      )
  ) {
    throw new UploadError(
      415,
      "The photo must be sent as multipart/form-data.",
    );
  }

  const match =
    /boundary=(?:"([^"]+)"|([^;]+))/i.exec(
      contentType,
    );

  const boundary = (
    match?.[1] ||
    match?.[2] ||
    ""
  ).trim();

  if (!boundary) {
    throw new UploadError(
      400,
      "The upload boundary is missing.",
    );
  }

  return boundary;
}

function parsePartHeaders(
  headerText,
) {
  const headers = new Map();

  for (
    const line of
    headerText.split("\r\n")
  ) {
    const separatorIndex =
      line.indexOf(":");

    if (separatorIndex < 1) {
      continue;
    }

    const name = line
      .slice(
        0,
        separatorIndex,
      )
      .trim()
      .toLowerCase();

    const value = line
      .slice(
        separatorIndex + 1,
      )
      .trim();

    headers.set(
      name,
      value,
    );
  }

  return headers;
}

function safeFilename(filename) {
  const normalized = filename
    .replace(/\\/g, "/")
    .replace(/\0/g, "");

  return (
    path.basename(normalized) ||
    "plant-photo"
  );
}

/*
 * Extracts the field named "photo"
 * from a multipart/form-data body.
 */
function parseMultipartPhoto(
  body,
  boundary,
) {
  const delimiter =
    Buffer.from(
      `--${boundary}`,
    );

  const nextDelimiter =
    Buffer.from(
      `\r\n--${boundary}`,
    );

  const headerSeparator =
    Buffer.from(
      "\r\n\r\n",
    );

  let searchFrom = 0;

  while (
    searchFrom < body.length
  ) {
    const boundaryIndex =
      body.indexOf(
        delimiter,
        searchFrom,
      );

    if (
      boundaryIndex === -1
    ) {
      break;
    }

    let partStart =
      boundaryIndex +
      delimiter.length;

    /*
     * Two hyphens after the boundary
     * indicate the end of the body.
     */
    if (
      body[partStart] === 45 &&
      body[partStart + 1] ===
        45
    ) {
      break;
    }

    /*
     * Skip the CRLF immediately after
     * the boundary.
     */
    if (
      body[partStart] === 13 &&
      body[partStart + 1] ===
        10
    ) {
      partStart += 2;
    }

    const headerEnd =
      body.indexOf(
        headerSeparator,
        partStart,
      );

    if (headerEnd === -1) {
      break;
    }

    const contentStart =
      headerEnd +
      headerSeparator.length;

    const contentEnd =
      body.indexOf(
        nextDelimiter,
        contentStart,
      );

    if (contentEnd === -1) {
      break;
    }

    const headerText = body
      .subarray(
        partStart,
        headerEnd,
      )
      .toString("utf8");

    const headers =
      parsePartHeaders(
        headerText,
      );

    const disposition =
      headers.get(
        "content-disposition",
      ) || "";

    const fieldName =
      /\bname="([^"]*)"/i.exec(
        disposition,
      )?.[1];

    const rawFilename =
      /\bfilename="([^"]*)"/i.exec(
        disposition,
      )?.[1];

    if (
      fieldName === "photo" &&
      rawFilename !== undefined
    ) {
      const fileBuffer =
        Buffer.from(
          body.subarray(
            contentStart,
            contentEnd,
          ),
        );

      const mimetype =
        headers.get(
          "content-type",
        ) ||
        "application/octet-stream";

      if (
        fileBuffer.length === 0
      ) {
        throw new UploadError(
          400,
          "The selected image is empty.",
        );
      }

      if (
        fileBuffer.length >
        MAX_PHOTO_SIZE
      ) {
        throw new UploadError(
          413,
          "Please choose an image smaller than 10 MB.",
        );
      }

      if (
        !mimetype
          .toLowerCase()
          .startsWith("image/")
      ) {
        throw new UploadError(
          415,
          "Only image files may be uploaded.",
        );
      }

      return {
        buffer: fileBuffer,

        originalname:
          safeFilename(
            rawFilename,
          ),

        mimetype,

        size:
          fileBuffer.length,
      };
    }

    searchFrom =
      contentEnd + 2;
  }

  throw new UploadError(
    400,
    'No file was found in the multipart field named "photo".',
  );
}

/*
 * Replacement for Multer's
 * upload.single("photo").
 */
async function uploadPhotoMiddleware(
  req,
  res,
  next,
) {
  try {
    const boundary =
      getMultipartBoundary(
        req.get(
          "Content-Type",
        ),
      );

    const body =
      await readRequestBody(
        req,
        MAX_MULTIPART_BODY_SIZE,
      );

    req.file =
      parseMultipartPhoto(
        body,
        boundary,
      );

    next();
  } catch (error) {
    const status =
      error instanceof
      UploadError
        ? error.status
        : 400;

    const message =
      error instanceof Error
        ? error.message
        : "The photo could not be read.";

    return sendError(
      res,
      status,
      message,
    );
  }
}

function savePhotoToGridFs(
  file,
  metadata,
) {
  const bucket =
    getPhotoBucket();

  return new Promise(
    (resolve, reject) => {
      const uploadStream =
        bucket.openUploadStream(
          file.originalname,
          {
            contentType:
              file.mimetype,

            metadata,
          },
        );

      uploadStream.once(
        "error",
        reject,
      );

      uploadStream.once(
        "finish",
        () => {
          resolve(
            uploadStream.id,
          );
        },
      );

      uploadStream.end(
        file.buffer,
      );
    },
  );
}

async function removeGridFsFile(
  fileId,
) {
  if (
    !fileId ||
    !ObjectId.isValid(fileId)
  ) {
    return;
  }

  await getPhotoBucket().delete(
    new ObjectId(fileId),
  );
}

/*
 * POST /api/plants/:id/photos
 * POST /api/plants/:id/picture
 */
async function uploadPlantPhoto(
  req,
  res,
) {
  let newFileId = null;

  try {
    const ownerId =
      getOwnerId(req, res);

    const plantId =
      getPlantId(req, res);

    if (
      !ownerId ||
      !plantId
    ) {
      return;
    }

    if (!req.file) {
      return sendError(
        res,
        400,
        "Choose a photo to upload.",
      );
    }

    const plants =
      getPlantsCollection();

    const plant =
      await plants.findOne({
        _id: plantId,

        ownerId:
          ownerFilter(
            ownerId,
          ),
      });

    if (!plant) {
      return sendError(
        res,
        404,
        "Plant not found.",
      );
    }

    newFileId =
      await savePhotoToGridFs(
        req.file,
        {
          ownerId,
          plantId,

          uploadedAt:
            new Date(),
        },
      );

    const picture = {
      fileId: newFileId,

      filename:
        req.file.originalname,

      contentType:
        req.file.mimetype,

      altText:
        `${plant.nickname} plant`,
    };

    const updateResult =
      await plants.updateOne(
        {
          _id: plantId,

          ownerId:
            ownerFilter(
              ownerId,
            ),
        },
        {
          $set: {
            picture,

            updatedAt:
              new Date(),
          },
        },
      );

    if (
      updateResult.matchedCount ===
      0
    ) {
      await removeGridFsFile(
        newFileId,
      );

      newFileId = null;

      return sendError(
        res,
        404,
        "Plant not found.",
      );
    }

    /*
     * Remove the old photo only after
     * the new image has been saved.
     */
    const previousFileId =
      plant.picture?.fileId;

    if (
      previousFileId &&
      String(previousFileId) !==
        String(newFileId)
    ) {
      try {
        await removeGridFsFile(
          previousFileId,
        );
      } catch (error) {
        console.warn(
          "Previous plant photo could not be deleted:",
          error,
        );
      }
    }

    const updatedPlant =
      await plants.findOne({
        _id: plantId,

        ownerId:
          ownerFilter(
            ownerId,
          ),
      });

    return res
      .status(201)
      .json({
        success: true,

        message:
          "Plant photo saved.",

        picture,

        plant:
          updatedPlant,
      });
  } catch (error) {
    console.error(
      "Error uploading plant photo:",
      error,
    );

    /*
     * Remove an unfinished GridFS file
     * when the plant update fails.
     */
    if (newFileId) {
      try {
        await removeGridFsFile(
          newFileId,
        );
      } catch {
        /*
         * Preserve the original upload
         * error.
         */
      }
    }

    return sendError(
      res,
      500,
      "The photo could not be uploaded.",
    );
  }
}

/*
 * GET /api/photos/:fileId
 *
 * This endpoint remains public because
 * a normal <img> element cannot attach
 * the Bearer token from localStorage.
 */
async function getPhoto(
  req,
  res,
) {
  try {
    if (
      !ObjectId.isValid(
        req.params.fileId,
      )
    ) {
      return sendError(
        res,
        400,
        "Invalid photo ID.",
      );
    }

    const fileId =
      new ObjectId(
        req.params.fileId,
      );

    const bucket =
      getPhotoBucket();

    const file =
      await bucket
        .find({
          _id: fileId,
        })
        .next();

    if (!file) {
      return sendError(
        res,
        404,
        "Photo not found.",
      );
    }

    res.setHeader(
      "Content-Type",

      file.contentType ||
        "application/octet-stream",
    );

    if (
      typeof file.length ===
      "number"
    ) {
      res.setHeader(
        "Content-Length",
        String(file.length),
      );
    }

    const responseFilename =
      String(
        file.filename ||
          "plant-photo",
      ).replace(
        /["\r\n]/g,
        "",
      );

    res.setHeader(
      "Content-Disposition",
      `inline; filename="${responseFilename}"`,
    );

   res.setHeader(
  "Cache-Control",
  "public, max-age=31536000, immutable",
);

    const downloadStream =
      bucket.openDownloadStream(
        fileId,
      );

    downloadStream.once(
      "error",
      (error) => {
        console.error(
          "Error streaming plant photo:",
          error,
        );

        if (!res.headersSent) {
          sendError(
            res,
            404,
            "Photo not found.",
          );
        } else {
          res.destroy(error);
        }
      },
    );

    downloadStream.pipe(res);
  } catch (error) {
    console.error(
      "Error retrieving plant photo:",
      error,
    );

    if (!res.headersSent) {
      return sendError(
        res,
        500,
        "The photo could not be loaded.",
      );
    }

    res.end();
  }
}

module.exports = {
  uploadPhotoMiddleware,
  uploadPlantPhoto,
  getPhoto,
};
