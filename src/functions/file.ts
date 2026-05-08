import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import { Readable } from "stream";
import { Buffer } from "buffer";
import { getUserFromToken } from "../auth";

export async function getFile(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  const path: string = request.params.path;
  
  try {
    // TODO replace connection string with DefaultAzureCredential in production
    const connectionString =
      process.env.AzureWebJobsStorage || "connectionstringhere";

    const accountName = "docversionstore";
    // const blobServiceClient = new BlobServiceClient(
    //     `https://${accountName}.blob.core.windows.net`,
    //     new DefaultAzureCredential()
    // );
    const blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);

    const blobClient = blobServiceClient
      .getContainerClient("documents")
      .getBlobClient(path);
    const downloadResponse = await blobClient.download();
    const nodeStream = downloadResponse.readableStreamBody as Readable;
    const buffer = await streamToBuffer(nodeStream);

    return {
      body: new Uint8Array(buffer),
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        // remove the following comment to make the browser download this as a file
        //"Content-Disposition": `attachment; filename="${blobClient.name}"`,
        "Content-Length": downloadResponse.contentLength?.toString() ?? "0",
      },
      status: 200,
    } satisfies HttpResponseInit;
  } catch (err) {
    context.error(`Error occurred while downloading file: ${err}`);
    return {
      status: 500,
    };
  }
}

export async function uploadFile(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  context.log(`Uploading file for url "${request.url}"`);
  const user = getUserFromToken(request);

  context.log(`Authenticated upload by user ${user.user_id}`);

  try {
    const connectionString =
      process.env.AzureWebJobsStorage || "connectionstringhere";
    const blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);

    const containerClient = blobServiceClient.getContainerClient("documents");
    context.log("container client created");
    await containerClient.createIfNotExists();

    

    const contentType = request.headers.get("content-type") || "";
    const buffer = Buffer.from(await request.arrayBuffer());
    context.log("2 body read");

    const fileNameFromBody = getFileNameFromMultipart(buffer, contentType);
    const baseName = fileNameFromBody ? fileNameFromBody.replace(/\.[^/.]+$/, "") : "unknown";
    const extension = fileNameFromBody && fileNameFromBody.endsWith('.txt') ? '.txt' : '.docx';
    const fileName =
      request.headers.get("x-file-name") ? `${request.headers.get("x-file-name")}-${Date.now()}${extension}` :
      `${baseName}-${Date.now()}${extension}`;

    context.log(`3 buffer made: ${buffer.length} bytes`);

    context.log(`4 blob name: ${fileName}`);
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    context.log("5 blob client made");

    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: {
        blobContentType:
          request.headers.get("content-type") || "application/octet-stream",
      },
    });

    context.log("6 upload finished");

    return {
      status: 201,
      body: JSON.stringify({
        message: "File uploaded successfully",
        file_path: fileName,
        url: blockBlobClient.url,
      }),
      headers: { "Content-Type": "application/json" },
    };
  } catch (err) {
    context.error(`Upload failed: ${(err as Error).message}`);
    return {
      status: 500,
      body: JSON.stringify({ error: (err as Error).message }),
      headers: { "Content-Type": "application/json" },
    };
  }
}

app.http("getFile", {
  route: "file/doc/{*path}",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: getFile,
});

app.http("uploadFile", {
  route: "file/doc",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: uploadFile,
});

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function getFileNameFromMultipart(body: Buffer, contentType: string): string | undefined {
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType);
  if (!boundaryMatch) {
    return undefined;
  }

  const boundary = boundaryMatch[1] || boundaryMatch[2];
  const bodyText = body.toString("latin1");
  const parts = bodyText.split(`--${boundary}`);

  for (const part of parts) {
    const headerEndIndex = part.indexOf("\r\n\r\n");
    if (headerEndIndex === -1) {
      continue;
    }

    const headersText = part.slice(0, headerEndIndex);
    const dispositionMatch = /Content-Disposition: form-data;[^\r\n]*filename="([^"]+)"/i.exec(headersText);
    if (dispositionMatch) {
      return dispositionMatch[1];
    }
  }

  return undefined;
}
