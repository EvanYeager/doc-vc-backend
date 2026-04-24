import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import { Readable } from "stream";

export async function getFile(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    try {
        // TODO replace connection string with DefaultAzureCredential in production
        const connectionString = 'connectionstringhere';

        const accountName = "docversionstore";
        // const blobServiceClient = new BlobServiceClient(
        //     `https://${accountName}.blob.core.windows.net`,
        //     new DefaultAzureCredential()
        // );
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

        const blobClient = blobServiceClient.getContainerClient("documents").getBlobClient("document1.docx");
        const downloadResponse = await blobClient.download();
        const nodeStream = downloadResponse.readableStreamBody as Readable;
        const buffer = await streamToBuffer(nodeStream);

        return new Response(new Uint8Array(buffer), {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                // remove the following comment to make the browser download this as a file
                //"Content-Disposition": 'attachment; filename=blobClient.name',
                "Content-Length": downloadResponse.contentLength.toString()
            },
        });
    } catch (err) {
        context.error(`Error occurred while downloading file: ${err}`);
        return {
            status: 500
        };
    }

};

export async function uploadFile(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    return { body: `File uploaded successfully!` };
};

app.http('getFile', {
    route: 'file/doc/{id}/{version}',
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: getFile
});

app.http('uploadFile', {
    route: 'file/doc/{id}',
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: uploadFile
});


async function streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
}