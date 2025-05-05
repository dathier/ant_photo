import qiniu from "qiniu";

// Qiniu configuration
const accessKey = process.env.QINIU_ACCESS_KEY || "";
const secretKey = process.env.QINIU_SECRET_KEY || "";
const bucket = process.env.QINIU_BUCKET || "";
const domain = process.env.QINIU_DOMAIN || "";

// Create a singleton instance of the Qiniu uploader
let qiniuUploader: QiniuUploader | null = null;

class QiniuUploader {
  mac: qiniu.auth.digest.Mac;
  config: qiniu.conf.Config;
  bucketManager: qiniu.rs.BucketManager;
  bucket: string;
  domain: string;

  constructor() {
    this.mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
    this.config = new qiniu.conf.Config();

    // Set zone based on region (z0 is East China, default)
    const region = process.env.QINIU_REGION || "z0";
    switch (region) {
      case "z1":
        this.config.zone = qiniu.zone.Zone_z1; // North China
        break;
      case "z2":
        this.config.zone = qiniu.zone.Zone_z2; // South China
        break;
      case "na0":
        this.config.zone = qiniu.zone.Zone_na0; // North America
        break;
      case "as0":
        this.config.zone = qiniu.zone.Zone_as0; // Southeast Asia
        break;
      default:
        this.config.zone = qiniu.zone.Zone_z0; // East China (default)
    }

    this.bucketManager = new qiniu.rs.BucketManager(this.mac, this.config);
    this.bucket = bucket;
    this.domain = domain;
  }

  generateUploadToken(key?: string) {
    const options = {
      scope: key ? `${this.bucket}:${key}` : this.bucket,
      expires: 3600, // Token valid for 1 hour
      returnBody:
        '{"key":"$(key)","hash":"$(etag)","fsize":$(fsize),"bucket":"$(bucket)","name":"$(x:name)"}',
    };

    const putPolicy = new qiniu.rs.PutPolicy(options);
    return putPolicy.uploadToken(this.mac);
  }

  // Get public URL without authentication
  getPublicUrl(key: string) {
    // 获取原始URL
    const originalUrl = `${this.domain}/${encodeURIComponent(key)}`;

    // 返回代理URL
    return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
  }

  // For backward compatibility - now returns public URL
  getDownloadUrl(key: string) {
    return this.getPublicUrl(key);
  }

  async delete(key: string) {
    return new Promise((resolve, reject) => {
      this.bucketManager.delete(this.bucket, key, (err, respBody, respInfo) => {
        if (err) {
          console.error("Qiniu delete error:", err);
          return reject(err);
        }

        if (respInfo.statusCode === 200) {
          resolve({ success: true });
        } else {
          console.error("Qiniu delete failed:", respBody);
          reject(new Error(respBody.error || "Delete failed"));
        }
      });
    });
  }

  async upload(
    file: File,
    key: string
  ): Promise<{ success: boolean; url?: string; key?: string; error?: string }> {
    try {
      // For server-side uploads, we need to convert the File to a buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const token = this.generateUploadToken(key);
      const formUploader = new qiniu.form_up.FormUploader(this.config);
      const putExtra = new qiniu.form_up.PutExtra();

      return new Promise((resolve, reject) => {
        // Use put() instead of putFile() for buffer uploads
        formUploader.put(
          token,
          key,
          buffer,
          putExtra,
          (err, respBody, respInfo) => {
            if (err) {
              console.error("Qiniu upload error:", err);
              return resolve({ success: false, error: err.message });
            }

            if (respInfo.statusCode === 200) {
              const url = this.getPublicUrl(key);
              resolve({ success: true, url, key: respBody.key });
            } else {
              console.error("Qiniu upload failed:", respBody);
              resolve({
                success: false,
                error: respBody.error || "Upload failed",
              });
            }
          }
        );
      });
    } catch (error) {
      console.error("Error preparing file for upload:", error);
      return { success: false, error: "Failed to prepare file for upload" };
    }
  }
}

// Export utility functions that use the singleton instance
export function generateUploadToken(key?: string) {
  if (!qiniuUploader) {
    qiniuUploader = new QiniuUploader();
  }
  return qiniuUploader.generateUploadToken(key);
}

export function getPublicUrl(key: string) {
  if (!qiniuUploader) {
    qiniuUploader = new QiniuUploader();
  }
  return qiniuUploader.getPublicUrl(key);
}

// For backward compatibility
export function getPrivateDownloadUrl(key: string) {
  if (!qiniuUploader) {
    qiniuUploader = new QiniuUploader();
  }
  return qiniuUploader.getPublicUrl(key);
}

export function deleteFile(key: string) {
  if (!qiniuUploader) {
    qiniuUploader = new QiniuUploader();
  }
  return qiniuUploader.delete(key);
}

export function uploadFile(file: File, key: string) {
  if (!qiniuUploader) {
    qiniuUploader = new QiniuUploader();
  }
  return qiniuUploader.upload(file, key);
}

// For backward compatibility
export const createQiniuUploader = () => {
  if (!qiniuUploader) {
    qiniuUploader = new QiniuUploader();
  }
  return qiniuUploader;
};
