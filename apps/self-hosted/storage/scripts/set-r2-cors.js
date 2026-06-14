// One-off infra script: apply a permissive CORS policy to the R2 bucket so the
// browser can PUT directly to presigned upload URLs from any origin. The app may
// be served from localhost, a LAN IP, or a custom domain (e.g. locket.mdev), and
// the upload step is a direct browser → Cloudflare R2 PUT — which the bucket must
// allow via its own CORS policy (the storage/api service CORS does not cover it).
//
// Run inside the storage container, where the R2_* env vars are loaded:
//   docker compose exec storage node scripts/set-r2-cors.js
//
// Idempotent — overwrites the bucket CORS each run. AllowedOrigins is "*" because
// this is a self-hosted, public-read media bucket; the PUT is presigned (no
// cookies/credentials), so a wildcard origin is safe here.

const {
  PutBucketCorsCommand,
  GetBucketCorsCommand,
} = require("@aws-sdk/client-s3");
const { s3 } = require("../config/r2-storage");
const { BUCKET_NAME } = require("../src/constants/storageConfig");

async function main() {
  if (!BUCKET_NAME) throw new Error("R2_BUCKET env is not set");

  const CORSConfiguration = {
    CORSRules: [
      {
        AllowedOrigins: ["*"],
        AllowedMethods: ["GET", "PUT", "HEAD"],
        AllowedHeaders: ["*"],
        ExposeHeaders: ["ETag"],
        MaxAgeSeconds: 3600,
      },
    ],
  };

  await s3.send(
    new PutBucketCorsCommand({ Bucket: BUCKET_NAME, CORSConfiguration }),
  );
  console.log(`Applied CORS to R2 bucket "${BUCKET_NAME}"`);

  const got = await s3.send(new GetBucketCorsCommand({ Bucket: BUCKET_NAME }));
  console.log("Current CORS rules:", JSON.stringify(got.CORSRules, null, 2));
}

main().catch((err) => {
  console.error("Failed to set R2 CORS:", err?.message || err);
  process.exit(1);
});
